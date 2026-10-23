# Architecture / events / truth conditions

```text
AGY MCP client  ─────┐
                     ├─ stdio MCP (thin proxy) ── private loopback HTTP API
Codex MCP client ────┘                                 │
Codex CLI autopilot ─► real agent turns                │
                                                       ▼
                                          Persistent Node controller
                                          monotonic clock / JSONL log
                                          pending request-ID & ACK map
                                                       │
                                            authenticated WebSocket
                                                       │
                                                       ▼
                                   Browser Strudel @strudel/web 1.3.0
                                   WebAudio source destination patch
                                               │
                                         capture bus input
                                          /          \
                                        output      analyser
                                          |
                                    MediaRecorder WebM/Opus
                                          |
                              ordered binary WebSocket chunks → .webm
                                                       │
                                  Node waits recording_done then closes
                                                       │
                                    optional ffmpeg WAV/MP3 transcode
```

## Key invariants

1. Single daemon owns state; MCP never creates a second performance when launching monitor.
2. Status goes idle → armed → running → finishing → finished. **Only** an actual browser MediaRecorder start produces running.
3. Every evaluation has request_id. Client reports success only after browser evaluate resolves and sends operation_ack. Server stores last accepted full code; rejected code is recorded as an error without rewriting the last acknowledged version.
4. No hard countdown stop. The deadline supplies guidance and negative overrun telemetry while audio continues until explicit finish.
5. Vocal samples and TTS WAV route to the same bus as Strudel. Browser WebSpeech is deliberately not used.
6. MediaRecorder onstop waits asynchronously dispatched chunks; recording_done follows the final binary chunk on the same ordered WebSocket. Node closes the stream before calling ffmpeg.
7. Auth token is a random per-daemon secret stored at ~/.strudel-live/runtime.json (0600 where supported); HTTP uses Bearer, browser URL & WebSocket use query token with localhost Origin check. Server binds 127.0.0.1 only.
8. JSONL is append-only within one session; each accepted revision stores code and comment. It is a performance diary, not separate stems.

## Supported voice paths

- Author's recorded singing/speech WAV via strudel_sample_import, then strudel_vocal_play beat/bar. This is the recommended real-time vocal workflow.
- OS local TTS returns an audio **file** (safe PowerShell EncodedCommand on Windows, espeak-ng on Linux). It is spoken, not sung.
- Strudel external sample bank ctvox, possibly processed via native s/slow/chop/scrub functions.
- Switch Angel's MIDI CC 34 harmonizer key maps use her hardware, not available automatically.

## Playback constraints

WebAudio routing is intercepted in the page before Strudel init to feed a single capture bus. This is more predictable than the old tap that silently doubled the direct connection, but browser integration still requires real manual audition and test recording. Browser auto-play restrictions are **not** bypassed. CDNs and remote WAVs need network; status/recording failures are not disguised.
