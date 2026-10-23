---
name: strudel-foundations
description: Create valid Strudel mini-notation, sample phrases, 4/4 tempo and stacked instrument patterns.
---

# Strudel foundations
Mini notation: whitespace distributes events over a cycle; [a b] subdivides; <a b> alternates cycles; ~ rests; *n repeats; /n slows; :n selects index; ? randomly drops. s("bd sd hh oh") plays samples, note("c3 eb3 g3") plays pitches and stack(...) layers patterns. Use .cpm(bpm/4) for conventional 4/4, e.g. 120 BPM -> 30 CPM, a 2-second bar. Older advice bpm/2 is not right for four beats per cycle. Code runs through Strudel evaluate(), not arbitrary shell. See https://strudel.cc/learn/mini-notation/.
