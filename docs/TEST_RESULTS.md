# Test execution status

The Node test suites above are committed but could not be executed against installed npm packages in this sandbox: outbound npm/GitHub network is disabled, and the user's browser/audio hardware are not available. **Do not mark runtime or audio E2E as passed.**

Run locally:
```bash
npm install
npm test
npm run check
node bin/strudel-live.js stand --duration 90 --style jungle --bpm 168
```
Follow docs/VALIDATION.md with headphones/speakers and a short licensed voice WAV. Capture correctness, recording finalization and Codex authentication must be verified on the actual workstation.
