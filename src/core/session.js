import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const ACTIVE = new Set(['armed', 'running', 'finishing']);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const safeName = (value) => String(value || 'live-set').normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);

async function transcode(source, target, args) {
  return new Promise((resolve) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, ...args, target], { stdio: 'ignore' });
    child.on('error', (error) => resolve({ ok: false, error: error.message }));
    child.on('exit', (code) => resolve({ ok: code === 0, error: code === 0 ? null : 'ffmpeg exit ' + code }));
  });
}

export class LiveSession {
  constructor({ recordingsDir, send, clock = () => performance.now() }) {
    this.recordingsDir = recordingsDir;
    this.send = send;
    this.clock = clock;
    this.reset();
  }

  reset() {
    this.id = null;
    this.status = 'idle';
    this.createdAt = null;
    this.startedAt = null;
    this.finishedAt = null;
    this.targetSeconds = 600;
    this.style = 'darkwave';
    this.title = 'Untitled';
    this.bpm = 124;
    this.activeCode = '';
    this.engineConnected = false;
    this.engineReady = false;
    this.recorderState = 'inactive';
    this.audio = { rms: 0, peak: 0, sample_rate: null };
    this.revisions = 0;
    this.events = [];
    this.pending = new Map();
    this.recorder = null;
    this.base = null;
    this.finishPromise = null;
    this.recordingEnd = null;
  }

  elapsed() {
    return this.startedAt === null ? 0 : Math.max(0, ((this.finishedAt ?? this.clock()) - this.startedAt) / 1000);
  }

  guidance() {
    const remaining = this.targetSeconds - this.elapsed();
    if (this.status !== 'running') return 'Wait for the browser to unlock audio and report recording_started.';
    if (remaining <= 0) return 'Target passed. Resolve the music gracefully and call session_finish when tails decay; target is not a hard cutoff.';
    if (remaining < Math.max(12, this.targetSeconds * 0.08)) return 'Final resolution: remove rhythm, let reverberation decay and finish after silence.';
    if (remaining < Math.max(30, this.targetSeconds * 0.2)) return 'Begin original epilogue soon: harmonic resolution, reduction and vocal callback.';
    return 'Compose the next original change using musical context, not a preset time template.';
  }

  statusSnapshot() {
    const elapsed = this.elapsed();
    const remaining = this.targetSeconds - elapsed;
    return {
      session_id: this.id, status: this.status, style: this.style,
      title: this.title, bpm: this.bpm, target_duration_seconds: this.targetSeconds,
      elapsed_seconds: Number(elapsed.toFixed(2)),
      remaining_seconds: Number(Math.max(0, remaining).toFixed(2)),
      overrun_seconds: Number(Math.max(0, -remaining).toFixed(2)),
      progress_percent: Number(Math.min(100, elapsed / this.targetSeconds * 100).toFixed(1)),
      estimated_cycle: Number((elapsed * this.bpm / 240).toFixed(2)),
      suggested_action: this.guidance(),
      engine_connected: this.engineConnected, engine_ready: this.engineReady,
      recording_state: this.recorderState, audio: this.audio,
      revisions: this.revisions, active_code: this.activeCode,
      recent_events: this.events.slice(-12),
      recording_webm: this.base ? this.base + '.webm' : null
    };
  }

  event(kind, detail = {}) {
    const item = { at_seconds: Number(this.elapsed().toFixed(2)), timestamp: new Date().toISOString(), kind, ...detail };
    this.events.push(item);
    if (this.events.length > 1000) this.events.shift();
    if (this.base) fs.appendFileSync(this.base + '.jsonl', JSON.stringify(item) + '\n');
    return item;
  }

  async arm(options = {}) {
    if (ACTIVE.has(this.status)) throw new Error('A session is already active. Finish it before starting another.');
    if (this.recorder) throw new Error('Recording stream not finalized');
    const wasConnected = this.engineConnected;
    const wasReady = this.engineReady;
    this.reset();
    this.engineConnected = wasConnected;
    this.engineReady = wasReady;
    this.id = randomUUID();
    this.createdAt = new Date().toISOString();
    this.targetSeconds = clamp(Number(options.duration_seconds) || 600, 30, 14400);
    this.style = String(options.style || 'darkwave').slice(0, 80);
    this.title = String(options.title || 'Live Improvisation').slice(0, 120);
    this.bpm = clamp(Number(options.bpm) || 124, 30, 320);
    fs.mkdirSync(this.recordingsDir, { recursive: true });
    this.base = path.join(this.recordingsDir, safeName(this.title) + '-' + this.id);
    this.recorder = fs.createWriteStream(this.base + '.webm', { flags: 'wx' });
    await new Promise((resolve, reject) => {
      this.recorder.once('open', resolve);
      this.recorder.once('error', reject);
    });
    this.status = 'armed';
    this.event('session_armed', { title: this.title, style: this.style, bpm: this.bpm, target_seconds: this.targetSeconds });
    this.send({ type: 'arm', session_id: this.id, bpm: this.bpm, title: this.title, style: this.style, target_seconds: this.targetSeconds });
    return this.statusSnapshot();
  }

  connected() {
    this.engineConnected = true;
    if (this.status === 'armed') this.send({ type: 'arm', session_id: this.id, bpm: this.bpm, title: this.title, style: this.style });
    if (this.status === 'running') this.event('engine_reconnected', { warning: 'Browser reconnect does not guarantee uninterrupted audio.' });
  }

  disconnected() {
    this.engineConnected = false;
    this.engineReady = false;
    if (this.status === 'running') this.event('engine_disconnected', { warning: 'Capture may have a gap.' });
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer); p.reject(new Error('Audio engine disconnected')); this.pending.delete(id);
    }
  }

  onMessage(message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'engine_ready') {
      this.engineReady = true;
      this.audio.sample_rate = message.sample_rate || null;
      this.event('engine_ready');
    }
    if (message.type === 'recording_started' && message.session_id === this.id && this.status === 'armed') {
      this.startedAt = this.clock();
      this.status = 'running';
      this.recorderState = 'recording';
      this.event('recording_started');
    }
    if (message.type === 'telemetry' && message.session_id === this.id) {
      this.audio.rms = clamp(Number(message.rms) || 0, 0, 1);
      this.audio.peak = clamp(Number(message.peak) || 0, 0, 1);
      this.recorderState = String(message.recorder_state || this.recorderState);
    }
    if (message.type === 'engine_error') this.event('engine_error', { error: String(message.error || 'unknown') });
    if (message.request_id && this.pending.has(message.request_id)) {
      const p = this.pending.get(message.request_id);
      this.pending.delete(message.request_id);
      clearTimeout(p.timer);
      if (message.success === false) p.reject(new Error(String(message.error || 'Playback operation failed')));
      else p.resolve(message);
    }
    if (message.type === 'recording_done' && message.session_id === this.id && this.recordingEnd) {
      this.recorderState = 'inactive';
      this.recordingEnd();
      this.recordingEnd = null;
    }
  }

  writeAudio(buffer) {
    if (!this.recorder || !['running', 'finishing'].includes(this.status)) return;
    this.recorder.write(buffer);
  }

  request(type, payload, timeoutMs = 12000) {
    if (!this.engineConnected) throw new Error('Audio browser not connected');
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('Audio engine confirmation timeout: ' + type));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      if (!this.send({ type, request_id: requestId, session_id: this.id, ...payload })) {
        clearTimeout(timer); this.pending.delete(requestId); reject(new Error('Audio engine unavailable'));
      }
    });
  }

  async evaluate(code, comment = '') {
    if (this.status !== 'running') throw new Error('Session not recording. Unlock audio in browser first.');
    if (typeof code !== 'string' || !code.trim() || code.length > 100000) throw new Error('Expected nonempty Strudel code <= 100 KB');
    try {
      await this.request('evaluate', { code, comment: String(comment).slice(0, 300) });
      this.activeCode = code;
      this.revisions += 1;
      fs.writeFileSync(this.base + '.strudel', code);
      this.event('code_applied', { revision: this.revisions, comment: String(comment).slice(0, 300), code });
      return { applied: true, revision: this.revisions, ...this.statusSnapshot() };
    } catch (error) {
      this.event('code_rejected', { comment: String(comment), error: error.message });
      throw error;
    }
  }

  async playSample(sample, options = {}) {
    if (this.status !== 'running') throw new Error('Session is not running');
    const response = await this.request('sample_play', {
      sample, gain: clamp(Number(options.gain ?? 0.7), 0, 2),
      speed: clamp(Number(options.speed ?? 1), 0.25, 4),
      sync: ['now', 'beat', 'bar'].includes(options.sync) ? options.sync : 'beat'
    });
    this.event('vocal_sample_played', { sample, sync: options.sync || 'beat' });
    return { played: true, scheduled_audio_time: response.audio_time, ...this.statusSnapshot() };
  }

  async finish(options = {}) {
    if (this.finishPromise) return this.finishPromise;
    if (!ACTIVE.has(this.status)) throw new Error('No active performance');
    this.finishPromise = this._finish(options);
    return this.finishPromise;
  }

  async _finish(options) {
    this.status = 'finishing';
    const fadeSeconds = clamp(Number(options.fade_seconds ?? 4), 0.2, 20);
    this.event('finish_requested', { fade_seconds: fadeSeconds });
    let confirmed = false;
    if (this.engineConnected) {
      const done = new Promise((resolve) => { this.recordingEnd = resolve; });
      try {
        await this.request('finish', { fade_seconds: fadeSeconds }, 8000);
        await Promise.race([done.then(() => { confirmed = true; }), new Promise(r => setTimeout(r, (fadeSeconds + 8) * 1000))]);
      } catch (error) {
        this.event('finish_warning', { error: error.message });
      }
    }
    if (this.recorder) {
      const stream = this.recorder;
      this.recorder = null;
      await new Promise((resolve) => stream.end(resolve));
    }
    const webm = this.base + '.webm';
    const wav = this.base + '.wav';
    const mp3 = this.base + '.mp3';
    let exports = [];
    if (fs.existsSync(webm) && fs.statSync(webm).size > 100) {
      const [wavResult, mp3Result] = await Promise.all([
        transcode(webm, wav, ['-c:a', 'pcm_s24le']),
        transcode(webm, mp3, ['-b:a', '320k'])
      ]);
      if (wavResult.ok) exports.push(wav);
      if (mp3Result.ok) exports.push(mp3);
      if (!wavResult.ok || !mp3Result.ok) this.event('transcode_warning', { wav: wavResult.error, mp3: mp3Result.error });
    }
    this.finishedAt = this.clock();
    this.status = 'finished';
    this.event('session_finished', { recording_confirmed: confirmed, exports });
    return { finished: true, recording_finalized: confirmed, source_webm: webm, exports,
      event_log: this.base + '.jsonl', latest_source: this.base + '.strudel',
      ...this.statusSnapshot() };
  }
}