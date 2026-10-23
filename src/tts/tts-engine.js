import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';

const run = (bin, args, timeoutMs = 20000) => new Promise((resolve, reject) => {
  const child = spawn(bin, args, { windowsHide: true, stdio: 'ignore' });
  const timer = setTimeout(() => child.kill(), timeoutMs);
  child.once('error', (error) => { clearTimeout(timer); reject(error); });
  child.once('close', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(bin + ' returned ' + code)); });
});
export async function generateSpeechWav(text, outputPath, options = {}) {
  if (typeof text !== 'string' || !text.trim() || text.length > 250) throw new Error('Text length 1..250');
  const rate = Math.min(10, Math.max(-10, Math.round(Number(options.rate) || -1)));
  if (process.platform === 'win32') {
    // Encode text and voice separately; never interpolate untrusted text into PowerShell source.
    const text64 = Buffer.from(text, 'utf16le').toString('base64');
    const voice64 = Buffer.from(String(options.voice || ''), 'utf16le').toString('base64');
    const path64 = Buffer.from(outputPath, 'utf16le').toString('base64');
    const script = [
      'Add-Type -AssemblyName System.Speech',
      '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
      '$s.Rate = ' + rate,
      '$v = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("' + voice64 + '"))',
      'if ($v) { $s.SelectVoice($v) }',
      '$p = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("' + path64 + '"))',
      '$t = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("' + text64 + '"))',
      '$s.SetOutputToWaveFile($p)', '$s.Speak($t)', '$s.Dispose()'
    ].join('; ');
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')]);
  } else if (process.platform === 'linux') {
    await run('espeak-ng', ['-w', outputPath, '-s', String(Math.max(90, 175 + rate * 12)), '--', text]);
  } else {
    throw new Error('No built-in WAV TTS on ' + os.platform() + '; import a prerecorded WAV instead');
  }
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 44) throw new Error('TTS did not produce audio');
  return outputPath;
}
