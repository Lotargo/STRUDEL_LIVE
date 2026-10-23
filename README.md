# STRUDEL LIVE v2 · Real Agent Performer

**A live musician, not timed preset playback.** Agy and Codex use an MCP plugin to compose and mutate Strudel code while a browser runs the sound engine and records a real stereo performance. A live audio clock gives the agent the time to build its own epilogue. The target duration never abruptly ends the music.

This is a ground-up rewrite of the original prototype. Old `runAutonomousSet` timers, duplicate monitor/session spawn and unrecorded browser WebSpeech fallback are removed.

## Requirements

- Node.js **20+**, npm, modern **Chrome/Edge** for WebM/Opus MediaRecorder
- Browser network access for pinned `@strudel/web@1.3.0` UMD and remote sample banks
- Optional `ffmpeg` on PATH for WAV 24-bit PCM container and MP3 320 kbps transcoding; the recorded source is **lossy WebM Opus**, not true 24-bit lossless audio
- For spoken TTS: Windows `System.Speech` or Linux `espeak-ng` (optional)
- For unattended **Codex** performance: installed, signed-in Codex CLI and registered MCP server

## Install / AGY / Codex

```bash
git clone https://github.com/Lotargo/STRUDEL_LIVE.git
cd STRUDEL_LIVE
npm install
npm test
node bin/strudel-live.js setup --client codex
```

The last command prints a **Codex registration command with your absolute local path**. Run it in your terminal (or configure `~/.codex/config.toml` as printed):

```bash
codex mcp add strudel-live -- node /ABSOLUTE/PATH/STRUDEL_LIVE/src/mcp/mcp-server.js
codex mcp list
```

Codex project-scoped Agent Skills live under `.agents/skills/`; root `AGENTS.md` supplies the performance protocol. Open Codex inside this project to discover them.

For Antigravity (AGY), run `node bin/strudel-live.js setup --client agy`. This produces a local, gitignored `mcp_config.local.json` containing the correct absolute node/script paths. Register that MCP server in your AGY plugin configuration and expose `plugin.json`, `skills/` and `rules/` as applicable to your AGY plugin installation. Example format: `mcp_config.example.json`. Unlike the original version, no `F:\\projects\\...` path is baked in.

## Launch

```bash
# Optional persistent background/foreground service; MCP also starts it if needed
npm start

# Browser stand + read-only terminal monitor
node bin/strudel-live.js stand --duration 600 --style darkwave --bpm 124

# Direct status, monitoring and intentional finalization
node bin/strudel-live.js status
node bin/strudel-live.js monitor
node bin/strudel-live.js finish --fade 5

# Real unattended Codex multi-turn performer (requires setup above)
node bin/strudel-live.js autopilot --duration 600 --style darkwave --bpm 124
```

**Browser audio gesture is mandatory.** The browser opens a local URL with a private token; click **ENABLE AUDIO + START RECORDING**. Until the browser confirms recording, MCP returns `armed`, not `running`. Do not close the browser or monitor during the performance; closing just the terminal monitor does not stop recording.

The Codex autopilot repeatedly invokes **real Codex CLI model turns**. Each turn inspects actual elapsed time / current code / musical history and calls MCP tools. This consumes model usage and is not a baked timeline. The agent chooses new musical actions and a next interval (8–50s). If Codex fails, recording stays active until the user or another agent intentionally finishes it. Agy has the same tools, but requires its own agent/scheduler to keep making turns; starting MCP alone does not create an unattended Agy loop.

## MCP tools

| Tool | What it really does |
| --- | --- |
| `strudel_session_start` | Arms session, launches browser, returns URL |
| `strudel_session_status` | Actual clock, recording/engine state, last successful code and events |
| `strudel_session_history` | Recent musical decisions for continuity over longer performances |
| `strudel_vocal_library` | Imported local vocal/sample inventory |
| `strudel_eval` | Apply complete Strudel code; wait for browser acceptance before returning success |
| `strudel_sample_import` | Copy local WAV/MP3/OGG/WebM into guarded sample library (25MB limit) |
| `strudel_vocal_play` | Overlay a recorded sample on beat/bar through stereo capture bus |
| `strudel_vocal_generate` | Generate local spoken WAV + overlay via the same bus (not singing) |
| `strudel_session_finish` | Agent requests final fade, recorder flush, exports and event log |

Remote bank examples: `samples('github:switchangel/breaks')`, `samples('github:switchangel/pad')`, `samples('github:switchangel/beginningtrance')`. Names are `breaks`, `swpad`, `ctvox`. See `examples/` and `docs/SWITCH_ANGEL.md`.

## What is preserved

The runtime writes `~/.strudel-live/recordings/<title>-<UUID>.webm` and a chronological `.jsonl` of accepted code / musical decisions, plus a latest `.strudel` source. With ffmpeg installed, also derived `.wav` and `.mp3`. Imported vocal files live in `~/.strudel-live/samples`. The browser's own audio and overdubs share a monitored and recorded bus.

An optional `monitor` process displays source version and time; it does **not** open another synthesizer or second recording.

## Technical limits

- Capture depends on a controlled interception of the WebAudio destination connection **before** `initStrudel()`; this integration must be tested against the pinned runtime in the user's browser. Do not assume sample-perfect or guaranteed capture in all browsers.
- Browser `MediaRecorder` emits **Opus chunks**, not lossless WAV. ffmpeg can transcode that to 24-bit WAV as a working format but cannot recover lost detail.
- Beat/bar sample alignment uses the local performance clock. It is approximate and not phase-locked to Strudel's audio scheduler.
- If the browser closes or audio fails, the agent sees engine status; server cannot fabricate missing audio.
- Real-time recording does not yet provide isolated multitrack stems, lyric-conditioned singing synthesis, external MIDI voice capture, or a visual piano-roll sequencer.
- Public Switch Angel WAVs remain in her repositories; confirm rights/licences independently before redistributing.
- @strudel/web is third-party **AGPL-3.0-or-later** software loaded from the CDN, not copied into this repository. This repository retains its prior ISC declaration for its own code. Check licence obligations when distributing combined builds.

Detailed architecture: `docs/ARCHITECTURE.md`. Original audit: `docs/AUDIT.md`. Testing checklist: `docs/VALIDATION.md`.
