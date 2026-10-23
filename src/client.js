import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = path.join(os.homedir(), '.strudel-live', 'runtime.json');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function runtimeInfo() {
  try { return JSON.parse(fs.readFileSync(RUNTIME, 'utf8')); }
  catch { return null; }
}
export async function command(action, payload = {}, autoStart = true) {
  let info = runtimeInfo();
  if (!info && autoStart) info = await ensureDaemon();
  if (!info) throw new Error('Strudel daemon is not running. Run: node bin/strudel-live.js serve');
  try {
    const response = await fetch('http://127.0.0.1:' + info.port + '/api/command', {
      method: 'POST', headers: { authorization: 'Bearer ' + info.token, 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...payload }), signal: AbortSignal.timeout(45000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Strudel control error');
    return result;
  } catch (error) {
    if (autoStart && !await isAlive(info)) {
      info = await ensureDaemon(true);
      return command(action, payload, false);
    }
    throw error;
  }
}
export async function isAlive(info = runtimeInfo()) {
  if (!info) return false;
  try {
    const response = await fetch('http://127.0.0.1:' + info.port + '/api/status', {
      headers: { authorization: 'Bearer ' + info.token }, signal: AbortSignal.timeout(800)
    });
    return response.ok;
  } catch { return false; }
}
export async function ensureDaemon(recover = false) {
  let info = runtimeInfo();
  if (!recover && await isAlive(info)) return info;
  fs.mkdirSync(path.dirname(RUNTIME), { recursive: true });
  const child = spawn(process.execPath, [path.join(ROOT, 'bin', 'strudel-live.js'), 'serve'], {
    detached: true, stdio: 'ignore', windowsHide: true
  });
  child.unref();
  for (let i = 0; i < 55; i++) {
    await sleep(100);
    info = runtimeInfo();
    if (await isAlive(info)) return info;
  }
  throw new Error('Failed to start live daemon. Check port 3883 and server logs.');
}
export function writeRuntime(info) {
  fs.mkdirSync(path.dirname(RUNTIME), { recursive: true });
  fs.writeFileSync(RUNTIME, JSON.stringify(info), { mode: 0o600 });
  try { fs.chmodSync(RUNTIME, 0o600); } catch {}
}
