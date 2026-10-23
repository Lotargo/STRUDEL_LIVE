import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { LiveSession } from '../src/core/session.js';

const create = async (clock = () => 0) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strudel-live-test-'));
  const messages = [];
  const session = new LiveSession({ recordingsDir:root, clock, send:(m) => { messages.push(m); return true; } });
  const cleanup = async () => {
    if (session.recorder) {
      await new Promise((resolve) => session.recorder.end(resolve));
      session.recorder = null;
    }
    await fs.rm(root, { recursive:true, force:true });
  };
  return { session, root, messages, cleanup };
};

test('a session is armed until the real recorder confirms start', async () => {
  const ctx = await create();
  try {
    ctx.session.connected();
    const result = await ctx.session.arm({ duration_seconds:90, bpm:180, style:'jungle' });
    assert.equal(result.status,'armed');
    assert.equal(result.recording_state,'inactive');
    assert.equal(result.target_duration_seconds,90);
    assert.equal(result.engine_connected,true);
    assert.equal(ctx.messages.find(m => m.type==='arm').target_seconds,90);
    await assert.rejects(() => ctx.session.evaluate('s("bd")'),/not recording/);
    ctx.session.onMessage({ type:'recording_started', session_id:ctx.session.id });
    assert.equal(ctx.session.statusSnapshot().status,'running');
    assert.equal(ctx.session.statusSnapshot().recording_state,'recording');
  } finally { await ctx.cleanup(); }
});

test('browser ACK is required to commit code; rejection leaves last accepted code intact', async () => {
  let time=0;
  const ctx=await create(()=>time);
  try {
    ctx.session.connected();
    await ctx.session.arm();
    ctx.session.onMessage({ type:'recording_started', session_id:ctx.session.id });
    const a=ctx.session.evaluate('s("bd*4")','first motif');
    const id=ctx.messages.at(-1).request_id;
    assert.equal(ctx.session.activeCode,'');
    ctx.session.onMessage({type:'operation_ack',request_id:id,success:true});
    await a;
    assert.equal(ctx.session.activeCode,'s("bd*4")');
    assert.equal(ctx.session.revisions,1);
    const b=ctx.session.evaluate('thisIsInvalid(','broken change');
    ctx.session.onMessage({type:'operation_ack',request_id:ctx.messages.at(-1).request_id,success:false,error:'Unexpected token'});
    await assert.rejects(b,/Unexpected token/);
    assert.equal(ctx.session.activeCode,'s("bd*4")');
    assert.equal(ctx.session.revisions,1);
    time=700000;
    const snap=ctx.session.statusSnapshot();
    assert.equal(snap.remaining_seconds,0);
    assert.equal(snap.overrun_seconds,100);
    assert.equal(snap.status,'running');
  } finally { await ctx.cleanup(); }
});

test('finishing an armed session without audio never invents a WAV export', async () => {
  const ctx=await create();
  try {
    await ctx.session.arm();
    const ended=await ctx.session.finish();
    assert.equal(ended.finished,true);
    assert.equal(ended.recording_finalized,false);
    assert.deepEqual(ended.exports,[]);
    assert.equal(ended.status,'finished');
    ctx.session.recorder=null;
  } finally { await ctx.cleanup(); }
});

test('already-active sessions cannot be double-started and status time freezes after finish', async () => {
  let time=1000;
  const ctx=await create(()=>time);
  try {
    await ctx.session.arm();
    await assert.rejects(()=>ctx.session.arm(),/already active/i);
    ctx.session.onMessage({type:'recording_started',session_id:ctx.session.id});
    time=6000;
    ctx.session.engineConnected=false;
    await ctx.session.finish();
    const done=ctx.session.statusSnapshot().elapsed_seconds;
    time=9000000;
    assert.equal(ctx.session.statusSnapshot().elapsed_seconds,done);
  } finally { await ctx.cleanup(); }
});
