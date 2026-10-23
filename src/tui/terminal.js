import readline from 'readline';

export class StandTerminalUI {
  constructor(server) {
    this.server = server;
    this.interval = null;
  }

  start() {
    process.stdout.write('\x1b[?25l'); // Hide cursor
    this.render();
    this.interval = setInterval(() => this.render(), 500);

    process.on('SIGINT', () => {
      this.stop();
      process.exit();
    });
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write('\x1b[?25h'); // Restore cursor
    process.stdout.write('\n');
  }

  render() {
    const s = this.server.getStatus();
    const width = Math.min(process.stdout.columns || 80, 90);

    const elapsedStr = this.formatTime(s.elapsed_seconds);
    const totalStr = this.formatTime(s.duration_total_seconds);
    const pct = s.progress_percent || 0;

    // Build progress bar
    const barWidth = 24;
    const filled = Math.min(barWidth, Math.round((pct / 100) * barWidth));
    const empty = barWidth - filled;
    const barStr = `\x1b[36m${'█'.repeat(filled)}\x1b[90m${'░'.repeat(empty)}\x1b[0m`;

    const lines = [];
    lines.push('\x1b[2J\x1b[H'); // Clear screen & move home
    lines.push('\x1b[35m' + '═'.repeat(width) + '\x1b[0m');
    lines.push(`\x1b[1;36m  ⚡ STRUDEL LIVE STAND - AUTONOMOUS AGENT PERFORMER ⚡\x1b[0m`);
    lines.push('\x1b[35m' + '═'.repeat(width) + '\x1b[0m');
    lines.push(`  \x1b[1mTRACK:\x1b[0m \x1b[33m${s.title}\x1b[0m [\x1b[35m${s.style.toUpperCase()}\x1b[0m] | \x1b[1mBPM:\x1b[0m \x1b[32m${s.bpm}\x1b[0m`);
    lines.push(`  \x1b[1mSTATUS:\x1b[0m \x1b[32m● RECORDING LIVE\x1b[0m  |  \x1b[1mPHASE:\x1b[0m \x1b[33m${s.phase}\x1b[0m`);
    lines.push(`  \x1b[1mTIME:\x1b[0m   [${barStr}] \x1b[1;36m${elapsedStr}\x1b[0m / ${totalStr} (\x1b[35m${pct}%\x1b[0m)`);
    lines.push('\x1b[90m' + '─'.repeat(width) + '\x1b[0m');
    lines.push('  \x1b[1;34mACTIVE STRUDEL CODE:\x1b[0m');

    if (s.active_code) {
      const codeLines = s.active_code.split('\n').slice(0, 8);
      for (const cl of codeLines) {
        lines.push(`  \x1b[36m│\x1b[0m  \x1b[37m${cl}\x1b[0m`);
      }
    } else {
      lines.push('  \x1b[90m(Standby... Awaiting agent evaluation)\x1b[0m');
    }

    lines.push('\x1b[90m' + '─'.repeat(width) + '\x1b[0m');
    lines.push('  \x1b[1;34mLIVE AGENT & VOX LOG:\x1b[0m');

    if (s.recent_logs && s.recent_logs.length > 0) {
      for (const log of s.recent_logs) {
        const timeTag = `\x1b[36m[${log.time}]\x1b[0m`;
        const msgText = log.isVox 
          ? `\x1b[35m${log.message}\x1b[0m` 
          : `\x1b[37m${log.message}\x1b[0m`;
        lines.push(`  ${timeTag} ${msgText}`);
      }
    } else {
      lines.push('  \x1b[90mNo events yet\x1b[0m');
    }

    lines.push('\x1b[35m' + '═'.repeat(width) + '\x1b[0m');
    lines.push(`  \x1b[90mPress Ctrl+C to stop performance and finalize master recording\x1b[0m\n`);

    process.stdout.write(lines.join('\n'));
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
