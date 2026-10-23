import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { LiveSession } from './core/session.js';
import { generateSpeechWav } from './tts/tts-engine.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(os.homedir(), '.strudel-live');
const WEB = path.join(ROOT, 'src', 'web');
const SAMPLE_DIR = path.join(DATA, 'samples');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.webm': 'audio/webm' };
const validSample = (x) => /^[a-zA-Z0-9_-]{1,90}\.(wav|mp3|ogg|webm)$/.test(x);

const sendJSON = (res, code, data) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(data));
};
const parseBody = async (req, limit = 150000) => {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Request exceeds size limit');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};
const openTerminalMonitor = () => {
  const bin = path.join(ROOT, 'bin', 'strudel-live.js');
  if (process.platform === 'win32') {
    // Launch a read-only monitor, never the 'stand' command that arms sessions.
    const command = '"' + process.execPath + '" "' + bin + '" monitor';
    const child = spawn('cmd.exe', ['/c', 'start', '"Strudel Live"', 'cmd.exe', '/k', command], { detached:true, stdio:'ignore', windowsHide:false });
    child.on('error', (error) => process.stderr.write('Monitor launch: ' + error.message + '\n'));
    child.unref();
  } else if (process.platform === 'linux') {
    const child = spawn('x-terminal-emulator', ['-e', process.execPath, bin, 'monitor'], { detached:true, stdio:'ignore' });
    child.on('error', (error) => process.stderr.write('Monitor launch: ' + error.message + '\n'));
    child.unref();
  }
};
const openBrowser = (url) => {
  const plat = process.platform;
  const bin = plat === 'win32' ? 'cmd.exe' : plat === 'darwin' ? 'open' : 'xdg-open';
  const args = plat === 'win32' ? ['/c', 'start', '""', url] : [url];
  const child = spawn(bin, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', (error) => process.stderr.write('Browser launch: ' + error.message + '\n'));
  child.unref();
};

export class LiveServer {
  constructor(port = 3883, token = randomBytes(24).toString('hex')) {
    this.port = port;
    this.token = token;
    this.http = null;
    this.wss = null;
    this.engine = null;
    fs.mkdirSync(SAMPLE_DIR, { recursive: true });
    this.session = new LiveSession({
      recordingsDir: path.join(DATA, 'recordings'),
      send: (data) => this.send(data)
    });
  }
  send(message) {
    if (!this.engine || this.engine.readyState !== WebSocket.OPEN) return false;
    this.engine.send(JSON.stringify(message));
    return true;
  }
  browserURL() { return 'http://127.0.0.1:' + this.port + '/?token=' + this.token; }
  authorized(req, url) {
    const header = req.headers.authorization || '';
    return header === 'Bearer ' + this.token || url.searchParams.get('token') === this.token;
  }
  async start() {
    if (this.http) return;
    this.http = http.createServer((req, res) => this.handle(req, res).catch((error) => sendJSON(res, 500, { error: error.message })));
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });
    this.http.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://localhost');
      const origin = req.headers.origin || '';
      const expected = 'http://127.0.0.1:' + this.port;
      if (url.pathname !== '/engine' || url.searchParams.get('token') !== this.token || origin !== expected || this.engine) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.engine = ws;
        this.session.connected();
        this.wss.emit('connection', ws);
        ws.on('message', (data, binary) => {
          if (binary) this.session.writeAudio(Buffer.from(data));
          else {
            try { this.session.onMessage(JSON.parse(data.toString())); }
            catch (error) { process.stderr.write('Engine message rejected: ' + error.message + '\n'); }
          }
        });
        ws.on('close', () => {
          if (this.engine === ws) { this.engine = null; this.session.disconnected(); }
        });
      });
    });
    await new Promise((resolve, reject) => {
      this.http.once('error', reject);
      this.http.listen(this.port, '127.0.0.1', () => {
        this.http.removeListener('error', reject);
        resolve();
      });
    });
  }
  async handle(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1:' + this.port);
    if (!this.authorized(req, url)) return sendJSON(res, 403, { error: 'Unauthorized local request' });
    if (req.method === 'GET' && url.pathname === '/api/status') return sendJSON(res, 200, this.session.statusSnapshot());
    if (req.method === 'POST' && url.pathname === '/api/command') {
      try { return sendJSON(res, 200, await this.command(await parseBody(req))); }
      catch (error) { return sendJSON(res, 400, { error: error.message }); }
    }
    let file;
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) file = path.join(WEB, 'index.html');
    if (req.method === 'GET' && ['/engine.js', '/style.css'].includes(url.pathname)) file = path.join(WEB, url.pathname.slice(1));
    if (req.method === 'GET' && url.pathname.startsWith('/samples/')) {
      const name = decodeURIComponent(url.pathname.slice('/samples/'.length));
      if (!validSample(name)) return sendJSON(res, 400, { error: 'Invalid sample name' });
      file = path.join(SAMPLE_DIR, name);
    }
    if (file && fs.existsSync(file)) {
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
      fs.createReadStream(file).pipe(res); return;
    }
    return sendJSON(res, 404, { error: 'Not found' });
  }
  async command(command) {
    if (!command || typeof command !== 'object') throw new Error('Invalid command');
    switch (command.action) {
      case 'session_start': {
        const result = await this.session.arm(command);
        if (command.open_browser !== false) openBrowser(this.browserURL());
        if (command.open_terminal === true) openTerminalMonitor();
        return { ...result, browser_url: this.browserURL() };
      }
      case 'session_status': return this.session.statusSnapshot();
      case 'eval': return this.session.evaluate(command.code, command.comment);
      case 'sample_import': {
        const from = path.resolve(String(command.path || ''));
        const name = String(command.name || path.basename(from)).replace(/[^a-zA-Z0-9_.-]/g, '_');
        if (!validSample(name)) throw new Error('Allowed extensions: wav/mp3/ogg/webm and simple basename');
        if (!fs.statSync(from).isFile() || fs.statSync(from).size > 25 * 1024 * 1024) throw new Error('File missing or exceeds 25MB');
        fs.copyFileSync(from, path.join(SAMPLE_DIR, name));
        return { name, location: path.join(SAMPLE_DIR, name), sample_url: '/samples/' + name };
      }
      case 'sample_play': {
        const name = String(command.sample || '');
        if (!validSample(name) || !fs.existsSync(path.join(SAMPLE_DIR, name))) throw new Error('Import this sample first');
        return this.session.playSample(name, command);
      }
      case 'vocal_generate': {
        if (this.session.status !== 'running') throw new Error('Session must be running');
        const text = String(command.text || '');
        if (!text.trim() || text.length > 250) throw new Error('Vocal text length 1..250');
        const name = 'voice-' + randomBytes(8).toString('hex') + '.wav';
        await generateSpeechWav(text, path.join(SAMPLE_DIR, name), command);
        const res = await this.session.playSample(name, command);
        return { ...res, sample_name: name };
      }
      case 'session_finish': return this.session.finish(command);
      default: throw new Error('Unknown action: ' + String(command.action));
    }
  }
}
