---
name: strudel-vocal-lab
description: Overlay recorded vocals and local TTS in real time; distinguish singing, speech samples and MIDI vocoder.
---

# Vocal Lab
1. Live overdub from prerecorded human singing: strudel_sample_import(path to wav/mp3), then strudel_vocal_play(sample filename, sync='bar', gain=.7, speed=1). This source feeds the same audible, visualized, recorded WebAudio bus.
2. Spoken speech: strudel_vocal_generate(text, sync='beat'), using installed Windows SAPI or espeak-ng on Linux. Not melodic singing or text-to-song. Replay its saved WAV for chops.
3. Switch Angel CTVOX bank: samples('github:switchangel/beginningtrance'); s("ctvox").n("<0 5 12 16>"). These 19 prepared WAVs are recordings, not TTS.
4. Shabda network speech synthesis: samples('shabda/speech:hello,forever') separate from local live TTS, depends on external fetch/CORS.
5. Her voc(key) custom function emits MIDI CC 34 for specific harmonizer/autotune gear, it does not produce recorded voice itself. stxt(text,pat) maps text to synth parameters, not speech.
Browser speechSynthesis must NOT be used as a recording fallback. Beat/bar alignment on local WAV is approximate, not sample-accurate scheduler synchronization. Check rights before distributing third-party vocals.
