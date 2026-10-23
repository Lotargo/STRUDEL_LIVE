import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerInstance } from '../server.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const server = getServerInstance(3883);

const mcpServer = new Server(
  {
    name: 'strudel-live',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'strudel_session_start',
        description: 'Start a live Strudel algorithmic music session with real-time audio playback, visualizer stand, continuous stereo recording, and progress timer.',
        inputSchema: {
          type: 'object',
          properties: {
            duration_seconds: {
              type: 'number',
              description: 'Target session duration in seconds (e.g. 600 for 10 minutes, 300 for 5 minutes).',
              default: 600,
            },
            style: {
              type: 'string',
              description: 'Musical style/genre: "darkwave", "witch_house", "techno", "cyberpunk", "ambient".',
              default: 'darkwave',
            },
            bpm: {
              type: 'number',
              description: 'Tempo in beats per minute (e.g. 124 for darkwave, 104 for witch house, 128 for techno).',
              default: 124,
            },
            title: {
              type: 'string',
              description: 'Track title or session name.',
              default: 'Darkwave Improvisation',
            },
            open_terminal: {
              type: 'boolean',
              description: 'Whether to open an external interactive terminal stand window on the desktop.',
              default: true,
            },
            open_browser: {
              type: 'boolean',
              description: 'Whether to open the cyber visualizer stand window.',
              default: true,
            },
          },
        },
      },
      {
        name: 'strudel_session_status',
        description: 'Get real-time telemetry from the live Strudel stand: elapsed seconds, remaining seconds, completion percentage, active phase recommendation, and currently playing code.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'strudel_eval',
        description: 'Hot-evaluate new Strudel JavaScript live-coding pattern into the running music stream seamlessly without stopping audio.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Strudel JavaScript code (e.g. `stack(s("bd*4"), note("<c2 eb2>").s("sawtooth")).cpm(124/2)`).',
            },
            comment: {
              type: 'string',
              description: 'Short description of this musical transition (e.g. "Adding 4-on-the-floor kick and opening sawtooth filter").',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'strudel_vox',
        description: 'Synthesize a vocal line or robotic phrase on-the-fly and inject it directly into the live audio mix and recording.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The phrase or lyrics to speak (e.g. "System overload. Inhale the digital shadow.").',
            },
            rate: {
              type: 'number',
              description: 'Speech speed (-10 to 10, default -2 for deep darkwave delivery).',
              default: -2,
            },
            voice: {
              type: 'string',
              description: 'Optional voice name (e.g. "Microsoft Zira Desktop" or "Microsoft David Desktop").',
            },
            gain: {
              type: 'number',
              description: 'Volume multiplier (default 1.2).',
              default: 1.2,
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'strudel_session_stop',
        description: 'Conclude the live coding performance, silence audio, finalize the recording, and transcode to master WAV and MP3 files via ffmpeg.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'strudel_session_start') {
      const res = await server.startSession({
        duration_seconds: args?.duration_seconds || 600,
        style: args?.style || 'darkwave',
        bpm: args?.bpm || 124,
        title: args?.title || 'Darkwave Improvisation',
        open_window: args?.open_browser !== false,
      });

      // Optionally launch external desktop terminal window
      if (args?.open_terminal !== false) {
        try {
          const cliScript = path.join(ROOT_DIR, 'bin', 'strudel-live.js');
          spawn('cmd.exe', ['/c', 'start', 'Strudel Live Stand', 'node', cliScript, 'stand', '--duration', `${args?.duration_seconds || 600}`, '--style', `${args?.style || 'darkwave'}`], {
            detached: true,
            stdio: 'ignore',
          });
        } catch (e) {
          console.error('Failed to spawn terminal window:', e);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }

    if (name === 'strudel_session_status') {
      const res = server.getStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }

    if (name === 'strudel_eval') {
      const res = await server.evalCode(args.code, args.comment || '');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }

    if (name === 'strudel_vox') {
      const res = await server.triggerVox(args.text, {
        rate: args.rate,
        voice: args.voice,
        gain: args.gain,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }

    if (name === 'strudel_session_stop') {
      const res = await server.stopSession();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Strudel Live Error: ${error.message}\n${error.stack}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('⚡ Strudel Live MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP error:', err);
  process.exit(1);
});
