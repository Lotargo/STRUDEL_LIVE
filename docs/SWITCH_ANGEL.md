# Switch Angel: research for practical Strudel Live

Sources examined: YouTube tutorial 3 https://www.youtube.com/watch?v=dcmwqqzJubA and the 8th video https://www.youtube.com/watch?v=xAAbQMW0dFk plus GitHub https://github.com/switchangel and public manifests.

## Video 3: jungle breaks and pads
The performer provides equal-length two-cycle breaks and sampled Serum pads, and uses normalized scrub() to chop audio by position. She chooses and constrains randomness with ribbon/rib, then applies pitch and rhythmic variation; the resulting texture can be live-controlled rather than fully prearranged. Known source banks:
- https://github.com/switchangel/breaks: strudel.json key \`breaks\`, 5 WAV files.
- https://github.com/switchangel/pad: key \`swpad\`, 5 WAV files.
- https://github.com/switchangel/beginningtrance: key \`ctvox\`, 19 WAV files, including a sing-bounce file.
- https://github.com/switchangel/sxd: guitar WAVs; no verified root strudel.json, so do not suggest github shortcut blindly.

## Video 8: actual mastering workflow
She describes recording material from Strudel, usually each loop separately, into **Logic** and assembling the final song there. The advantage is choosing among random takes, mixing stems and editing without performing the code again. This is not an explanation of live voice synthesis. The user's observed singing in other videos is compatible with recording/capturing human vocal material; the precise processing chain cannot be inferred from this short video.

## What her extensions do
https://github.com/switchangel/strudel-scripts/blob/main/prebake.strudel has helper functions ar, cue, tranche/trancegate, glitch, sf and other musical code. In particular:
- voc(key): sends MIDI CC 34 to a named hardware output 'tout', matching an external harmonizer key mapping; it does not generate speech or singer vocal audio by itself.
- stxt(text, pat): maps text bytes into synth settings. Text-seeded synthesis is NOT text-to-speech.

For this project the user can supply a singing/speech WAV, Strudel can transform it, and the central WebAudio capture bus records the live overlay. Local TTS generates additional **spoken** snippets. No claim of voice-cloning or auto-singing capability.
