---
name: strudel-rhythm-lab
description: Create musical drum grooves with syncopation, subdivisions, Euclidean rhythms and evolving density.
---

# Rhythm Lab
Build kick and backbeat first, add syncopated hats, ghost notes and expressive rests. Avoid filling every subdivision by default. For a 4/4 groove:
```js
stack(s("bd*4").gain(.7),s("~ sd ~ sd").gain(.5),s("hh*8").gain(.24),s("cp(3,8)").gain(.16)).cpm(160/4)
```
Try nested [] subdivisions and k/n Euclidean accents when useful. Consider melodic bass and kick alignment. Build repetition with deliberate variation rather than refreshing random numbers every cycle.
