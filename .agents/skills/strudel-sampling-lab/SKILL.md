---
name: strudel-sampling-lab
description: Load GitHub Strudel sample manifests, create sample chops and play imported local recordings.
---

# Sampling Lab
Only use samples('github:user/repo') if root strudel.json exists. Confirmed sample banks: github:switchangel/breaks (s("breaks"), 5), github:switchangel/pad (s("swpad"), 5), github:switchangel/beginningtrance (s("ctvox"), 19). Use n("0 1") to select sample indices (zero-based). For slices use .slice, .chop or .scrub; scrub positions are normalized 0..1. Do not download hundreds of megabytes live without warning. For local files import with strudel_sample_import, then overlay via strudel_vocal_play through the captured bus. See https://strudel.cc/learn/samples/.
