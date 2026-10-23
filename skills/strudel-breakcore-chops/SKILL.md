---
name: strudel-breakcore-chops
description: Implement Switch Angel-inspired jungle break chopping with scrub and repeatable constrained randomness.
---

# Jungle / Breakcore
Source tutorial: https://www.youtube.com/watch?v=dcmwqqzJubA. Switch Angel prepares two-cycle breaks and uses .scrub with normalized seek positions and patterned randomness, then ribbon/rib to capture an attractive random phrase. A portable deterministic alternative:
```js
samples('github:switchangel/breaks')
stack(s('breaks').n('<0@3 1>').scrub('<0 .125 .5 .75 .25 .375 .5 .875>').gain(.4),s('hh*8').gain(.2)).cpm(172/4)
```
Advanced idea, runtime verification needed: .scrub(irand(16).div(16).seg(8).rib(20,2)). Add rare stutters where supported with .almostNever(ply("<2 4>")). Don't claim a method is built-in when it is from personal prebake extensions.
