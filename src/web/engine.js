const key = new URL(location.href).searchParams.get('token');
const $ = (id) => document.getElementById(id);
let ws, armed = null, started = false, startedAt = 0, bpm = 124, code = '';
let recorder = null, audioCtx = null, tap = null, analyser = null, queue = Promise.resolve(), previousTimer = 0;
const initialConnect = AudioNode.prototype.connect;

const clock = () => started ? (performance.now() - startedAt) / 1000 : 0;
const formatTime = (n) => { n = Math.max(0, n); return String(Math.floor(n / 60)).padStart(2,'0') + ':' + String(Math.floor(n % 60)).padStart(2,'0'); };
function log(message, kind = '') {
  const e = document.createElement('div');
  e.className = 'event ' + kind;
  const t = document.createElement('time');
  t.textContent = formatTime(clock());
  e.append(t, document.createTextNode(message));
  $('events').prepend(e);
  while ($('events').children.length > 70) $('events').lastChild.remove();
}
function state(text, mode = '') {
  $('state').textContent = text;
  $('state').parentNode.className = 'state ' + mode;
}
function send(data) { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function ack(message, success = true, extra = {}) {
  send({ type:'operation_ack', request_id: message.request_id, success, ...extra });
}

// One capture bus for both Strudel and imported voices.
// Hook destination wiring BEFORE initStrudel. No duplicate direct-to-speakers connection.
function captureBus(context) {
  if (tap && tap.context === context) return tap;
  const input = context.createGain();
  const visual = context.createAnalyser();
  visual.fftSize = 2048;
  const output = context.createMediaStreamDestination();
  initialConnect.call(input, visual);
  initialConnect.call(input, output);
  initialConnect.call(input, context.destination);
  tap = input;
  analyser = visual;
  audioCtx = context;
  captureBus.stream = output.stream;
  return input;
}
AudioNode.prototype.connect = function(destination, ...args) {
  if (destination instanceof AudioDestinationNode) {
    const input = captureBus(this.context);
    if (this === input) return initialConnect.call(this, destination, ...args);
    return initialConnect.call(this, input, ...args.slice(0,1));
  }
  return initialConnect.call(this, destination, ...args);
};

function initRecorder() {
  if (recorder) return;
  if (!captureBus.stream) throw new Error('Missing WebAudio capture stream');
  const wanted = ['audio/webm;codecs=opus','audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
  if (!wanted) throw new Error('Browser cannot record WebM Opus. Use Chrome/Edge.');
  recorder = new MediaRecorder(captureBus.stream, { mimeType: wanted, audioBitsPerSecond: 192000 });
  recorder.ondataavailable = (event) => {
    if (!event.data?.size) return;
    queue = queue.then(async () => {
      const data = await event.data.arrayBuffer();
      if (ws?.readyState === WebSocket.OPEN) ws.send(data);
      else throw new Error('Recording connection interrupted');
    }).catch((error) => log('Recording chunk lost: ' + error.message, 'warn'));
  };
  recorder.onstop = async () => {
    await queue; // All final chunks must be sent BEFORE recording_done.
    send({ type:'recording_done', session_id: armed?.session_id });
    $('capture-status').textContent = 'FINALIZED';
    $('recording').textContent = 'REC ENDED';
  };
}

async function enableAudio() {
  if (!armed) return;
  try {
    if (typeof window.initAudio === 'function') await window.initAudio();
    const ctx = typeof window.getAudioContext === 'function' ? window.getAudioContext() : audioCtx;
    if (!ctx) throw new Error('Strudel AudioContext unavailable');
    captureBus(ctx);
    await ctx.resume();
    if (ctx.state !== 'running') throw new Error('AudioContext still suspended; click again');
    initRecorder();
    if (recorder.state !== 'inactive') throw new Error('Recorder is already active');
    recorder.start(500);
    startedAt = performance.now();
    started = true;
    bpm = armed.bpm;
    $('unlock').disabled = true;
    $('unlock').hidden = true;
    $('capture-status').textContent = 'RECORDING';
    $('recording').textContent = 'REC • LIVE';
    state('LIVE / RECORDING', 'recording');
    log('Audio unlocked; started real capture.');
    send({ type:'recording_started', session_id: armed.session_id });
  } catch (error) {
    state('AUDIO ERROR');
    $('hint').textContent = error.message;
    log('Audio start failed: ' + error.message, 'warn');
    send({ type:'engine_error', error: error.message });
  }
}

function alignedTime(sync) {
  const now = audioCtx.currentTime + 0.07;
  if (sync === 'now') return now;
  const secondsPerBeat = 60 / bpm;
  const elapsed = clock();
  const units = Math.ceil((elapsed + .07) / secondsPerBeat / (sync === 'bar' ? 4 : 1));
  return now + Math.max(0, units * secondsPerBeat * (sync === 'bar' ? 4 : 1) - elapsed);
}
async function playSample(msg) {
  if (!started || !tap) throw new Error('No active recording bus');
  const url = '/samples/' + encodeURIComponent(msg.sample) + '?token=' + encodeURIComponent(key);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Sample HTTP ' + res.status);
  const buffer = await audioCtx.decodeAudioData(await res.arrayBuffer());
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = msg.speed ?? 1;
  const gain = audioCtx.createGain();
  gain.gain.value = msg.gain ?? .7;
  source.connect(gain);
  gain.connect(tap); // Same bus -> audible, visualized AND recorded.
  const at = alignedTime(msg.sync);
  source.start(at);
  log('VOCAL / ' + msg.sample + ' / ' + (msg.sync || 'beat'));
  return at;
}

async function handle(msg) {
  if (msg.type === 'arm') {
    armed = msg; bpm = msg.bpm || bpm;
    $('title').textContent = msg.title || 'Live set';
    $('duration').textContent = formatTime(msg.target_seconds || 600);
    $('bpm').textContent = bpm + ' BPM';
    $('unlock').hidden = false;
    $('unlock').disabled = false;
    $('hint').textContent = 'Click once to start browser audio and real recording. No silent autoplay claims.';
    state('AUDIO ARMED', 'connected');
    log('Session armed. Ready for performer.');
  }
  if (msg.type === 'evaluate') {
    try {
      if (!started) throw new Error('Enable audio and recording first');
      await window.evaluate(msg.code);
      code = msg.code;
      $('code').textContent = code;
      $('revisions').textContent = String(Number($('revisions').textContent) + 1).padStart(2,'0');
      $('code-tag').textContent = 'APPLIED / ' + formatTime(clock());
      log(msg.comment ? 'REVISION / ' + msg.comment : 'New live code applied');
      ack(msg);
    } catch (error) { log('EVAL FAILED / ' + error.message, 'warn'); ack(msg, false, { error: error.message }); }
  }
  if (msg.type === 'sample_play') {
    try { const time = await playSample(msg); ack(msg, true, { audio_time: time }); }
    catch (error) { log('VOCAL ERROR / ' + error.message, 'warn'); ack(msg, false, { error: error.message }); }
  }
  if (msg.type === 'finish') {
    if (!recorder || recorder.state !== 'recording') return ack(msg, false, { error: 'Recorder not active' });
    const fade = Math.max(.2, Math.min(20, Number(msg.fade_seconds) || 4));
    log('Requested musical epilogue. Fading master for ' + fade + 's');
    state('FINALIZING', 'connected');
    const now = audioCtx.currentTime;
    tap.gain.cancelScheduledValues(now);
    tap.gain.setValueAtTime(tap.gain.value, now);
    tap.gain.linearRampToValueAtTime(0, now + fade);
    ack(msg);
    setTimeout(() => {
      try { window.hush(); } catch {}
      if (recorder.state === 'recording') recorder.stop();
      started = false;
    }, fade * 1000 + 100);
  }
}

function render() {
  const elapsed = clock();
  if (started) {
    $('elapsed').textContent = formatTime(elapsed);
    $('remaining').textContent = formatTime(Math.max(0, (armed?.target_seconds || 600) - elapsed));
    $('progress').style.width = Math.min(100, elapsed / (armed?.target_seconds || 600) * 100) + '%';
    $('cycle').textContent = (elapsed * bpm / 240).toFixed(1);
    $('phase').textContent = elapsed > (armed?.target_seconds || 600) ? 'OVERRUN · AGENT RESOLUTION' :
      elapsed > (armed?.target_seconds || 600) * .8 ? 'EPILOGUE RECOMMENDED' : 'FREE LIVE COMPOSITION';
  }
  if (!analyser) return;
  const canvas = $('scope'), ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width * devicePixelRatio || canvas.height !== rect.height * devicePixelRatio) {
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
  }
  const arr = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(arr);
  let rms = 0, peak = 0;
  for (const v of arr) { const a = (v - 128) / 128; rms += a*a; peak = Math.max(peak, Math.abs(a)); }
  rms = Math.sqrt(rms / arr.length);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.beginPath(); ctx.lineWidth = Math.max(1,devicePixelRatio * 1.5); ctx.strokeStyle = '#6af2ed';
  const step = canvas.width / (arr.length - 1);
  for (let i = 0; i < arr.length; i++) {
    const y = canvas.height * .5 + ((arr[i] - 128) / 128) * canvas.height * .4;
    i ? ctx.lineTo(i*step,y) : ctx.moveTo(0,y);
  }
  ctx.stroke();
  $('meter').style.width = Math.round(Math.min(1,peak)*100) + '%';
  if (started && performance.now() - previousTimer > 550) {
    previousTimer = performance.now();
    send({ type:'telemetry', session_id: armed.session_id, rms, peak,
      recorder_state: recorder?.state || 'inactive' });
  }
}
async function boot() {
  state('ENGINE BOOT');
  try {
    for (let i = 0; i < 150 && !window.initStrudel; i++) await new Promise(r=>setTimeout(r,100));
    if (!window.initStrudel) throw new Error('Strudel library did not load (check CDN/network)');
    await window.initStrudel({ prebake: () => window.samples('github:tidalcycles/dirt-samples') });
    state('ENGINE READY', 'connected');
    $('sample-rate').textContent = 'WEB AUDIO · CHROME/EDGE';
    log('Strudel 1.3.0 ready; waiting for session arm.');
    connect();
  } catch (error) { state('ENGINE FAILED'); log(error.message, 'warn'); }
}
function connect() {
  ws = new WebSocket('ws://' + location.host + '/engine?token=' + encodeURIComponent(key));
  ws.onopen = () => { log('Connected to control daemon.'); send({ type:'engine_ready', sample_rate: audioCtx?.sampleRate || null }); };
  ws.onclose = () => { state('DAEMON OFFLINE'); log('Control socket disconnected', 'warn'); setTimeout(connect, 1500); };
  ws.onmessage = (e) => {
    try { handle(JSON.parse(e.data)); }
    catch (err) { log(err.message, 'warn'); }
  };
}
$('unlock').addEventListener('click', enableAudio);
function frame() { render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
boot();
