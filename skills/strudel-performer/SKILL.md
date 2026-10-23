---
name: strudel-performer
description: Live-code, compose, and autonomously perform music in Strudel with real-time audio playback, synthetic vocals, progressive live escalation, time-aware transitions, and master audio recording.
---

# Strudel Live Performer Guide

Use this skill whenever the user wants to compose music, jam, or perform a live algorithmic set in Strudel (e.g. darkwave, witch house, dark electro, cyberpunk, techno).

---

## 1. Core Workflow

A live set is not a static script — it is an evolving performance. You have direct control of the live audio engine, an interactive visualizer stand, continuous stereo recording, and on-demand synthetic vocals.

### Step 1: Initialize Session
Call `strudel_session_start`:
```json
{
  "duration_seconds": 600,
  "style": "darkwave",
  "bpm": 124,
  "title": "Neon Requiem",
  "open_terminal": true,
  "open_browser": true
}
```
This boots the server, launches the stand visualizer and desktop terminal, and starts recording to high-fidelity audio.

### Step 2: Establish the Foundation (Phase 1: Atmosphere)
Evaluate the opening pattern using `strudel_eval`:
```js
stack(
  note("<c1 eb1>").s("sawtooth").cutoff(250).resonance(4).gain(0.85),
  note("<c3 eb3 g3 c4>").s("triangle").cutoff(400).room(0.8).slow(4).gain(0.4)
).cpm(124/2)
```
Optionally introduce the track with a synthetic voice drop via `strudel_vox`:
`strudel_vox({ text: "System online. Inhale the digital void.", rate: -2 })`

### Step 3: Schedule the Next Evolution
Use AGY's `schedule` tool to wake up at the next transition point:
```json
{
  "DurationSeconds": 45,
  "Prompt": "[STRUDEL_TICK] Time elapsed: ~45s. Phase 2 (Groove Exposition). Add 4-on-the-floor kick, offbeat hats, and melodic bass arpeggio."
}
```

### Step 4: Follow the Performance Dramaturgy
When you wake up, check `strudel_session_status` to inspect elapsed time and remaining duration, then progress the track:

| Progress | Phase | Musical Actions |
| :--- | :--- | :--- |
| **0% – 15%** | **Phase 1: Atmosphere** | Deep bass drone (saw/sine 35–50 Hz), cold triangle pads, dark texture. Keep drums absent or minimal. |
| **15% – 35%** | **Phase 2: Groove Exposition** | 4-on-the-floor 909 kick (`s("bd*4")`), driving bass arpeggio (`sawtooth`), filtered hats. Spoken vocal intro. |
| **35% – 65%** | **Phase 3: Escalation** | Full drums with snare/clap (`s("[~ sd]*2")`), open lowpass filter (`cutoff(800 -> 1200)`), resonant square lead, vocal phrases. |
| **65% – 82%** | **Phase 4: Climax / Peak** | Maximum energy! 16th hats, overdrive/bitcrush (`crush(6)`), dual delay arpeggios, vocal chorus hook. |
| **82% – 94%** | **Phase 5: Epilogue** | **Deconstruction!** Strip out kicks and snares. Open vast cathedral reverbs (`room(0.95)`), slow down bass to fading drone. Intimate whisper vox. |
| **94% – 100%** | **Phase 6: Outro & Resolution** | Final resonant chord decay into silence. Let tails fade naturally. |

### Step 5: Conclude & Export
Call `strudel_session_stop`.
This silences playback, finalizes the recording, transcodes it to 24-bit WAV and 320k MP3 via ffmpeg, and outputs the exact file paths.

---

## 2. Strudel Live Syntax Cheatsheet

### Drum Patterns
```js
s("bd*4")                                  // 4-on-the-floor kick
s("[~ sd]*2")                              // Backbeat snare
s("~ hh*2 ~ hh*2")                         // Filtered offbeat hi-hats
s("bd*4, [~ sd]*2, [hh*8], [~ cp]*2")      // Full driving groove
```

### Synths & Basslines
```js
// Sawtooth bass with resonant lowpass filter
note("<[c2 c2] [eb2 c2] [f2 g2] [bb1 g1]>")
  .s("sawtooth")
  .cutoff(600)
  .resonance(7)
  .gain(0.9)

// High arpeggiated lead with stereo delay
note("<[c4 eb4 g4 bb4] [c5 bb4 g4 eb4]>")
  .s("square")
  .cutoff(1600)
  .room(0.7)
  .delay(0.35)
  .delayfeedback(0.5)
  .gain(0.65)
```

### Essential Audio Modifiers
- `.cpm(124/2)`: Sets tempo (cycles per minute). For 4/4 beats, CPM is usually BPM / 2.
- `.cutoff(Hz)`: Lowpass filter frequency (200 to 8000 Hz).
- `.resonance(Q)`: Filter resonance sharpness (0 to 12).
- `.room(0 to 1)`: Reverb mix amount.
- `.size(0 to 1)`: Reverb room dimensions.
- `.delay(0 to 1)`: Stereo delay send.
- `.delayfeedback(0 to 0.95)`: Number of delay echoes.
- `.crush(1 to 16)`: Bitcrusher amplitude reduction for industrial texture.
- `.gain(0 to 1.5)`: Channel volume.
- `.pan(0 to 1)`: Stereo position (0 = Left, 0.5 = Center, 1 = Right).
