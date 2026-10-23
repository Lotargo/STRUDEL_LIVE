---
name: strudel-pattern-engine
description: Use controlled Strudel pattern transformations like every, iter, jux, chunk, off and hurry.
---

# Pattern transformations
Start from an actual motif and add one transformation at a time. Known useful functions include .fast(2), .slow(2), .hurry(2), .iter(4), .jux(rev), .every(4,x=>x.fast(2)), .off(1/8,x=>x.fast(2)), and .chunk(4,x=>x.rev()). Validate support in running version; if a method fails, use a conservative compatible alternative. Repetition must be recognizable, with occasional surprising changes. Record the musical intent in strudel_eval(comment).
