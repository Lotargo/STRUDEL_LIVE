#!/usr/bin/env node
import { LiveServer, DATA } from '../src/server.js';
import { command, writeRuntime, ensureDaemon } from '../src/client.js';
import { runCodexAutopilot } from '../src/agents/codex-runner.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const action = args.shift() || 'help';
const option = (name, fallback) => { const idx = args.indexOf('--' + name); return idx >= 0 && args[idx + 1] ? args[idx+1] : fallback; };
const seconds = (x, fallback) => Number.isFinite(Number(x)) && Number(x)>0 ? Number(x) : fallback;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clock = (n) => String(Math.floor(n/60)).padStart(2,'0') + ':' + String(Math.floor(n%60)).padStart(2,'0');

async function monitor() {
  process.stdout.write('\x1b[?25l');
  process.once('SIGINT', () => { process.stdout.write('\x1b[?25h\n'); process.exit(0); });
  while (true) {
    let state;
    try { state = await command('session_status', {}, false); }
    catch (error) { process.stdout.write('Daemon unavailable: '+error.message+'\n'); break; }
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('  STRUDEL LIVE / MONITOR / AGY + CODEX\n');
    process.stdout.write('  ====================================================\n');
    process.stdout.write('  '+state.title+' / '+state.style+' / '+state.bpm+' BPM\n');
    process.stdout.write('  '+clock(state.elapsed_seconds)+' / '+clock(state.target_duration_seconds)+' | '+state.status.toUpperCase()+'\n');
    process.stdout.write('  '+state.revisions+' revisions | recorder: '+state.recording_state+' | engine: '+state.engine_connected+'\n\n');
    process.stdout.write('  NEXT: '+state.suggested_action+'\n\n');
    for (const event of state.recent_events || []) {
      process.stdout.write('  ['+clock(event.at_seconds)+'] '+event.kind+' '+(event.comment || event.error || '')+'\n');
    }
    process.stdout.write('\n  Ctrl+C closes this monitor, NOT the performance.\n');
    await sleep(1000);
  }
}

async function main() {
  if (action === 'serve') {
    const port = seconds(option('port', '3883'), 3883);
    const daemon = new LiveServer(port);
    await daemon.start();
    writeRuntime({ port, pid:process.pid, token:daemon.token, created_at:new Date().toISOString() });
    console.log('Strudel daemon active on 127.0.0.1:' + port);
    const shutdown = async () => {
      try {
        if (['running','armed','finishing'].includes(daemon.session.status)) await daemon.session.finish({fade_seconds:3});
      } catch(error) { console.error(error.message); }
      process.exit(0);
    };
    process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
    return;
  }
  if (action === 'stand') {
    await ensureDaemon();
    const state = await command('session_start', {
      duration_seconds:seconds(option('duration','600'),600),
      style:option('style','darkwave'), bpm:seconds(option('bpm','124'),124),
      title:option('title','Agent Live Performance'), open_browser:true
    });
    console.log('Open and enable audio: '+state.browser_url);
    return monitor();
  }
  if (action === 'status') { console.log(JSON.stringify(await command('session_status',{},false),null,2)); return; }
  if (action === 'monitor') { await ensureDaemon(); return monitor(); }
  if (action === 'finish') { console.log(JSON.stringify(await command('session_finish',{fade_seconds:seconds(option('fade','4'),4)},false),null,2)); return; }
  if (action === 'autopilot') {
    return runCodexAutopilot({
      duration:seconds(option('duration','600'),600),
      bpm:seconds(option('bpm','124'),124),
      style:option('style','darkwave'),
      title:option('title','Autonomous Strudel Live'),
      model:option('model',null)
    });
  }
  if (action === 'setup') {
    const mcpPath = path.join(ROOT, 'src', 'mcp', 'mcp-server.js');
    const client = option('client','codex');
    if (client === 'codex') {
      console.log('Run in your system terminal:\n');
      console.log('codex mcp add strudel-live -- "' + process.execPath + '" "' + mcpPath + '"');
      console.log('\nSkills are in .agents/skills/. Open Codex from project root.');
    } else if (client === 'agy') {
      const file = path.join(ROOT, 'mcp_config.local.json');
      fs.writeFileSync(file, JSON.stringify({ mcpServers: { 'strudel-live': { command:process.execPath, args:[mcpPath] } } }, null, 2));
      console.log('Generated '+file+'. Register this MCP entry in AGY plugin settings; keep plugin.json and skills/ in the plugin folder.');
    } else throw new Error('client must be codex or agy');
    return;
  }
  console.log('Strudel Live v2\n');
  console.log('  node bin/strudel-live.js setup --client codex|agy');
  console.log('  node bin/strudel-live.js serve [--port 3883]');
  console.log('  node bin/strudel-live.js stand --duration 600 --style darkwave --bpm 124');
  console.log('  node bin/strudel-live.js monitor | status | finish [--fade 4]');
  console.log('  node bin/strudel-live.js autopilot --duration 600 --style darkwave [--model <codex-model>]');
  console.log('\nRequires npm install, Codex CLI/auth for autopilot, Chrome/Edge, click to unlock audio.');
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode=1; });
