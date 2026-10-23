#!/usr/bin/env node

import { Command } from 'commander';
import { getServerInstance } from '../src/server.js';
import { StandTerminalUI } from '../src/tui/terminal.js';
import { GENRE_PRESETS } from '../src/performer/presets.js';

const program = new Command();

program
  .name('strudel-live')
  .description('Strudel Live Stand - Autonomous Agent Performer & Recording Suite')
  .version('1.0.0');

program
  .command('stand')
  .description('Launch the live performer stand (Server + Browser + Terminal UI)')
  .option('-d, --duration <seconds>', 'Set target duration in seconds', '600')
  .option('-s, --style <genre>', 'Musical genre (darkwave, witch_house, techno)', 'darkwave')
  .option('-b, --bpm <number>', 'Tempo in BPM', '124')
  .option('-t, --title <name>', 'Set track title', 'Autonomous Live Session')
  .option('--autonomous', 'Enable autonomous progression director without waiting for agent')
  .action(async (opts) => {
    const duration = parseInt(opts.duration, 10);
    const bpm = parseInt(opts.bpm, 10);
    const server = getServerInstance(3883);

    console.log(`Starting Strudel Live Stand for [${opts.style.toUpperCase()}] (${Math.round(duration / 60)} min)...`);
    await server.startSession({
      duration_seconds: duration,
      style: opts.style,
      bpm: bpm,
      title: opts.title,
      open_window: true
    });

    const tui = new StandTerminalUI(server);
    tui.start();

    // If autonomous mode is enabled, run the preset progression curve
    if (opts.autonomous) {
      runAutonomousSet(server, opts.style, duration);
    }
  });

program
  .command('server')
  .description('Run only the background audio & WebSocket server')
  .option('-p, --port <number>', 'Port to listen on', '3883')
  .action(async (opts) => {
    const server = getServerInstance(parseInt(opts.port, 10));
    await server.start();
    console.log('Server running in daemon mode. Ready for Antigravity MCP control.');
  });

async function runAutonomousSet(server, style, totalSeconds) {
  const preset = GENRE_PRESETS[style] || GENRE_PRESETS.darkwave;
  const t = preset.templates;

  // Phase 1: Intro (0s)
  await server.evalCode(t.intro, 'Introductory dark atmospheric drone');
  await server.triggerVox('Система в сети. Тьма и пульс. Начинаем погружение.', { rate: -2 });

  // Phase 2: Exposition (~15% of duration)
  setTimeout(async () => {
    await server.evalCode(t.exposition, '4-on-the-floor beat kick-in with arpeggio');
    await server.triggerVox('Чувствуешь этот ритм? Он уже внутри тебя.', { rate: -2 });
  }, Math.max(8000, totalSeconds * 0.15 * 1000));

  // Phase 3: Escalation (~35% of duration)
  setTimeout(async () => {
    await server.evalCode(t.escalation, 'Driving drums & screaming resonant lead');
    await server.triggerVox('Перегрузка частот. Больше драйва, глубже в экстаз.', { rate: -1 });
  }, Math.max(16000, totalSeconds * 0.35 * 1000));

  // Phase 4: Peak (~65% of duration)
  setTimeout(async () => {
    if (t.peak) {
      await server.evalCode(t.peak, 'Maximum peak energy & bitcrush accents');
      await server.triggerVox('Максимальный пик. Никакого контроля.', { rate: -1 });
    }
  }, Math.max(24000, totalSeconds * 0.65 * 1000));

  // Phase 5: Epilogue (~85% of duration)
  setTimeout(async () => {
    if (t.epilogue) {
      await server.evalCode(t.epilogue, 'Epilogue: Deconstructing rhythm into dark reverberant space');
      await server.triggerVox('Растворяемся в пустоте. Тьма принимает тебя.', { rate: -3 });
    }
  }, Math.max(32000, totalSeconds * 0.85 * 1000));

  // Phase 6: Outro & Stop (~95% of duration)
  setTimeout(async () => {
    if (t.outro) await server.evalCode(t.outro, 'Final fading resonance');
    setTimeout(async () => {
      await server.stopSession();
    }, 8000);
  }, Math.max(38000, totalSeconds * 0.95 * 1000));
}

program.parse(process.argv);
