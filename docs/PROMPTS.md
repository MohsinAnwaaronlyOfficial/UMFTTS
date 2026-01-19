# UMF TTS User Guide

## Getting Started

### Prerequisites

1. **Node.js 18+** - Required for development
2. **pnpm 8+** - Package manager
3. **FFmpeg** - Required for audio merging
4. **ElevenLabs API Key** - Get one at https://elevenlabs.io

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/UMFTTS.git
cd UMFTTS

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Create Windows installer
pnpm dist
```

### First Run

1. Launch the application
2. Go to **Settings** page
3. Enter your ElevenLabs API key and click "Test & Save"
4. Configure default voice and model
5. You're ready to create projects!

---

## Features Guide

### Projects

Projects are containers for your TTS content. Each project stores:
- Project name
- Raw text or SRT content
- Parsed lines with status
- Generated audio clips

**Creating a Project:**
1. Click **"New Project"** button
2. Enter a project name
3. Choose input type (Plain Text or SRT)
4. Upload a file or paste content
5. Click **"Create Project"**

**Text Format:**
```
Hello, this is line one.
This is line two.

Empty lines are skipped.
#1 This line uses voice preset 1
#2 This line uses voice preset 2
```

**SRT Format:**
```
1
00:00:00,000 --> 00:00:05,000
First subtitle line

2
00:00:05,500 --> 00:00:10,000
#1 This uses preset 1
```

### Voice Presets

Presets let you assign different voices to specific lines using `#1`, `#2`, etc.

**Creating a Preset:**
1. Go to **Settings** page
2. Click **"Add Preset"**
3. Choose a preset number (1-10)
4. Select voice and model
5. Adjust voice settings
6. Save

**Using Presets in Text:**
```
Normal narrator voice
#1 This is Character A speaking
#2 And this is Character B
Back to normal narrator
```

### Batch Generation

Generate audio clips for all lines in a project.

**Steps:**
1. Open a project from the **Generate** page
2. Adjust concurrency (1-10 parallel requests)
3. Click **"Generate"**
4. Watch progress in real-time
5. Failed items can be retried

**Settings:**
- **Concurrency**: How many clips to generate simultaneously
- **Clip Delay**: Silence between clips in merged export
- **Output Format**: MP3, WAV, or OGG

### Realtime Preview

Test voice settings before batch generation.

**HTTP Stream Mode:**
- Standard streaming
- Buffers more audio before playing
- More reliable

**WebSocket Mode:**
- Lower latency
- Plays chunks immediately
- Better for real-time feedback

**Usage:**
1. Go to **Realtime Preview**
2. Select voice and model
3. Adjust settings (stability, similarity, style)
4. Enter text
5. Click **"Preview"**

### Voice Cloning

Clone voices from audio samples.

**Requirements:**
- Clear, high-quality audio (no background noise)
- At least 1 minute total audio
- MP3, WAV, M4A, OGG, or FLAC format

**Steps:**
1. Go to **Voice Cloning**
2. Click **"Clone Voice"**
3. Enter a name
4. Upload audio samples (up to 25 files)
5. Click **"Clone Voice"**

**Important:** Only clone voices you own or have permission to use.

### Library

Manage your generated content.

**Exports Tab:**
- Merged audio files from projects
- Play, open folder, or delete

**Clips Tab:**
- Individual audio clips
- Organized by project
- Play, open folder, or delete

### Exporting

After generating clips, merge them into a single file.

**Steps:**
1. Complete batch generation
2. Set clip delay (ms of silence between clips)
3. Choose output format
4. Click **"Export Merged"**
5. File opens in explorer

---

## Voice Settings Explained

### Stability (0-1)
- **Low (0-0.3)**: More expressive, variable
- **Medium (0.3-0.7)**: Balanced
- **High (0.7-1)**: Consistent, predictable

### Similarity Boost (0-1)
- **Low**: Original voice characteristics
- **High**: Closer to voice sample

### Style (0-1)
- **Low (0)**: Neutral delivery
- **High (1)**: More expressive style

### Speaker Boost
- Enhances voice clarity
- Recommended: ON for most uses

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle DevTools | F12 |
| Refresh | F5 or Ctrl+R |
| Close Window | Alt+F4 |

---

## Troubleshooting

### "API key not configured"
→ Go to Settings and enter your ElevenLabs API key

### "No voice selected"
→ Set a default voice in Settings, or use presets

### Generation fails with "quota exceeded"
→ Check your ElevenLabs subscription limits

### Audio not playing in preview
→ Check browser/app audio permissions

### FFmpeg errors during merge
→ Ensure FFmpeg is installed and in PATH

### App crashes on startup
→ Check logs in `%APPDATA%/umf-tts/logs/main.log`

---

## File Locations

| Content | Location |
|---------|----------|
| Database | `%APPDATA%/umf-tts/umf-tts.sqlite` |
| Clips | `%APPDATA%/umf-tts/clips/` |
| Exports | `%APPDATA%/umf-tts/exports/` |
| Logs | `%APPDATA%/umf-tts/logs/` |

---

## Tips

1. **Use descriptive project names** - Makes library easier to navigate
2. **Start with low concurrency** - Avoid rate limits
3. **Preview before batch** - Test settings in Realtime Preview
4. **Use presets for characters** - Makes multi-voice projects easier
5. **Check failed items** - Errors often indicate API limits
6. **Export regularly** - Don't lose your work

---

## Support

For issues and feature requests, please create an issue on GitHub.
