# ⚡ Strudel Live Stand (AGY Plugin)

An autonomous algorithmic music performer stand for Antigravity (AGY) powered by [Strudel](https://strudel.cc) and TidalCycles.

## Features

- **Live Real-time Playback**: Web Audio synthesis directly through speakers via automated Chrome/Edge runner.
- **Cyberpunk Visualizer Stand**: Dedicated desktop window showing 60 FPS oscilloscope, spectrum analyzer, digital timer, and active pattern buffer.
- **Live Coding TUI Terminal**: Terminal dashboard displaying live track clocks, progression phases, and performer event logs.
- **Continuous Stereo Recording**: Captures the entire performance from intro to outro into uncompressed 24-bit WAV and 320k MP3 (via ffmpeg).
- **Synthetic Vocal Drops**: Generates and synchronizes real-time speech synthesis (`strudel_vox`) directly into the musical mix.
- **Time-Aware Dramaturgy**: Tracks elapsed/remaining time, escalates layers smoothly across 6 phases, and crafts a proper epilogue before closing.

## Installation into Antigravity (AGY)

This plugin is installed into `~/.gemini/config/plugins/strudel-live/`.
All skills, rules, and MCP tools are automatically exposed in AGY sessions.

## Commands

- `node ./bin/strudel-live.js stand --duration 600 --style darkwave`: Launch the live stand locally.
- `node ./bin/strudel-live.js server`: Run background control server.
