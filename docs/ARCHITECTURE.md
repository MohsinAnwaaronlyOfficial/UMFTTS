# UMF TTS Architecture

## Overview

UMF TTS is a production-ready Windows desktop application for text-to-speech generation using ElevenLabs API. Built with Electron, React, and TypeScript, it provides a professional interface for batch TTS generation, realtime streaming preview, voice cloning, and audio export.

## Tech Stack

- **Desktop Shell**: Electron 28+
- **UI Framework**: React 18 + TypeScript
- **Build Tool**: Vite + electron-vite
- **State Management**: TanStack Query + Zustand
- **Styling**: Tailwind CSS + Radix UI primitives
- **Database**: SQLite (better-sqlite3)
- **Audio Processing**: FFmpeg (fluent-ffmpeg)
- **API Client**: Native fetch + WebSocket (ws)
- **Validation**: Zod schemas

## Project Structure

```
UMFTTS/
├── apps/
│   ├── desktop/          # Electron main + preload
│   │   ├── src/
│   │   │   ├── main/     # Main process
│   │   │   │   ├── index.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── ipc/  # IPC handlers
│   │   │   └── preload/  # Preload script
│   │   └── electron.vite.config.ts
│   │
│   └── ui/               # React renderer
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/   # Reusable UI components
│       │   │   └── layout/
│       │   ├── pages/    # Page components
│       │   ├── hooks/    # Custom React hooks
│       │   └── lib/      # Utility functions
│       └── vite.config.ts
│
├── packages/
│   ├── shared/           # Shared types + Zod schemas
│   ├── db/               # SQLite database layer
│   ├── elevenlabs/       # ElevenLabs API client
│   ├── core/             # Parser + domain logic
│   └── audio/            # FFmpeg audio helpers
│
└── docs/
    ├── ARCHITECTURE.md   # This file
    └── PROMPTS.md        # User guide
```

## Architecture Principles

### 1. Separation of Concerns

- **Renderer (UI)**: React components handle presentation only
- **Main Process**: All business logic, API calls, file I/O
- **IPC Bridge**: Type-safe communication via preload script
- **Packages**: Reusable, testable modules

### 2. Security Model

- **Context Isolation**: Renderer has no direct Node.js access
- **API Key Storage**: Stored in SQLite, never exposed to renderer
- **IPC Validation**: All IPC calls validated with Zod schemas
- **Safe File Paths**: Always use `app.getPath('userData')`

### 3. Type Safety

- **Strict TypeScript**: `noUncheckedIndexedAccess`, `strict` mode
- **Zod Validation**: Runtime validation for all external data
- **Shared Types**: Single source of truth in `@umf-tts/shared`

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        RENDERER                              │
│  ┌─────────┐    ┌──────────┐    ┌──────────────────────┐   │
│  │ React   │───▶│ useQuery │───▶│ window.electronAPI   │   │
│  │ Pages   │◀───│ Hooks    │◀───│ (preload exposed)    │   │
│  └─────────┘    └──────────┘    └──────────┬───────────┘   │
└──────────────────────────────────────────────┼──────────────┘
                                               │ IPC
┌──────────────────────────────────────────────▼──────────────┐
│                      MAIN PROCESS                            │
│  ┌────────────┐    ┌────────────┐    ┌─────────────────┐   │
│  │ IPC        │───▶│ Handlers   │───▶│ Services        │   │
│  │ Channels   │    │ (validate) │    │ (business logic)│   │
│  └────────────┘    └────────────┘    └────────┬────────┘   │
│                                                │             │
│  ┌────────────┐    ┌────────────┐    ┌────────▼────────┐   │
│  │ SQLite     │◀───│ Repository │◀───│ ElevenLabs API  │   │
│  │ Database   │    │ Layer      │    │ Client          │   │
│  └────────────┘    └────────────┘    └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### IPC Communication

All renderer-to-main communication uses typed IPC channels:

```typescript
// Preload exposes type-safe API
const api = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data) => ipcRenderer.invoke('settings:update', data),
  // ...
};
contextBridge.exposeInMainWorld('electronAPI', api);

// Main process handlers
ipcMain.handle('settings:get', async () => {
  try {
    const settings = settingsRepository.get();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### Database Schema

```sql
-- Core tables
settings          -- Singleton row for app config
voice_presets     -- Preset 1-10 configurations
projects          -- TTS projects
project_lines     -- Lines within projects
exports           -- Merged audio files
cloned_voices     -- Voice clone tracking
migrations        -- Schema version tracking
```

### ElevenLabs Integration

```typescript
// REST API
listVoices(apiKey)
listModels(apiKey)
textToSpeechToFile(apiKey, options)
voiceCloneCreate(apiKey, options)
voiceDelete(apiKey, voiceId)

// HTTP Streaming
textToSpeechStream(apiKey, options) → AsyncGenerator<Buffer>

// WebSocket Streaming
ElevenLabsWebSocket.connect()
ElevenLabsWebSocket.sendText(text)
ElevenLabsWebSocket.on('audio', (chunk) => {})
```

### Batch Processing

```
1. User starts batch → startBatch(projectId, concurrency)
2. Main process creates job, gets pending lines
3. Process lines in parallel (up to concurrency)
4. For each line:
   - Update status to 'processing'
   - Generate TTS via ElevenLabs API
   - Save clip to userData folder
   - Update status to 'done' or 'failed'
   - Send progress via IPC event
5. On completion, update project status
```

### Audio Merging

Uses FFmpeg concat demuxer with silence injection:

```
1. Get completed clips ordered by lineNo
2. Generate silence file (delayMs duration)
3. Create concat file list interleaving clips and silence
4. Run FFmpeg concat with copy codec
5. Save to exports folder
6. Record in exports table
```

## File Locations

All user data stored in Electron's `app.getPath('userData')`:

```
[userData]/
├── umf-tts.sqlite      # Main database
├── clips/              # Generated audio clips
│   └── {projectId}/
│       └── line-0001.mp3
├── exports/            # Merged audio files
│   └── MyProject-2024-01-15.mp3
└── logs/
    └── main.log
```

## Error Handling

1. **Centralized Logging**: electron-log writes to file + console
2. **IPC Result Pattern**: All handlers return `{ success, data }` or `{ success, error }`
3. **Try/Catch Everywhere**: Every handler wrapped in try/catch
4. **User Feedback**: Toast notifications for all operations
5. **Graceful Degradation**: Failed operations don't crash the app

## Testing Strategy

- **Unit Tests**: Parser, repositories, utility functions
- **Integration Tests**: Database operations, file I/O
- **E2E Tests**: (Future) Playwright for full app testing

## Performance Considerations

1. **SQLite WAL Mode**: Concurrent read/write support
2. **Batch Concurrency**: Configurable 1-10 parallel TTS requests
3. **React Query**: Automatic caching and refetching
4. **Streaming Audio**: Progressive playback for realtime preview
5. **Lazy Loading**: Components loaded on-demand via React Router

## Security Considerations

1. **API Key Protection**: Never sent to renderer, stored locally
2. **Input Validation**: Zod schemas validate all external data
3. **File Access**: Sandboxed to userData directory
4. **XSS Prevention**: React's built-in escaping
5. **CSP Headers**: Strict Content-Security-Policy in HTML
