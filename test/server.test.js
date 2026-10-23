import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveServer } from '../src/server.js';

test('localhost API enforces bearer auth and never exposes status to an unrelated website', async () => {
  const server=new LiveServer(0,'test-secret');
  await server.start();
  const port=server.http.address().port;
  const url='http://127.0.0.1:'+port+'/api/status';
  try {
    const denied=await fetch(url);
    assert.equal(denied.status,403);
    const accepted=await fetch(url,{headers:{authorization:'Bearer test-secret'}});
    assert.equal(accepted.status,200);
    assert.equal((await accepted.json()).status,'idle');
  } finally {
    await new Promise((resolve)=>server.http.close(resolve));
    server.wss.close();
  }
});
