# Mihwar — Interview Management Platform

Mihwar is an Arabic, right-to-left web application for organizing interviews, selecting interview questions, saving answers and audio recordings, and reviewing or printing interview reports. It runs as a local frontend application; it has no application server or transcription backend.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Requirements and setup](#requirements-and-setup)
- [Using the application](#using-the-application)
- [Speech recognition and audio recording](#speech-recognition-and-audio-recording)
- [Data storage and privacy](#data-storage-and-privacy)
- [Project structure](#project-structure)
- [Development and production build](#development-and-production-build)
- [Troubleshooting](#troubleshooting)

## Features

- Create and edit interviews, and track their status: draft, in progress, or completed.
- Choose question sections and combine multiple templates in one interview, or start with a blank interview and add custom questions.
- The question library in `DOCS/default-question-library.json` is based on the primary question reference, `DOCS/UIMS_Interview_Questions_Only.docx`.
- Edit questions and follow-up prompts, reorder or duplicate questions, and delete them.
- Multiple answer types: long or short text, choice, multi-select, dropdown, yes/no, number, date, rating, and notes.
- Automatically save answers by question ID, so navigating between questions does not replace other answers.
- Optional audio recording for each question, with playback, re-recording, and deletion controls.
- Live speech recognition in browsers that support the Web Speech API, with interim and final results and manual answer editing.
- Review interviews and export reports to PDF using the browser's print dialog.
- Responsive Arabic user interface for different screen sizes.

## Technology

- React, TypeScript, and Vite.
- React Router for application pages.
- Dexie and IndexedDB for local interview and recording storage.
- `SpeechRecognition` or `webkitSpeechRecognition` for browser speech recognition.
- MediaRecorder for optional audio recording.
- Lucide React for icons.

Speech recognition does not use Whisper or any machine learning model bundled with this project. Python, API keys, subscriptions, paid transcription services, and a transcription backend are not required.

## Requirements and setup

### Windows

You need Node.js and npm. The installed Vite version supports Node.js `^20.19.0` or `>=22.12.0`.

Open PowerShell in the project directory and run:

```powershell
.\run-local.ps1
```

The script first checks for the portable Node.js copy in `.tools`. If it is unavailable, it uses Node.js and npm installed on your computer. If `node_modules` is missing, the script installs the frontend dependencies, then starts the development server.

Open this address in your browser:

```text
http://127.0.0.1:5173
```

To stop the development server, press `Ctrl+C` in the PowerShell window.

### Run npm directly

If Node.js and npm are available in your `PATH`:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173` after the development server address appears in the terminal. The server binds to `127.0.0.1`, so it is available from the local computer.

## Using the application

1. Select **New interview** from the interview dashboard.
2. Enter the interview title and participant/interviewer details, then choose one or more question templates.
3. Create the interview. Questions are displayed under their respective sections.
4. Type an answer, or use live speech recognition if it is available in your browser.
5. Navigate with the question list or the Previous and Next buttons. Answers are saved automatically.
6. When finished, select **Finish interview**, review the report, and print it or save it as a PDF.

Open **Speech recognition settings** from the sidebar to change the default language or check on-device recognition support in browsers that provide those capabilities.

## Speech recognition and audio recording

### Speech recognition

- The application uses the browser's Web Speech API, supporting `SpeechRecognition` and the legacy `webkitSpeechRecognition` name where available.
- The default language is Egyptian Arabic (`ar-EG`). Arabic (`ar-SA`) and US English (`en-US`) are also available.
- Select **Start Answer**, then pause and resume recognition or finish the answer. Final results are saved to the current question. Interim results are displayed but are not committed as the saved answer.
- If the browser ends a recognition session automatically, the application attempts to restart it and avoid duplicating overlapping words.
- Edit recognized text in the answer editor, or enter an answer manually. If SpeechRecognition is unavailable, the application displays a warning and keeps manual answer entry available.
- If supported by the browser, settings may offer on-device language-pack availability checks and installation through `processLocally`, `available()`, and `install()`.

**Important:** Web Speech API support and behavior depend on the browser and its configuration. Default recognition may use a service provided by the browser. This application does not upload audio to any additional service, but it cannot guarantee that the browser's recognition provider processes audio locally. Offline recognition is not guaranteed. Use on-device mode only when the browser offers it and confirms that the language pack is available.

### Audio recording

- MediaRecorder is an optional feature separate from live speech recognition.
- Select **Start audio recording** to record. The audio file is saved in IndexedDB and linked to the interview and question IDs.
- You can play back, re-record, or delete the file from the question page. The application does not send the recording to a transcription server.
- The browser may request microphone permission. Grant access to the local application if you want to use these features.

## Data storage and privacy

- Interview details, answers, and audio files are stored in IndexedDB in the browser profile for this local application origin.
- There is no database server or backend API, and data is not automatically synced between devices.
- Clearing site data in the browser may delete saved interviews and recordings. Keep PDF reports or other copies if you need them outside the browser.
- `index.html` loads fonts from Google Fonts, which requires an internet connection. This does not send interview audio or text. The application uses fallback fonts if the online fonts are unavailable.
- The project does not contain API keys, paid transcription services, or downloadable speech models.

## Project structure

```text
INTERVIEWS_WEP/
├── DOCS/
│   ├── UIMS_Interview_Questions_Only.docx  # Primary interview-question reference
│   └── default-question-library.json       # Question library loaded by the app
├── src/
│   ├── hooks/
│   │   └── useSpeechRecognition.ts         # Speech recognition hook and session management
│   ├── App.tsx                             # Pages and interview workflows
│   ├── db.ts                               # IndexedDB schema and persistence
│   ├── main.tsx                            # React entry point and CSS imports
│   ├── speech-recognition.css              # Speech recognition styles
│   ├── styles.css                          # Application styles, colors, and responsive rules
│   └── types.ts                            # Interview, question, answer, and recording types
├── index.html                              # HTML document and page metadata
├── package.json                            # Dependencies and development/build commands
├── package-lock.json                       # Locked dependency versions
├── run-local.ps1                           # Windows development launcher
├── tsconfig.json                            # TypeScript configuration
└── vite.config.ts                           # Vite configuration and local development host
```

## Development and production build

### Deploy from GitHub to Vercel

The project includes a root `vercel.json` for Vite, the `dist` output directory, and a rewrite to `index.html` so BrowserRouter URLs such as `/interview/:id` and `/review/:id` continue to load when opened or refreshed directly. In Vercel, import the GitHub repository and use these project settings (the config also declares the build and output values):

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | `./` |
| Install command | `npm install` (Vercel default) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | None required |

Do not add a Python or transcription backend to the Vercel project. The app has no backend API or required secrets. Vercel serves the built frontend over HTTPS, which allows the browser to request microphone permission. Web Speech API support and its audio processing behavior still depend on the visitor's browser.

Interview data and recordings are stored in IndexedDB for the specific browser and origin. A Vercel deployment uses a different origin from localhost, and its data is not synchronized with local development or with other devices or browsers.

After pushing the repository to GitHub, connect it in Vercel and deploy. Subsequent pushes to the configured production branch trigger deployments.

Run the TypeScript type check:

```powershell
npm run typecheck
```

Build the production version into `dist/`:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

## Troubleshooting

### `run-local.ps1` does not start

- Make sure the terminal is open in the project directory.
- Install Node.js 20.19 or later and confirm that `node` and `npm` are available in `PATH`, or check for `.tools/node/node-v24.22.3-win-x64/node.exe`.
- If PowerShell blocks the script because of its execution policy, run it for this command session with:

  ```powershell
  powershell -ExecutionPolicy Bypass -File .\run-local.ps1
  ```

### The microphone does not work

- Check microphone permission for `http://127.0.0.1:5173` and the microphone privacy settings in Windows.
- Make sure another application is not using the microphone, then reload the page.
- SpeechRecognition may not be available in your browser or its configuration. Use manual answer entry or try a recent version of Chrome or Edge.
- A recognition error does not delete manually entered answers or saved MediaRecorder files.

### Interviews or recordings are missing

- Open the application with the same browser and origin that you used when saving the data.
- Do not clear site data or browser storage if you want to keep saved interviews and recordings.
