# UMF TTS

A professional Windows desktop application for text-to-speech generation using ElevenLabs API.

![UMF TTS](https://img.shields.io/badge/version-1.0.0-blue)
![Electron](https://img.shields.io/badge/electron-28.x-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

## Features

- **Batch TTS Generation** - Convert text files or SRT subtitles to speech
- **Voice Presets** - Assign different voices to lines using `#1`, `#2`, etc.
- **Realtime Preview** - HTTP and WebSocket streaming for instant feedback
- **Voice Cloning** - Clone voices from audio samples
- **Audio Export** - Merge clips with configurable silence between them
- **Project Management** - Organize and manage multiple TTS projects
- **Secure API Key Storage** - API key stored locally, never exposed

## Tech Stack

- Electron + React + TypeScript
- Vite build system
- SQLite local database
- FFmpeg audio processing
- Tailwind CSS + Radix UI

## Prerequisites

- Node.js 18+
- pnpm 8+
- FFmpeg (for audio merging)
- ElevenLabs API key

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Create Windows installer
pnpm dist
```

## Project Structure

```
UMFTTS/
├── apps/
│   ├── desktop/     # Electron main process
│   └── ui/          # React renderer
├── packages/
│   ├── shared/      # Types + Zod schemas
│   ├── db/          # SQLite layer
│   ├── elevenlabs/  # API client
│   ├── core/        # Parser logic
│   └── audio/       # FFmpeg helpers
└── docs/
    ├── ARCHITECTURE.md
    └── PROMPTS.md
```

## Configuration

1. Launch the application
2. Go to Settings
3. Enter your ElevenLabs API key
4. Configure default voice and model

## Usage

### Creating a Project

1. Click "New Project"
2. Enter text (one line per speech segment)
3. Use `#1`, `#2` etc. for voice presets
4. Generate and export

### Text Format

```
Hello, welcome to the podcast.
#1 This is the host speaking.
#2 And this is the guest.
Back to narration.
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design
- [User Guide](docs/PROMPTS.md) - Usage instructions

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @umf-tts/core test
```

## Building

```bash
# Build all packages
pnpm build

# Create Windows installer
pnpm dist
```

The installer will be created in `apps/desktop/release/`.

## License

MIT
