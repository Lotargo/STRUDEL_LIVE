---
name: strudel-live-performer
description: Autonomous live performance using Strudel MCP, continuous recording, true browser ACK and time-aware ending.
---

# Live Performer
1. Call strudel_session_start, then poll strudel_session_status until status=running. Armed is not recording; user must click browser to unlock audio.
2. Read elapsed_seconds, remaining_seconds, recent_events, active_code before making any change. This is an original improvisation, never a replay of templates or a fixed timeline.
3. Every strudel_eval sends a COMPLETE replacement score. Retain coherent previous layers, alter them intentionally, and check real browser ACK. On failure, repair and retry.
4. For standard 4/4 use .cpm(bpm/4) on the entire stack. A cycle is four beats. E.g. stack(s("bd*4,~ sd ~ sd"),note("<c2 eb2>").s("sawtooth").lpf(700)).cpm(124/4).
5. Vocal WAV: strudel_sample_import then strudel_vocal_play, sync=bar|beat. Spoken local TTS: strudel_vocal_generate. Captured voice uses the same WebAudio bus.
6. When approaching the target, create harmonic resolution, remove layers gradually, let effects tails decay and call strudel_session_finish. Deadline is soft; no automatic cutoff. For Codex autopilot, finish each active turn with NEXT_TICK_SECONDS=8..50, or PERFORMANCE_FINISHED after successful finish.
7. WebM Opus is the actual recorded source; transcoding to WAV does not make source lossless. Session JSONL records confirmed revisions.
