import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { generateSpeechWav } from './tts/tts-engine.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const RECORDINGS_DIR = path.join(ROOT_DIR, 'recordings');
const SAMPLES_DIR = path.join(ROOT_DIR, 'public', 'samples');

if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
if (!fs.existsSync(SAMPLES_DIR)) fs.mkdirSync(SAMPLES_DIR, { recursive: true });

export class StrudelLiveServer {
  constructor(port = 3883) {
    this.port = port;
    this.httpServer = null;
    this.wss = null;
    this.browserProcess = null;
    this.terminalProcess = null;
    this.activeWs = null;

    this.session = {
      status: 'idle',
      duration: 600,
      style: 'darkwave',
      bpm: 124,
      title: 'Untitled Live Set',
      startTime: null,
      elapsed: 0,
      remaining: 600,
      percent: 0,
      phase: 'IDLE',
      activeCode: '',
      logs: [],
      recordingWebm: null,
      recordingWav: null,
      recordingMp3: null,
      webmWriteStream: null
    };

    this.listeners = new Set();
  }

  onUpdate(fn) {
    this.listeners.add(fn);
  }

  notifyUpdate() {
    for (const fn of this.listeners) {
      try { fn(this.session); } catch (e) {}
    }
  }

  async start() {
    if (this.httpServer) return;

    this.httpServer = http.createServer((req, res) => {
      this.handleHttp(req, res);
    });

    this.wss = new WebSocketServer({ server: this.httpServer, path: '/live-socket' });

    this.wss.on('connection', (ws) => {
      this.activeWs = ws;
      console.log('⚡ Stand browser connected via WebSocket.');

      // Send initial state if session is already running
      if (this.session.status === 'running') {
        ws.send(JSON.stringify({
          type: 'start',
          duration: this.session.duration,
          style: this.session.style,
          bpm: this.session.bpm,
          title: this.session.title
        }));
        if (this.session.activeCode) {
          ws.send(JSON.stringify({
            type: 'eval',
            code: this.session.activeCode,
            comment: 'Restored active pattern'
          }));
        }
      }

      ws.on('message', (data, isBinary) => {
        if (isBinary) {
          // Binary audio chunk from MediaRecorder
          if (this.session.webmWriteStream) {
            this.session.webmWriteStream.write(Buffer.from(data));
          }
        } else {
          try {
            const msg = JSON.parse(data.toString());
            this.handleWsMessage(msg);
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        }
      });

      ws.on('close', () => {
        if (this.activeWs === ws) this.activeWs = null;
      });
    });

    return new Promise((resolve) => {
      this.httpServer.listen(this.port, '127.0.0.1', () => {
        console.log(`⚡ Strudel Live Server listening at http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  handleHttp(req, res) {
    const url = new URL(req.url, `http://127.0.0.1:${this.port}`);
    let pathname = url.pathname;

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(path.join(__dirname, 'web', 'index.html')));
      return;
    }

    if (pathname === '/style.css') {
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(fs.readFileSync(path.join(__dirname, 'web', 'style.css')));
      return;
    }

    if (pathname === '/engine.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(fs.readFileSync(path.join(__dirname, 'web', 'engine.js')));
      return;
    }

    if (pathname === '/strudel-web.mjs') {
      const file = path.join(ROOT_DIR, 'node_modules', '@strudel', 'web', 'dist', 'index.mjs');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(fs.readFileSync(file));
      return;
    }

    if (pathname.startsWith('/assets/')) {
      const file = path.join(ROOT_DIR, 'node_modules', '@strudel', 'web', 'dist', pathname);
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(fs.readFileSync(file));
        return;
      }
    }

    if (pathname.startsWith('/samples/')) {
      const filename = path.basename(pathname);
      const file = path.join(SAMPLES_DIR, filename);
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'audio/wav' });
        res.end(fs.readFileSync(file));
        return;
      }
    }

    res.writeHead(404);
    res.end('Not found');
  }

  handleWsMessage(msg) {
    if (msg.type === 'telemetry') {
      this.session.elapsed = msg.elapsed;
      this.session.remaining = msg.remaining;
      this.session.percent = msg.percent;
      this.session.phase = msg.phase;
      this.notifyUpdate();
    }
  }

  async launchBrowser(openWindow = true) {
    if (this.browserProcess) return;

    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const binary = fs.existsSync(edgePath) ? edgePath : chromePath;

    const profileDir = path.join(os.tmpdir(), 'strudel_live_profile');
    const url = `http://127.0.0.1:${this.port}/index.html`;
    const args = [
      `--user-data-dir=${profileDir}`,
      `--app=${url}`,
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=940,680',
      '--no-first-run',
      '--no-default-browser-check'
    ];

    if (!openWindow) {
      args.push('--window-position=-2000,-2000');
    }

    console.log(`Spawning stand browser: ${binary} for ${url}`);
    this.browserProcess = spawn(binary, args, { detached: true, stdio: 'ignore' });
    this.browserProcess.unref();
  }

  async startSession(opts = {}) {
    await this.start();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeTitle = (opts.title || 'Live_Set').replace(/[^a-zA-Z0-9_-]/g, '_');
    const baseFilename = `${safeTitle}_${opts.style || 'darkwave'}_${timestamp}`;

    this.session.duration = opts.duration_seconds || 600;
    this.session.style = opts.style || 'darkwave';
    this.session.bpm = opts.bpm || 124;
    this.session.title = opts.title || 'Darkwave Live Session';
    this.session.status = 'running';
    this.session.startTime = Date.now();
    this.session.elapsed = 0;
    this.session.remaining = this.session.duration;
    this.session.percent = 0;
    this.session.phase = 'PHASE 1: ATMOSPHERE';
    this.session.logs = [];

    const webmFile = path.join(RECORDINGS_DIR, `${baseFilename}.webm`);
    this.session.recordingWebm = webmFile;
    this.session.recordingWav = path.join(RECORDINGS_DIR, `${baseFilename}.wav`);
    this.session.recordingMp3 = path.join(RECORDINGS_DIR, `${baseFilename}.mp3`);
    this.session.webmWriteStream = fs.createWriteStream(webmFile);

    // Launch browser stand if not already open
    await this.launchBrowser(opts.open_window !== false);

    // Wait up to 6 seconds for browser to connect via WebSocket
    if (!this.activeWs) {
      console.log('Waiting for browser stand to connect...');
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 6000);
        const check = setInterval(() => {
          if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
            clearTimeout(timeout);
            clearInterval(check);
            resolve();
          }
        }, 150);
      });
    }

    // If WS is open, send start immediately
    if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
      this.activeWs.send(JSON.stringify({
        type: 'start',
        duration: this.session.duration,
        style: this.session.style,
        bpm: this.session.bpm,
        title: this.session.title
      }));
    }

    this.log(`Session initialized. Target: ${Math.floor(this.session.duration / 60)}m, Style: ${this.session.style}`);
    return this.getStatus();
  }

  async evalCode(code, comment = '') {
    this.session.activeCode = code;
    this.log(comment || 'Updated algorithmic pattern');

    if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
      this.activeWs.send(JSON.stringify({
        type: 'eval',
        code,
        comment
      }));
    }

    return {
      success: true,
      elapsed: this.session.elapsed,
      remaining: this.session.remaining,
      phase: this.session.phase
    };
  }

  async triggerVox(text, options = {}) {
    const voxId = `vox_${Date.now()}`;
    const wavFile = path.join(SAMPLES_DIR, `${voxId}.wav`);
    
    // Generate voice sample via Windows TTS
    await generateSpeechWav(text, wavFile, {
      rate: options.rate ?? -2,
      voice: options.voice ?? ''
    });

    const wavUrl = `/samples/${voxId}.wav`;
    this.log(`VOX: "${text}"`, true);

    if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
      this.activeWs.send(JSON.stringify({
        type: 'vox',
        text,
        wavUrl,
        gain: options.gain ?? 1.2
      }));
    }

    return {
      success: true,
      text,
      sampleUrl: wavUrl
    };
  }

  async stopSession() {
    this.session.status = 'stopped';
    this.log('Session stop requested. Finalizing audio stream.');

    if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
      this.activeWs.send(JSON.stringify({ type: 'stop' }));
    }

    // Wait a brief moment for buffer flush
    await new Promise((r) => setTimeout(r, 1200));

    if (this.session.webmWriteStream) {
      this.session.webmWriteStream.end();
    }

    // Transcode WebM recording to high quality WAV and MP3 via ffmpeg
    const webmFile = this.session.recordingWebm;
    const wavFile = this.session.recordingWav;
    const mp3File = this.session.recordingMp3;

    if (fs.existsSync(webmFile) && fs.statSync(webmFile).size > 0) {
      try {
        console.log('Transcoding audio recording to WAV and MP3 with ffmpeg...');
        await execAsync(`ffmpeg -y -i "${webmFile}" -c:a pcm_s16le "${wavFile}"`);
        await execAsync(`ffmpeg -y -i "${webmFile}" -b:a 320k "${mp3File}"`);
        console.log(`Saved master recording to ${wavFile} and ${mp3File}`);
      } catch (err) {
        console.error('ffmpeg transcoding error:', err);
      }
    }

    if (this.browserProcess) {
      try { this.browserProcess.kill(); } catch (e) {}
      this.browserProcess = null;
    }

    return {
      success: true,
      duration_seconds: Math.floor(this.session.elapsed),
      wav_path: fs.existsSync(wavFile) ? wavFile : null,
      mp3_path: fs.existsSync(mp3File) ? mp3File : null,
      title: this.session.title,
      style: this.session.style,
      total_logs: this.session.logs.length
    };
  }

  log(msg, isVox = false) {
    const m = Math.floor(this.session.elapsed / 60);
    const s = Math.floor(this.session.elapsed % 60);
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    this.session.logs.push({ time: timeStr, message: msg, isVox });
    this.notifyUpdate();
  }

  getStatus() {
    return {
      status: this.session.status,
      elapsed_seconds: Math.round(this.session.elapsed),
      remaining_seconds: Math.round(this.session.remaining),
      progress_percent: parseFloat(this.session.percent.toFixed(1)),
      phase: this.session.phase,
      duration_total_seconds: this.session.duration,
      bpm: this.session.bpm,
      style: this.session.style,
      title: this.session.title,
      active_code: this.session.activeCode,
      recording_wav: this.session.recordingWav,
      recent_logs: this.session.logs.slice(-5)
    };
  }
}

// Singleton server instance for MCP and CLI
let serverInstance = null;
export function getServerInstance(port = 3883) {
  if (!serverInstance) {
    serverInstance = new StrudelLiveServer(port);
  }
  return serverInstance;
}
