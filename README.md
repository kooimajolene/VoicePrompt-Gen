# VoicePrompt-Gen

VoicePrompt-Gen is a single-page web app for turning rough spoken or typed ideas into structured prompts for AI coding tools.

It combines:

- real-time browser speech recognition
- editable transcript input
- DeepSeek-powered prompt refinement
- a split-screen workflow for fast vibe-coding

## Features

- Real-time speech-to-text with the browser Web Speech API
- Manual text input in the same transcript panel
- One-click prompt refinement with DeepSeek
- Copy-to-clipboard for generated prompts
- Local persistence for transcript, prompt result, and selected language
- Clear button that resets both panels only when you want it to
- Cute desktop-style UI with a custom background illustration

## Tech Stack

- React
- Vite
- Tailwind CSS
- Lucide React
- Express
- DeepSeek API via the OpenAI-compatible SDK

## Requirements

- Node.js 18+ recommended
- A modern Chromium-based browser for speech recognition
- A valid DeepSeek API key

## Getting Started

### 1. Install dependencies

```bash
npm install
```

If your environment has permission issues with the default npm cache, you can use:

```bash
npm install --cache .npm-cache --ignore-scripts
```

### 2. Create the `.env` file

Create a file named `.env` in the project root.

Example:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
PORT=8788
```

### `.env` variables

- `DEEPSEEK_API_KEY`
  Your DeepSeek API key.

- `DEEPSEEK_MODEL`
  DeepSeek model name.
  Common options:
  - `deepseek-chat`
  - `deepseek-reasoner`

- `PORT`
  Port used by the local Express API server.
  Default in this project: `8788`

Important:

- Do not commit your real `.env` file.
- `.env` is already ignored by Git through `.gitignore`.
- The backend uses `dotenv.config({ override: true })`, so your local `.env` values override existing environment variables.

### 3. Start the app

Run frontend and backend together:

```bash
npm run dev:full
```

This starts:

- Vite frontend dev server
- Express backend API server

Typical local URLs:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:8788/api/health`

## Available Scripts

- `npm run dev`
  Start the Vite frontend only

- `npm run server`
  Start the Express backend only

- `npm run dev:full`
  Start frontend and backend together

- `npm run build`
  Build the frontend for production

- `npm run preview`
  Preview the Vite production build

- `npm run start`
  Start the backend server

## How It Works

### Left Panel

The left panel accepts:

- live speech recognition results
- direct manual text input

You can freely edit the transcript before sending it for refinement.

### Right Panel

The right panel shows the DeepSeek-refined prompt.

If the left panel is empty:

- the optimize button is disabled
- no API request is sent

### Persistence

The app stores the following in local storage:

- transcript content
- refined prompt content
- selected recognition language

Refreshing the page will keep these values.
Only the `Clear` button removes them.

## Speech Recognition Notes

Speech recognition is powered by the browser Web Speech API.

Because of browser limitations:

- recognition quality depends on Chrome and system microphone settings
- there is no direct sensitivity control in the API
- matching the correct recognition language is important

For best results:

- use Chrome
- allow microphone access
- select the correct language in the top bar
- use a clear microphone input device

## API Endpoints

### `GET /api/health`

Returns basic backend status:

```json
{
  "ok": true,
  "configured": true,
  "model": "deepseek-chat"
}
```

### `POST /api/refine`

Request body:

```json
{
  "transcript": "Your raw spoken or typed idea"
}
```

Response:

```json
{
  "prompt": "Refined prompt text...",
  "model": "deepseek-chat",
  "responseId": "..."
}
```

## Project Structure

```text
.
├─ public/
│  └─ 8812.jpg
├─ server/
│  └─ index.js
├─ src/
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ index.html
├─ package.json
├─ postcss.config.js
├─ tailwind.config.js
└─ vite.config.js
```

## Git Notes

The following files and folders are ignored:

- `node_modules/`
- `dist/`
- `.env`
- `.npm-cache/`

## Troubleshooting

### The app says the API key is invalid

Check your `.env` file:

```env
DEEPSEEK_API_KEY=your_real_key
```

Then restart the dev server:

```bash
npm run dev:full
```

### Speech recognition stops too quickly

- Make sure microphone permission is allowed
- Make sure the selected language matches your speech
- Try Chrome instead of another browser

### The prompt is not generated

Check:

- the left panel is not empty
- `http://localhost:8788/api/health` returns `configured: true`
- your DeepSeek key is valid

## License

This project currently has no explicit license file.
