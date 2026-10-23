# Audit of original v1 (before refactor)

1. Timed presets in runAutonomousSet used setTimeout at fixed percentages and canned speech. No original agent decisions.
2. Opening the monitor through the MCP 'stand' command launched another server/session and could collide on port 3883.
3. MCP used a hard-coded Windows F:\\projects\\STRUDEL_LIVE local path; not portable.
4. The browser audio tap intercepted AudioNode.prototype.connect but also performed the original direct connection, leading to potential double master routing / unreliable capture. MediaRecorder was lossy Opus while README claimed uncompressed 24-bit WAV.
5. Stop waited a fixed 1.2 seconds instead of recording_done; audio chunks could be truncated.
6. Eval returned success immediately after sending WebSocket message rather than waiting for browser evaluate result. Failure could wrongly overwrite active state.
7. Windows speech synthesis Powershell command assembled arbitrary text into shell source; apostrophe replacement alone did not safely escape it.
8. Fallback window.speechSynthesis speech did not enter the WebAudio recording bus.
9. Client clock displayed a fake hardcoded phase name based on elapsed fraction, even if the music had not changed.
10. Styles described as 'darkwave/witch_house/techno' masked the hardwired templates, limiting real improvisation.
11. No Codex MCP install instructions or project-scoped Agent Skills, and no tests.

The rewrite removes the scheduled preset director, splits MCP transport from the session daemon and introduces explicit real state and ACKs, an authenticated loopback port, central captured voice bus, JSONL score, agent-aware epilogue and Codex CLI autopilot.
