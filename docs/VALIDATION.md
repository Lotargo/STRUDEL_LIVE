# Test matrix

Automated tests in test/ should be run after npm install (this environment could not fetch npm packages or launch the user's audio browser):

~~~bash
npm install
npm test
npm run check
~~~

## Manual smoke test in Chrome/Edge

1. Run node bin/strudel-live.js stand --duration 90 --style jungle --bpm 168.
2. Click ENABLE AUDIO + START RECORDING. Status must switch armed → running; recorder_state recording and elapsed must increase.
3. Connect Codex/AGY MCP; strudel_eval with examples/darkwave-opening.strudel content. Verify audible audio and ACK, version increment.
4. Submit deliberately invalid Strudel code. Expect MCP error, no increment of last accepted revision. Restore valid code if audible output is affected.
5. Import a small human vocal WAV with strudel_sample_import and play it at sync=bar. Listen through speakers and verify waveform/meter. Do NOT use speechSynthesis.
6. Verify status remaining_seconds decreases. Continue past target for a moment: clock should report overrun but never abruptly hush.
7. Author a resolving pattern and call session_finish with fade_seconds 3. Ensure final audio chunk and WebM file exist. If ffmpeg installed, WAV and MP3 paths must be real files.
8. Play back exported recording; audible Strudel **and** vocal sample must be present with no missing last tail.
9. Close read-only monitor: recording must remain active; repeated MCP tool calls must not bind a second port.
10. Try Chrome/Edge with CDN blocked: browser shows ENGINE FAILED; no false 'recording' status.

## Risks to address in hardware/browser QA
- @strudel/web is loaded from pinned CDN; network required.
- AudioNode.prototype.connect interception must remain compatible with 1.3.0.
- Browser WebM/Opus chunks have lossy codec; WAV transcoding is not bit-perfect raw PCM.
- Local voice time alignment is approximate.
- No headless automated audio audition was done.
