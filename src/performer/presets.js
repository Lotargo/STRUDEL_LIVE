/**
 * Strudel Live - Darkwave & Electronic Genre Presets and Sound Definitions
 */

export const GENRE_PRESETS = {
  darkwave: {
    name: 'Darkwave / Coldwave',
    defaultBpm: 124,
    description: 'Sawtooth arpeggios, driving 4-on-the-floor kicks, cold whispered vocals, gated reverbs, icy pads',
    scales: ['c:minor', 'a:minor', 'd:phrygian', 'e:minor'],
    templates: {
      intro: `// [Phase 1: Darkwave Atmosphere / Intro]
stack(
  // Low sub bass drone
  note("<c1 eb1>").s("sawtooth").cutoff(250).resonance(4).gain(0.85),
  // Cold atmospheric texture
  note("<c3 eb3 g3 c4>").s("triangle").cutoff(400).room(0.8).size(0.9).slow(4).gain(0.4)
).cpm(124/2)`,

      exposition: `// [Phase 2: Exposition / Beat Kick-in]
stack(
  // 4-on-the-floor kick with punch
  s("bd*4").gain(1.1),
  // Filtered offbeat hats
  s("~ hh*2 ~ hh*2").gain(0.65).hcutoff(3000),
  // Hypnotic sawtooth bass arpeggio
  note("<[c2 c2] [eb2 c2] [g1 g1] [bb1 g1]>").s("sawtooth").cutoff(450).resonance(6).gain(0.9),
  // Atmospheric pad
  note("<[c3,eb3,g3] [bb2,d3,f3]>").s("triangle").room(0.8).slow(2).gain(0.45)
).cpm(124/2)`,

      escalation: `// [Phase 3: Escalation / Darkwave Drive]
stack(
  // Full drum machine kit (kick, snare, closed & open hats)
  s("bd*4, [~ sd]*2, [hh*4, ~ [~ oh]]").gain(1.0),
  // Driving modulated sawtooth bassline
  note("<[c2 c2] [eb2 c2] [f2 g2] [bb1 g1]>").s("sawtooth").cutoff(750).resonance(8).gain(0.95),
  // Aggressive cold lead
  note("<c4 [eb4 d4] [g4 f4] eb4>").s("square").cutoff(1200).resonance(5).delay(0.3).delayfeedback(0.4).gain(0.6),
  // Dark liturgical background choir pad
  note("<[c3,eb3,g3] [ab2,c3,eb3]>").s("sawtooth").cutoff(350).room(0.85).slow(2).gain(0.4)
).cpm(124/2)`,

      peak: `// [Phase 4: Climax / Maximum Darkwave Peak]
stack(
  // Relentless industrial rhythm with bitcrush accents
  s("bd*4, [~ sd]*2, [hh*8], [~ cp]*2").gain(1.15),
  // Distorted sawtooth bassline at full cutoff
  note("<[c2 c2] [eb2 c2] [f2 g2] [bb1 g1]>").s("sawtooth").cutoff(1400).resonance(9).gain(1.0),
  // Screaming lead arpeggio with stereo delay
  note("<[c4 eb4 g4 bb4] [c5 bb4 g4 eb4] [f4 ab4 c5 eb5] [d4 f4 bb4 d5]>").s("square").cutoff(2200).room(0.7).delay(0.35).delayfeedback(0.5).gain(0.7),
  // Industrial grit
  s("~ [rim*2 ~]").crush(6).gain(0.5)
).cpm(124/2)`,

      epilogue: `// [Phase 5: Epilogue / Deconstruction]
stack(
  // Stripped back kick heartbeat
  s("bd ~ ~ ~").gain(0.9),
  // Resonant bass drone fading down
  note("c1").s("sawtooth").cutoff(220).resonance(4).slow(2).gain(0.7),
  // Ethereal dissolving synth chords
  note("<[c3,eb3,g3] [ab2,c3,eb3] [bb2,d3,f3] [c3,eb3,g3]>").s("triangle").cutoff(500).room(0.95).size(0.95).slow(4).gain(0.6)
).cpm(124/2)`,

      outro: `// [Phase 6: Final Resolution / Outro]
stack(
  // Pure fading resonant harmonic
  note("c3").s("sine").room(0.98).size(0.98).slow(8).gain(0.4)
).cpm(124/2)`
    }
  },

  witch_house: {
    name: 'Witch House / Occult Dread',
    defaultBpm: 104,
    description: 'Seismic 30-40 Hz sub bass, chopped pitched-down vocal atmospheres, eerie detuned melodies, massive cathedral reverb',
    scales: ['c:minor', 'eb:minor', 'f:phrygian'],
    templates: {
      intro: `// [Phase 1: Witch House Atmosphere]
stack(
  // Deep sub drone
  note("c1").s("sine").gain(1.0),
  // Eerie detuned music box / glass chimes
  note("<c5 eb5 g5 bb5>").s("triangle").cutoff(1800).room(0.9).size(0.95).slow(2).gain(0.4)
).cpm(104/2)`,

      exposition: `// [Phase 2: Witch House Beat]
stack(
  // Heavy sliding 808 sub kick
  s("bd [~ bd] ~ [~ bd]").gain(1.1),
  // Trap snap / clap with deep reverb
  s("~ cp ~ cp").room(0.6).gain(0.85),
  // Pitch-bent sawtooth lead
  note("<[c3 c3] [eb3 d3] [bb2 c3] [g2 ~]>").s("sawtooth").cutoff(600).resonance(7).gain(0.75)
).cpm(104/2)`,

      peak: `// [Phase 3: Seismic Witch Climax]
stack(
  s("bd [~ bd] bd [~ bd]").gain(1.2),
  s("~ cp ~ [cp*2]").room(0.7).gain(0.9),
  s("hh*8").gain(0.55),
  note("<[c2 c2] [eb2 c2] [f2 eb2] [g2 bb2]>").s("sawtooth").cutoff(900).resonance(9).gain(1.0),
  note("<[c4 eb4 g4 c5] [bb3 d4 f4 bb4]>").s("square").cutoff(1600).room(0.85).delay(0.4).delayfeedback(0.5).gain(0.65)
).cpm(104/2)`,

      outro: `// [Phase 4: Witch House Dissolve]
note("<c3 eb3 g3 c4>").s("sine").room(0.99).size(0.99).slow(4).gain(0.5).cpm(104/2)`
    }
  },

  techno: {
    name: 'Dark Runway Techno',
    defaultBpm: 126,
    description: 'Relentless 4-on-the-floor, rolling rumble bass, metallic percussion, hypnotic machine sequencing',
    scales: ['c:minor', 'f:minor'],
    templates: {
      intro: `s("bd*4").gain(1.0).cpm(126/2)`,
      exposition: `stack(s("bd*4"), note("<[c2 c2] [c2 eb2]>").s("sawtooth").cutoff(400)).cpm(126/2)`,
      peak: `stack(s("bd*4, [~ sd]*2, [hh*8]"), note("<c2 [c2 eb2] f2 [g2 bb1]>").s("sawtooth").cutoff(1100).resonance(8)).cpm(126/2)`,
      outro: `note("c2").s("sawtooth").cutoff(250).slow(2).room(0.8).cpm(126/2)`
    }
  }
};
