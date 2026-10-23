---
name: strudel-switchangel-extensions
description: Analyze Switch Angel external Strudel prebake custom functions and external vocoder MIDI mapping.
---

# Switch Angel Extensions
Reference: https://github.com/switchangel/strudel-scripts/blob/main/prebake.strudel. Extension includes cue/ar arranging, trancegate/tgate, glitch, humanize, bend, chord helpers, sf old-school stretch via scrub, text-seeded stxt timbre and voc MIDI routing. stxt maps UTF-8 text bytes to sound parameters; it's NOT text-to-speech. voc maps keys to MIDI CC 34, output device 'tout', configured for her hardware; it's NOT a synthesizer for vocal waveforms. Do not blindly import the entire third-party preload or assume external ports on another computer. Implement portable core Strudel first; check license/version and test custom functions explicitly before live use.
