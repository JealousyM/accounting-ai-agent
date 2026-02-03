# TTS (Text-to-Speech) Service

## Overview

The TTS Service provides text-to-speech synthesis using OpenAI's TTS API. It converts AI chat responses to natural-sounding audio, supporting multiple voices and automatic text cleanup.

## Features

- **OpenAI TTS Integration**: High-quality voice synthesis using OpenAI's `tts-1` and `tts-1-hd` models
- **Multiple Voice Options**: 6 distinct voices (Nova, Alloy, Echo, Fable, Onyx, Shimmer)
- **Markdown Stripping**: Automatic cleanup of markdown formatting for cleaner speech
- **Flexible API Key Sources**: Uses user's OpenAI key or falls back to app's key
- **Rate Limiting**: Built-in protection against API abuse (20 requests/minute per user)
- **Error Handling**: Specific error messages for common issues

## Configuration

### Environment Variables

```bash
# Optional: App-level OpenAI key for TTS (fallback when user doesn't have own key)
OPENAI_API_KEY=sk-...
```

### API Key Priority

1. **User's own OpenAI key** - If user has `provider: 'openai'` configured in their LLM credentials
2. **App's OpenAI key** - Falls back to `OPENAI_API_KEY` environment variable

## Usage

### Using the Singleton Instance

```typescript
import { ttsService } from './services/tts.instance';

// Check if user can use TTS
const canUse = await ttsService.canUseTTS(userId);

// Synthesize speech
const audioBuffer = await ttsService.synthesize(userId, 'Hello, world!', {
  voice: 'nova',
  model: 'tts-1',
});
```

### Voice Options

| Voice | Description |
|-------|-------------|
| `nova` | Female, natural voice (default) |
| `alloy` | Neutral voice |
| `echo` | Male voice |
| `fable` | British accent |
| `onyx` | Deep voice |
| `shimmer` | Soft voice |

### Model Options

| Model | Description |
|-------|-------------|
| `tts-1` | Standard quality, lower latency (default) |
| `tts-1-hd` | High definition quality, higher latency |

## API Endpoints

### POST /api/tts/speak

Synthesize text to speech.

**Request:**
```json
{
  "text": "Text to synthesize (max 4096 chars)",
  "voice": "nova",
  "model": "tts-1"
}
```

**Response:**
- `Content-Type: audio/mpeg`
- MP3 audio buffer

**Errors:**
- `400` - Invalid request or OpenAI key not configured
- `401` - Unauthorized or invalid API key
- `429` - Rate limit exceeded

### GET /api/tts/status

Check if user can use TTS.

**Response:**
```json
{
  "available": true,
  "voices": ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
}
```

## Frontend Integration

### TTSContext

The frontend uses `TTSContext` to manage TTS state:

```typescript
import { useTTS } from '@/contexts/TTSContext';

const {
  ttsEnabled,      // Is TTS enabled
  useAI,           // Use AI voice (vs browser TTS)
  aiVoice,         // Selected AI voice
  isAIAvailable,   // Can user use AI TTS
  speak,           // Speak function
  stop,            // Stop speaking
} = useTTS();

// Speak a message
speak('Hello!', messageId);
```

### Settings UI

TTS settings are configured via `TTSSettingsButton` component:
- Enable/disable TTS
- Toggle AI voice (OpenAI) vs browser voice (Web Speech API)
- Select AI voice
- Adjust speech rate (browser TTS only)
- Auto-speak new messages

## Text Processing

The service automatically strips markdown before synthesis:

- Code blocks (```...```)
- Inline code (`...`)
- Headers (#, ##, etc.)
- Bold/italic (**text**, *text*)
- Links [text](url) → text
- Images, tables, lists
- Extra whitespace

## Cost Considerations

OpenAI TTS pricing: ~$0.015 per 1000 characters

- Average AI response: ~500 chars → ~$0.0075 per response
- Users should be aware this uses their API credits

## Error Handling

```typescript
try {
  const audio = await ttsService.synthesize(userId, text);
} catch (error) {
  if (error.message.includes('API key not configured')) {
    // User needs to configure OpenAI key
  }
  if (error.message.includes('Invalid OpenAI API key')) {
    // Key is invalid
  }
  if (error.message.includes('rate limit')) {
    // Rate limited by OpenAI
  }
}
```

## Files

| File | Description |
|------|-------------|
| `tts.service.ts` | Main TTS service class |
| `tts.instance.ts` | Singleton instance export |
| `../routes/tts.routes.ts` | API endpoints |
| `../../web/src/contexts/TTSContext.tsx` | Frontend context |
| `../../web/src/components/chat/TTSSettingsButton.tsx` | Settings UI |
