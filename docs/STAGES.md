# Pipeline Stage Implementation Guide

This document describes the implementation details of each pipeline stage, including AI integrations and configuration options.

## Overview

Cutroom uses a 7-stage pipeline to produce short-form video content:

```
RESEARCH → SCRIPT → VOICE → MUSIC → VISUAL → EDITOR → PUBLISH
   10%       25%      20%     10%     15%       15%       5%
```

Each stage can operate in two modes:
- **Real Mode**: Uses external APIs (OpenAI, ElevenLabs, Pexels)
- **Mock Mode**: Returns placeholder data for development/testing

## Environment Variables

Configure these in `.env.local` to enable real API integrations:

```bash
# AI Content Generation (Research + Script)
OPENAI_API_KEY=sk-...

# Voice Synthesis
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Optional, defaults to Rachel

# Visual Asset Search
PEXELS_API_KEY=...
```

## Stage Details

### 1. RESEARCH (10%)

**Purpose:** Gather facts, identify hooks, and define target audience.

**AI Integration:** OpenAI GPT-4o-mini
- Generates structured research based on topic
- Validates response with Zod schema
- Falls back to rule-based templates if API unavailable

**Input:**
```typescript
{
  topic: string       // Required: Video topic
  description?: string // Optional: Additional context
}
```

**Output:**
```typescript
{
  topic: string
  facts: string[]           // 5-7 key facts
  hooks: string[]           // 3-4 attention-grabbing angles
  sources: Source[]         // Reference sources
  targetAudience: string    // Who should watch
  estimatedDuration: number // Suggested video length (seconds)
}
```

**Configuration:**
```typescript
// In .env.local
OPENAI_API_KEY=sk-... // Enables real AI generation
```

---

### 2. SCRIPT (25%)

**Purpose:** Convert research into a structured video script.

**AI Integration:** OpenAI GPT-4o-mini
- Crafts engaging scripts from research facts
- Generates visual cues for each section
- Includes speaker delivery notes

**Input:**
```typescript
{
  research: ResearchOutput  // From previous stage
  style?: "educational" | "entertaining" | "news" | "tutorial"
  duration?: number         // Target length in seconds
}
```

**Output:**
```typescript
{
  hook: string              // Opening line
  body: ScriptSection[]     // Content sections
  cta: string               // Call to action
  fullScript: string        // Complete narration text
  estimatedDuration: number
  speakerNotes: string[]    // Delivery tips
}
```

---

### 3. VOICE (20%)

**Purpose:** Generate voiceover audio from script.

**AI Integration:** ElevenLabs TTS
- Uses eleven_turbo_v2_5 model
- Default voice: Rachel (21m00Tcm4TlvDq8ikWAM)

**Input:**
```typescript
{
  script: ScriptOutput      // From previous stage
  voiceId?: string          // ElevenLabs voice ID
  speed?: number            // 0.5 - 2.0
}
```

**Output:**
```typescript
{
  audioUrl: string          // Generated audio URL
  duration: number          // Audio length in seconds
  transcript: string        // Cleaned text that was spoken
  timestamps?: Timestamp[]  // Word-level timing (if available)
}
```

**Configuration:**
```typescript
// In .env.local
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...     // Optional
```

---

### 4. MUSIC (10%)

**Purpose:** Select background music track.

**Integration:** Curated free music library
- Mood-based selection (upbeat, calm, dramatic, neutral)
- Genre options: electronic, acoustic, ambient, cinematic, lofi

**Input:**
```typescript
{
  duration?: number         // Target track length
  mood?: "upbeat" | "calm" | "dramatic" | "neutral"
  genre?: "electronic" | "acoustic" | "ambient" | "cinematic" | "lofi"
}
```

**Output:**
```typescript
{
  audioUrl: string
  duration: number
  bpm?: number
  genre?: string
  source: string            // "pixabay", "freepd", etc.
}
```

---

### 5. VISUAL (15%)

**Purpose:** Source b-roll clips and images.

**Integration:** Pexels Video API
- Searches for relevant stock footage
- Extracts keywords from visual cues
- Falls back to placeholder URLs if no results

**Input:**
```typescript
{
  script: ScriptOutput      // Uses visualCue from each section
  style?: "stock" | "generated" | "mixed"
}
```

**Output:**
```typescript
{
  clips: VideoClip[]        // Stock footage clips
  images: ImageAsset[]      // Still images
  overlays: Overlay[]       // Text/graphic overlays
}
```

**Configuration:**
```typescript
// In .env.local
PEXELS_API_KEY=...
```

---

### 6. EDITOR (15%)

**Purpose:** Assemble final video from all assets.

**Integration:** Remotion (planned)
- Currently returns mock composition
- TODO: Integrate Remotion renderer

**Input:**
```typescript
{
  voice: VoiceOutput
  music: MusicOutput
  visual: VisualOutput
  script?: ScriptOutput
  format?: VideoFormat
}
```

**Output:**
```typescript
{
  videoUrl: string
  duration: number
  thumbnailUrl: string
  format: {
    width: number           // Default: 1080
    height: number          // Default: 1920 (9:16 portrait)
    fps: number             // Default: 30
    codec?: string
  }
  renderTime: number
}
```

---

### 7. PUBLISH (5%)

**Purpose:** Post video to social platforms.

**Integration:** Platform APIs (planned)
- YouTube Shorts
- TikTok
- Twitter/X
- Instagram Reels

**Input:**
```typescript
{
  editor: EditorOutput
  platforms?: string[]      // Target platforms
  title?: string
  description?: string
  tags?: string[]
}
```

**Output:**
```typescript
{
  platforms: PlatformResult[]
  publishedAt: string
}
```

---

## Running the Pipeline Locally

### Using the CLI

```bash
# Install dependencies
npm install

# Dry run (mock data, no API calls)
npm run pipeline:run -- --topic "Your topic" --dry-run

# Real run (requires API keys)
npm run pipeline:run -- --topic "Your topic" --skip-publish

# Full run with verbose output
npm run pipeline:run -- --topic "Your topic" -v
```

### Programmatic Usage

```typescript
import { STAGE_ORDER, getStageHandler, StageContext } from './src/lib/stages'

const context: StageContext = {
  pipelineId: 'my-pipeline',
  stageId: 'research-1',
  input: { topic: 'AI Agents' },
  dryRun: false, // Set true to skip API calls
}

const handler = getStageHandler('RESEARCH')
const result = await handler.execute(context)
```

---

## Testing

```bash
# Run all stage tests
npm run test -- src/lib/stages/

# Run specific stage test
npm run test -- src/lib/stages/research.test.ts
```

All stages include unit tests covering:
- Input validation
- Successful execution
- Error handling
- Mock/fallback behavior

---

## Adding New Stages

1. Create `src/lib/stages/newstage.ts`
2. Implement `StageHandler` interface
3. Add to `STAGE_ORDER` in `types.ts`
4. Register in `index.ts`
5. Add tests in `newstage.test.ts`
6. Update `STAGE_WEIGHTS` for attribution

---

*Last updated: 2026-02-02 by Kai*
