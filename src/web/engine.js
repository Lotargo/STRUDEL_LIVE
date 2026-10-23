import { initStrudel, initAudio, evaluate, hush, getAudioContext, samples } from '/strudel-web.mjs';

let audioCtx = null;
let mediaRecorder = null;
let recorderGain = null;
let analyser = null;
let ws = null;

let sessionConfig = {
  duration: 600,
  style: 'darkwave',
  bpm: 124,
  startTime: null,
  activeCode: '',
  isPlaying: false
};

const $ = (id) => document.getElementById(id);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getPhase(percent) {
  if (percent < 0.15) return 'PHASE 1: ATMOSPHERE';
  if (percent < 0.35) return 'PHASE 2: GROOVE EXPOSITION';
  if (percent < 0.65) return 'PHASE 3: ESCALATION & DRIVE';
  if (percent < 0.82) return 'PHASE 4: MAXIMUM CLIMAX';
  if (percent < 0.94) return 'PHASE 5: EPILOGUE & RESOLUTION';
  return 'PHASE 6: FINAL OUTRO';
}

function appendLog(timeStr, message, isVox = false) {
  const container = $('log-container');
  if (!container) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-msg ${isVox ? 'log-vox' : ''}">${escapeHtml(message)}</span>
  `;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Intercept Web Audio connects so we can record everything Strudel outputs
function setupAudioTap(ctx) {
  recorderGain = ctx.createGain();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  
  recorderGain.connect(analyser);

  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target === ctx.destination && this !== recorderGain && this !== analyser) {
      try {
        origConnect.call(this, recorderGain);
      } catch (e) {
        // Ignore duplicate connect attempts
      }
    }
    return origConnect.call(this, target, ...rest);
  };

  // Setup MediaStreamDestination for uncompressed/lossless WebM capture
  const streamDest = ctx.createMediaStreamDestination();
  recorderGain.connect(streamDest);

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  mediaRecorder = new MediaRecorder(streamDest.stream, { mimeType });
  
  mediaRecorder.ondataavailable = async (e) => {
    if (e.data && e.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
      const buffer = await e.data.arrayBuffer();
      ws.send(buffer);
    }
  };

  mediaRecorder.onstop = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'recorder_stopped' }));
    }
  };

  startVisualizer();
}

// 60 FPS Neon Oscilloscope & Spectrum Visualizer
function startVisualizer() {
  const canvas = $('visualizer-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const bufferLength = analyser.frequencyBinCount;
  const timeData = new Uint8Array(bufferLength);
  const freqData = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    if (!analyser) return;

    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    const w = canvas.width;
    const h = canvas.height;

    // Dark cyber trail
    ctx.fillStyle = 'rgba(5, 6, 8, 0.25)';
    ctx.fillRect(0, 0, w, h);

    // Spectrum bars (subtle background)
    const barWidth = (w / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i += 2) {
      const barHeight = (freqData[i] / 255) * h * 0.75;
      ctx.fillStyle = `rgba(255, 0, 85, ${0.1 + (freqData[i] / 255) * 0.4})`;
      ctx.fillRect(x, h - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    // Oscilloscope wave (neon cyan glow)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();

    const sliceWidth = w / bufferLength;
    let waveX = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i] / 128.0;
      const waveY = (v * h) / 2;
      if (i === 0) {
        ctx.moveTo(waveX, waveY);
      } else {
        ctx.lineTo(waveX, waveY);
      }
      waveX += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  draw();
}

// Initialize Strudel and Engine
async function boot() {
  $('status-text').innerText = 'LOADING AUDIO ENGINE';
  try {
    await initStrudel();
    try {
      await initAudio();
    } catch (e) {
      console.warn('initAudio non-critical:', e);
    }
    audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {}
    }
    setupAudioTap(audioCtx);

    // Pre-load standard drum samples
    try {
      samples('github:tidalcycles/dirt-samples');
    } catch (e) {}

    // Check if audio context is running or needs click
    updateAudioBanner();

    $('status-text').innerText = 'READY FOR AGENT';
    connectWebSocket();
  } catch (err) {
    $('status-text').innerText = 'BOOT ERROR: ' + err.message;
    console.error('Strudel boot error:', err);
  }
}

function updateAudioBanner() {
  const banner = $('audio-unlock-banner');
  if (!banner) return;
  if (audioCtx && audioCtx.state === 'suspended') {
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

window.addEventListener('pointerdown', async () => {
  try {
    await initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    updateAudioBanner();
  } catch (e) {}
});

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${location.host}/live-socket`;
  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    $('status-text').innerText = 'STAND ONLINE';
    appendLog('00:00', 'Stand connected to Antigravity control server.');
  };

  ws.onmessage = async (event) => {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        handleServerCommand(msg);
      } catch (e) {
        console.error('Invalid WS message:', e);
      }
    }
  };

  ws.onclose = () => {
    $('status-text').innerText = 'DISCONNECTED';
    setTimeout(connectWebSocket, 1500);
  };
}

async function handleServerCommand(msg) {
  if (msg.type === 'start') {
    try {
      await initAudio();
      if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      updateAudioBanner();
    } catch (e) {}

    sessionConfig.duration = msg.duration || 600;
    sessionConfig.style = msg.style || 'darkwave';
    sessionConfig.bpm = msg.bpm || 124;
    sessionConfig.startTime = performance.now();
    sessionConfig.isPlaying = true;

    $('badge-style').innerText = sessionConfig.style.toUpperCase();
    $('time-total').innerText = `/ ${formatTime(sessionConfig.duration)}`;
    $('status-text').innerText = 'RECORDING LIVE';

    if (mediaRecorder && mediaRecorder.state !== 'recording') {
      mediaRecorder.start(1000); // 1-second chunks
    }

    appendLog('00:00', `Session initiated. Target duration: ${formatTime(sessionConfig.duration)}, Style: ${sessionConfig.style}, BPM: ${sessionConfig.bpm}`);
  }

  if (msg.type === 'eval') {
    try {
      try {
        await initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        updateAudioBanner();
      } catch (e) {}

      sessionConfig.activeCode = msg.code;
      $('code-display').innerText = msg.code;
      await evaluate(msg.code, true);

      const elapsedSec = sessionConfig.startTime ? (performance.now() - sessionConfig.startTime) / 1000 : 0;
      appendLog(formatTime(elapsedSec), msg.comment ? `[TRANSITION] ${msg.comment}` : 'Evaluated new algorithmic pattern');
      
      ws.send(JSON.stringify({ type: 'eval_ack', success: true }));
    } catch (err) {
      appendLog('ERROR', `Eval error: ${err.message}`);
      ws.send(JSON.stringify({ type: 'eval_ack', success: false, error: err.message }));
    }
  }

  if (msg.type === 'vox') {
    try {
      const elapsedSec = sessionConfig.startTime ? (performance.now() - sessionConfig.startTime) / 1000 : 0;
      appendLog(formatTime(elapsedSec), `VOX: "${msg.text}"`, true);

      // If pre-rendered wavUrl is provided, load and play it through Web Audio
      if (msg.wavUrl) {
        const resp = await fetch(msg.wavUrl);
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuf;

        // Route through Strudel effects (reverb/delay if desired)
        const voxGain = audioCtx.createGain();
        voxGain.gain.value = msg.gain ?? 1.1;

        source.connect(voxGain);
        voxGain.connect(recorderGain);
        voxGain.connect(audioCtx.destination);

        source.start();
      } else if (window.speechSynthesis) {
        // Fallback to Web Speech API
        const utter = new SpeechSynthesisUtterance(msg.text);
        utter.rate = msg.rate ?? 0.85;
        utter.pitch = msg.pitch ?? 0.7;
        window.speechSynthesis.speak(utter);
      }
      ws.send(JSON.stringify({ type: 'vox_ack', success: true }));
    } catch (err) {
      console.error('Vox error:', err);
      ws.send(JSON.stringify({ type: 'vox_ack', success: false, error: err.message }));
    }
  }

  if (msg.type === 'stop') {
    sessionConfig.isPlaying = false;
    $('status-text').innerText = 'FINALIZING';
    hush();

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }

    const elapsedSec = sessionConfig.startTime ? (performance.now() - sessionConfig.startTime) / 1000 : 0;
    appendLog(formatTime(elapsedSec), 'Session concluded. Finalizing audio recording.');
  }
}

// Periodic Telemetry Loop
setInterval(() => {
  if (!sessionConfig.isPlaying || !sessionConfig.startTime) return;

  const elapsedSec = (performance.now() - sessionConfig.startTime) / 1000;
  const remainingSec = Math.max(0, sessionConfig.duration - elapsedSec);
  const percent = Math.min(1.0, elapsedSec / sessionConfig.duration);

  $('time-elapsed').innerText = formatTime(elapsedSec);
  $('progress-bar').style.width = `${(percent * 100).toFixed(1)}%`;
  $('phase-badge').innerText = getPhase(percent);

  // Send status back to Node / MCP
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'telemetry',
      elapsed: elapsedSec,
      remaining: remainingSec,
      percent: percent * 100,
      phase: getPhase(percent),
      activeCode: sessionConfig.activeCode
    }));
  }
}, 500);

window.addEventListener('DOMContentLoaded', boot);
