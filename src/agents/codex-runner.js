import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, ensureDaemon } from '../client.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function invokeCodex(prompt, model, timeout = 100000) {
  return new Promise((resolve, reject) => {
    const args = ['exec','--json','-C',ROOT,'--skip-git-repo-check','--sandbox','read-only'];
    if (model) args.push('--model', model);
    args.push('-');
    const p = spawn('codex', args, { cwd:ROOT, shell:process.platform === 'win32', env:process.env, windowsHide:true });
    let output = '', errors = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error('Codex turn timeout')); }, timeout);
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.stdout.on('data', (chunk) => { output += chunk.toString(); if (output.length > 500000) output = output.slice(-250000); });
    p.stderr.on('data', (chunk) => { errors += chunk.toString(); if (errors.length > 4000) errors = errors.slice(-4000); });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error('Codex exit '+code+': '+errors.slice(-800)));
      let message = '';
      for (const line of output.split('\n')) {
        try {
          const event = JSON.parse(line);
          if (event.type === 'item.completed' && event.item?.type === 'agent_message') message = event.item.text || message;
        } catch {}
      }
      resolve(message);
    });
    p.stdin.end(prompt);
  });
}

function promptForTurn(state, style) {
  return [
    'You are the LIVE composer operating Strudel Live via the strudel-live MCP tools.',
    'This is a real performance, not a plan or report. Read AGENTS.md and the relevant .agents/skills.',
    'The musical brief is '+style+'. Full target '+state.target_duration_seconds+'s, tempo '+state.bpm+' BPM.',
    'Elapsed '+state.elapsed_seconds+'s; remaining '+state.remaining_seconds+'s; current status '+state.status+'.',
    'Capture health: '+state.capture_health+'. If stalled, stop changing music and alert the user.',
    'Current live Strudel code:\n'+(state.active_code || '[NONE YET]'),
    'Recent musical decisions: '+JSON.stringify(state.recent_events),
    'You MUST perform at least one meaningful tool action in this turn: strudel_eval or strudel_session_finish.',
    'Compose genuine incremental musical development. No fixed genre templates, no repeated identical code.',
    'Use the complete active code as your editable score. Validate via strudel_eval acknowledgement.',
    'For voice use strudel_vocal_generate or import prerecorded samples; route through recording bus.',
    'If reaching resolution, make an intentional final musical passage, then call strudel_session_finish.',
    'If you want another turn, end message EXACTLY with NEXT_TICK_SECONDS=<integer between 8 and 50>.',
    'If you finished with strudel_session_finish, end message EXACTLY with PERFORMANCE_FINISHED.'
  ].join('\n\n');
}

export async function runCodexAutopilot({ duration=600, bpm=124, style='darkwave', title='Live', model=null }) {
  await ensureDaemon();
  const started = await command('session_start',{duration_seconds:duration,bpm,style,title,open_browser:true});
  console.log('Browser URL: '+started.browser_url);
  console.log('Unlock audio in the browser to initiate recording; the real agent begins only after confirmation.');
  let state;
  for (let attempts = 0; attempts < 180; attempts++) {
    state = await command('session_status');
    if (state.status === 'running') break;
    await sleep(1000);
  }
  if (state.status !== 'running') {
    console.error('No audio unlock received; session stays armed. Open '+started.browser_url);
    return;
  }
  let failures = 0, turns = 0;
  while (true) {
    state = await command('session_status');
    if (state.status === 'finished') break;
    if (state.status !== 'running') throw new Error('Unexpected performance state '+state.status);
    turns += 1;
    if (turns > 250) throw new Error('Autopilot guard: too many Codex turns (recording left for manual conclusion).');
    console.log('Codex turn '+turns+' | elapsed '+Math.round(state.elapsed_seconds)+'s, remaining '+Math.round(state.remaining_seconds)+'s');
    try {
      const message = await invokeCodex(promptForTurn(state,style), model);
      const after = await command('session_status');
      if (after.status === 'finished' || /PERFORMANCE_FINISHED/.test(message)) break;
      if (after.revisions === state.revisions) {
        failures += 1;
        console.error('Agent made no acknowledged change in this turn.');
      } else failures = 0;
      if (failures >= 3) throw new Error('Agent did not make changes for three turns. Check Codex MCP setup.');
      const delay = Number(/NEXT_TICK_SECONDS=(\d+)/.exec(message)?.[1]) || 25;
      await sleep(Math.max(8, Math.min(50,delay)) * 1000);
    } catch (error) {
      console.error('Codex performer error: '+error.message);
      failures += 1;
      if (failures >= 3) {
        console.error('Autopilot disengaged; no hard audio cutoff. Continue or call session_finish from the CLI/MCP.');
        break;
      }
      await sleep(8000);
    }
  }
  console.log('Autopilot controller exited. Query status for recording/exports.');
}
