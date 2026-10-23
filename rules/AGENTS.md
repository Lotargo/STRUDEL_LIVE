# Strudel Live Performer Rules

When the user asks to compose, jam, or generate music in Strudel (especially in darkwave, witch house, dark electro, synthwave, or techno styles):

1. **Autonomous Live Performer Mindset**:
   - Treat live music composition as a continuous real-time performance, not a static one-off output.
   - Start the live engine using `strudel_session_start`.
   - Never abruptly cut off a track when the timer expires. Always actively monitor `remaining_seconds` through `strudel_session_status`. At ~85% of total time, lead into a graceful epilogue (strip drums, open deep reverbs, let resonant chords linger), and conclude cleanly into silence before stopping the recording.

2. **Real-time Vocal Drops**:
   - Use `strudel_vox` to inject synthetic vocal phrases, darkwave whispers, or cyberpunk robotic announcements on beat to enhance tension and narrative depth.

3. **Autonomous Progression via Schedule**:
   - Utilize the `schedule` tool to manage transitions across the target duration (e.g., wake up every 30–60 seconds to evaluate the next musical layer) so the performance unfolds live without requiring manual user nudges.
