/** Port of the test web server (5173 stays free for `npm run dev`). */
export const PORT = 5190

/** API base URL baked into the test build. Nothing listens there and the fixture aborts it too. */
export const API_URL = 'http://127.0.0.1:8799'
