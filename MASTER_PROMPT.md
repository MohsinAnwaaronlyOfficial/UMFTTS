# UMF TTS - Complete Windows Desktop Application

## IMPORTANT INSTRUCTIONS FOR CLAUDE

You are building a **production-ready Windows desktop application** called "UMF TTS" (Text-to-Speech tool using ElevenLabs API).

### CRITICAL REQUIREMENTS:
1. **NO TypeScript errors** - All code must compile without ANY warnings or errors
2. **NO unused imports or variables** - Remove all unused code
3. **Test the build** - After writing code, run `pnpm build` to verify it compiles
4. **Simple architecture** - Use a simple, flat structure that works reliably

---

## PROJECT STRUCTURE

Create this SIMPLE structure (NOT monorepo - single app):

```
umf-tts/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.json
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts
│   │   ├── database.ts       # SQLite with better-sqlite3
│   │   ├── ipc-handlers.ts   # All IPC handlers
│   │   └── elevenlabs.ts     # ElevenLabs API client
│   ├── preload/
│   │   └── index.ts
│   └── renderer/             # React UI
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles.css
│       ├── pages/
│       │   ├── Settings.tsx
│       │   ├── Projects.tsx
│       │   ├── Generate.tsx
│       │   ├── VoiceCloning.tsx
│       │   ├── RealtimePreview.tsx
│       │   └── Library.tsx
│       └── components/
│           ├── Sidebar.tsx
│           ├── PresetSelector.tsx
│           └── AudioPlayer.tsx
└── resources/
    └── icon.ico
```

---

## TECH STACK

- **Electron 28+** with electron-vite
- **React 18** with TypeScript
- **Vite 5** for bundling
- **better-sqlite3** for SQLite database
- **TailwindCSS** for styling
- **electron-builder** for Windows packaging

---

## FEATURES TO IMPLEMENT

### 1. Settings Page
- ElevenLabs API key input (stored securely in SQLite)
- Test API key button
- Default voice settings (stability, similarity boost, style)
- Output folder selection
- Concurrency setting (1-10 parallel requests)

### 2. Voice Presets System (#1 to #10)
- 10 preset slots for different voices
- Each preset stores: voiceId, modelId, stability, similarityBoost, style
- Easy switching between presets
- Assign presets to text lines using #1, #2, etc. prefix

### 3. Projects Page
- Create new project (name + paste text or upload .txt/.srt file)
- List all projects with status
- Delete projects
- View project details

### 4. Generate Page (Main TTS)
- Load project text
- Parse text into lines (support plain text and SRT format)
- Assign voice presets to each line (#1-#10 prefix)
- Batch generate TTS with progress bar
- Retry failed lines
- Merge all clips into single MP3 with configurable silence gap
- Save to library

### 5. Realtime Preview
- Text input box
- Select voice preset
- Stream audio in realtime using ElevenLabs WebSocket API
- Play/Stop controls

### 6. Voice Cloning
- Upload audio samples (MP3/WAV)
- Enter voice name and description
- Clone voice via ElevenLabs API
- Add cloned voice to presets

### 7. Library
- List all generated audio clips
- List all merged exports
- Play audio
- Delete files
- Open folder location

---

## DATABASE SCHEMA (SQLite)

```sql
-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Voice presets table
CREATE TABLE IF NOT EXISTS voice_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  preset_number INTEGER UNIQUE NOT NULL CHECK(preset_number >= 1 AND preset_number <= 10),
  name TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  model_id TEXT DEFAULT 'eleven_multilingual_v2',
  stability REAL DEFAULT 0.5,
  similarity_boost REAL DEFAULT 0.75,
  style REAL DEFAULT 0,
  use_speaker_boost INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  input_type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'draft',
  total_lines INTEGER DEFAULT 0,
  completed_lines INTEGER DEFAULT 0,
  failed_lines INTEGER DEFAULT 0,
  merged_file_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Project lines table
CREATE TABLE IF NOT EXISTS project_lines (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  preset_number INTEGER,
  status TEXT DEFAULT 'pending',
  error TEXT,
  clip_path TEXT,
  duration REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Library clips table
CREATE TABLE IF NOT EXISTS library_clips (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  line_id TEXT,
  file_path TEXT NOT NULL,
  text TEXT,
  duration REAL,
  file_size INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Library exports table
CREATE TABLE IF NOT EXISTS library_exports (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  file_path TEXT NOT NULL,
  duration REAL,
  file_size INTEGER,
  line_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## ELEVENLABS API INTEGRATION

### REST API Endpoints:
- `GET /v1/voices` - List all voices
- `GET /v1/models` - List all models
- `POST /v1/text-to-speech/{voice_id}` - Generate TTS (returns MP3)
- `POST /v1/text-to-speech/{voice_id}/stream` - Stream TTS
- `POST /v1/voices/add` - Clone voice

### WebSocket Streaming:
- URL: `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id={model_id}`
- Send: `{"text": "Hello", "voice_settings": {...}, "xi_api_key": "..."}`
- Receive: Base64 encoded audio chunks

### API Key Header:
```
xi-api-key: YOUR_API_KEY
```

---

## IPC CHANNELS (Main <-> Renderer)

```typescript
// Settings
'settings:get' -> returns settings object
'settings:update' -> updates settings
'settings:test-api-key' -> tests ElevenLabs API key

// Presets
'presets:list' -> returns all presets
'presets:get' -> returns single preset
'presets:save' -> creates/updates preset
'presets:delete' -> deletes preset

// Projects
'projects:list' -> returns all projects
'projects:get' -> returns project with lines
'projects:create' -> creates new project
'projects:delete' -> deletes project

// TTS Generation
'tts:generate-single' -> generates single line TTS
'tts:generate-batch' -> starts batch generation
'tts:cancel-batch' -> cancels batch
'tts:retry-failed' -> retries failed lines

// Streaming
'tts:stream-start' -> starts WebSocket stream
'tts:stream-send' -> sends text to stream
'tts:stream-stop' -> stops stream
'tts:stream-chunk' -> (event) receives audio chunk

// Audio
'audio:merge' -> merges clips into single file
'audio:play' -> plays audio file
'audio:get-info' -> gets audio duration/info

// Library
'library:list-clips' -> lists all clips
'library:list-exports' -> lists all exports
'library:delete' -> deletes file
'library:open-folder' -> opens folder in explorer

// Files
'file:select' -> opens file dialog
'file:read' -> reads file content
'file:save-dialog' -> opens save dialog

// ElevenLabs
'elevenlabs:list-voices' -> lists available voices
'elevenlabs:list-models' -> lists available models
'elevenlabs:clone-voice' -> clones a voice
```

---

## PACKAGE.JSON

```json
{
  "name": "umf-tts",
  "version": "1.0.0",
  "description": "UMF TTS Desktop Application",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "dist": "electron-builder --win",
    "dist:portable": "electron-builder --win portable"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "electron-store": "^8.1.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@types/uuid": "^9.0.7",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "electron": "^28.1.3",
    "electron-builder": "^24.9.1",
    "electron-vite": "^2.0.0",
    "postcss": "^8.4.33",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  },
  "build": {
    "appId": "com.umftts.app",
    "productName": "UMF TTS",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "resources/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "portable": {
      "artifactName": "UMF-TTS-Portable.exe"
    },
    "files": ["dist/**/*"],
    "extraResources": ["resources/**/*"]
  }
}
```

---

## STEP-BY-STEP BUILD INSTRUCTIONS

After creating all files:

1. Run: `pnpm install`
2. Run: `pnpm build` (verify NO errors)
3. Run: `pnpm dev` (test the app)
4. Run: `pnpm dist:portable` (create portable .exe)

---

## UI DESIGN

- Dark theme (background: #0f0f0f, cards: #1a1a1a)
- Sidebar navigation on left
- Blue accent color (#3b82f6)
- Clean, modern interface
- Responsive layout

---

## FINAL CHECKLIST

Before finishing, verify:
- [ ] `pnpm build` completes with NO errors
- [ ] `pnpm dev` starts the app successfully
- [ ] All pages render correctly
- [ ] Database creates tables on first run
- [ ] IPC communication works between main and renderer
- [ ] Settings can be saved and loaded
- [ ] No TypeScript warnings or errors
- [ ] No unused imports or variables

---

## START BUILDING

Create the complete application following this specification. Write ALL files with complete, working code. Test each component as you build. The final result should be a fully functional Windows desktop application that I can distribute to my team.

BEGIN NOW - Create all files one by one with complete implementation.
