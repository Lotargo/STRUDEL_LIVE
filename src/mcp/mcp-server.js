import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { command } from '../client.js';

const object = (properties, required = []) => ({ type: 'object', properties, required });
const str = (description) => ({ type: 'string', description });
const num = (description) => ({ type: 'number', description });
const bool = (description) => ({ type: 'boolean', description });
const tools = [
  {
    name: 'strudel_session_start',
    description: 'Arm a REAL live Strudel composition + recording session. Returns browser URL. User must unlock audio in browser; check status until running before sending code. No templates are played.',
    inputSchema: object({
      duration_seconds: num('Target performance duration, 30-14400 seconds. A target, never an automatic cutoff.'),
      style: str('Any musical description, e.g. darkwave, witch house, jungle.'),
      bpm: num('Tempo in 4/4 beats per minute; musical cycles equal four beats.'),
      title: str('Title of the improvisation.'),
      open_browser: bool('Open stand in default browser (default true).'),
      open_terminal: bool('Open an optional read-only terminal monitor (default false).')
    })
  },
  {
    name: 'strudel_session_status',
    description: 'Musical clock and recording reality: elapsed, remaining, overruns, approximate bar, actual approved code, RMS/peak, events and epilogue guidance. Always inspect before major decisions.',
    inputSchema: object({})
  },
  {
    name: 'strudel_eval',
    description: 'Apply a newly authored full Strudel JavaScript score to the active performance. Returns success ONLY after browser acknowledges evaluation; failed evaluations preserve server-side last known good code. Do not use preset scheduling.',
    inputSchema: object({ code: str('Complete Strudel program; use setcpm(bpm/4) once for 4/4.'), comment: str('Your musical decision and intended audible difference.') }, ['code'])
  },
  {
    name: 'strudel_sample_import',
    description: 'Import a LOCAL authorized audio sample into the capture/mix bus library (max 25 MB; wav, mp3, ogg, webm). Can be replayed on beat or bar.',
    inputSchema: object({ path: str('Absolute path of an existing local audio file'), name: str('Optional simple destination filename with extension') }, ['path'])
  },
  {
    name: 'strudel_vocal_play',
    description: 'Play previously imported voice/sample through the SAME monitored and recorded WebAudio bus as Strudel. Beat/bar synchronization available.',
    inputSchema: object({
      sample: str('Imported sample filename'),
      gain: num('Gain 0-2, default 0.7'),
      speed: num('Playback speed/pitch ratio 0.25-4'),
      sync: str('now, beat (default), or bar')
    }, ['sample'])
  },
  {
    name: 'strudel_vocal_generate',
    description: 'Generate spoken WAV with an available local TTS engine (Windows SAPI / Linux espeak-ng), then play on the shared recorded audio bus. Not singing or text-to-song.',
    inputSchema: object({
      text: str('Speech text <=250 characters'),
      rate: num('SAPI speed -10..10'),
      voice: str('Installed Windows voice ID, optional'),
      gain: num('Gain 0..2'),
      speed: num('Sample playback speed ratio 0.25..4'),
      sync: str('now, beat or bar')
    }, ['text'])
  },
  {
    name: 'strudel_session_finish',
    description: 'Agent-controlled epilogue finish. Fades for requested seconds, waits for recorder final chunk and finalizes source WebM; converts to WAV/MP3 if ffmpeg exists. Does NOT run at deadline automatically.',
    inputSchema: object({ fade_seconds: num('Finish fade after musical resolution, 0.2..20 seconds; default 4') })
  }
];
const aliases = { strudel_vox: 'strudel_vocal_generate', strudel_session_stop: 'strudel_session_finish' };
const map = {
  strudel_session_start: 'session_start', strudel_session_status: 'session_status',
  strudel_eval: 'eval', strudel_sample_import: 'sample_import',
  strudel_vocal_play: 'sample_play', strudel_vocal_generate: 'vocal_generate',
  strudel_session_finish: 'session_finish'
};
const mcp = new Server({ name: 'strudel-live', version: '2.0.0' }, { capabilities: { tools: {} } });
mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = aliases[request.params.name] || request.params.name;
  const action = map[name];
  if (!action) return { isError: true, content: [{ type:'text', text:'Unknown tool: ' + name }] };
  try {
    const args = request.params.arguments || {};
    const result = await command(action, args);
    return { content: [{ type:'text', text:JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { isError: true, content: [{ type:'text', text:'Strudel Live: ' + error.message }] };
  }
});
await mcp.connect(new StdioServerTransport());
