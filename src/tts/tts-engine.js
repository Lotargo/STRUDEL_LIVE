import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function generateSpeechWav(text, outputPath, options = {}) {
  const rate = options.rate ?? -2; // slightly slower for darkwave feel
  const isCyrillic = /[а-яА-ЯёЁ]/.test(text);
  const voice = options.voice || (isCyrillic ? 'Microsoft Irina Desktop' : 'Microsoft Zira Desktop');
  
  // Clean text of quotes
  const safeText = text.replace(/'/g, "''").replace(/"/g, ' ');
  
  const psScript = `
Add-Type -AssemblyName System.Speech;
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synth.Rate = ${rate};
${voice ? `$synth.SelectVoice('${voice}');` : ''}
$synth.SetOutputToWaveFile('${outputPath.replace(/\\/g, '/')}');
$synth.Speak('${safeText}');
$synth.Dispose();
`;

  await execAsync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ')}"`);
  return fs.existsSync(outputPath);
}

// Quick self-test if run directly
if (process.argv[1]?.endsWith('test-tts.js')) {
  const testFile = path.resolve('./test_tts_out.wav');
  console.log('Testing TTS generation...');
  await generateSpeechWav('System online. Awaiting algorithmic instructions.', testFile);
  console.log('Result file exists:', fs.existsSync(testFile), 'Size:', fs.statSync(testFile).size);
  fs.unlinkSync(testFile);
}
