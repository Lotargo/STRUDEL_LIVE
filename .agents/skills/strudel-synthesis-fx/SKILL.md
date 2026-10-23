---
name: strudel-synthesis-fx
description: Design evolving analog-style bass, pad and lead timbres using native Strudel synthesis and effects.
---

# Synthesis & FX
Prefer a limited tonal palette. Sine sub, lowpassed saw bass, triangle/supersaw pad, square lead. Control filters with .lpf / .hpf, envelopes with .attack / .decay, spatialization with .room / .delay. Balance output gain so peaks don't clip. Example:
```js
stack(note("<c2 c2 eb2 g1>").s("sawtooth").lpf("<280 600 850 350>").gain(.45),note("<[c4,eb4,g4] [ab3,c4,eb4]>").s("triangle").room(.5).slow(2).gain(.24)).cpm(118/4)
```
Leave spectral space for live voice overlays; voice imported via live tools is separate from Strudel's DSP but in the same recorded master bus.
