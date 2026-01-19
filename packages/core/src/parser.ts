import { v4 as uuidv4 } from 'uuid';
import type { ParsedLine, ParseResult, SrtEntry } from '@umf-tts/shared';

// Regex to match preset prefix like #1, #2, etc.
const PRESET_REGEX = /^#(\d+)\s+(.+)$/;

// SRT timestamp format: 00:00:00,000 --> 00:00:00,000
const SRT_TIMESTAMP_REGEX = /^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/;

export function parseTextContent(content: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const parsedLines: ParsedLine[] = [];
  let validLines = 0;
  let skippedLines = 0;
  let lineNo = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      skippedLines++;
      continue;
    }

    lineNo++;
    validLines++;

    // Check if line starts with preset prefix like #1, #2, etc.
    const presetMatch = trimmed.match(PRESET_REGEX);

    if (presetMatch) {
      const presetId = parseInt(presetMatch[1]!, 10);
      const text = presetMatch[2]!.trim();

      // Validate preset ID is within range 1-10
      if (presetId >= 1 && presetId <= 10 && text.length > 0) {
        parsedLines.push({
          id: uuidv4(),
          lineNo,
          text,
          presetId,
          status: 'pending',
          error: null,
          clipPath: null,
          duration: null,
        });
      } else {
        // Invalid preset ID or empty text, treat as normal line
        parsedLines.push({
          id: uuidv4(),
          lineNo,
          text: trimmed,
          presetId: null,
          status: 'pending',
          error: null,
          clipPath: null,
          duration: null,
        });
      }
    } else {
      // Normal line without preset
      parsedLines.push({
        id: uuidv4(),
        lineNo,
        text: trimmed,
        presetId: null,
        status: 'pending',
        error: null,
        clipPath: null,
        duration: null,
      });
    }
  }

  return {
    lines: parsedLines,
    totalLines: lines.length,
    validLines,
    skippedLines,
  };
}

export function parseSrtContent(content: string): ParseResult {
  const entries = parseSrtToEntries(content);
  const parsedLines: ParsedLine[] = [];

  for (const entry of entries) {
    // Clean up the text (remove multiple spaces, trim)
    const cleanText = entry.text.replace(/\s+/g, ' ').trim();

    if (!cleanText) continue;

    // Check for preset prefix in SRT text
    const presetMatch = cleanText.match(PRESET_REGEX);

    if (presetMatch) {
      const presetId = parseInt(presetMatch[1]!, 10);
      const text = presetMatch[2]!.trim();

      if (presetId >= 1 && presetId <= 10 && text.length > 0) {
        parsedLines.push({
          id: uuidv4(),
          lineNo: entry.index,
          text,
          presetId,
          status: 'pending',
          error: null,
          clipPath: null,
          duration: null,
        });
      } else {
        parsedLines.push({
          id: uuidv4(),
          lineNo: entry.index,
          text: cleanText,
          presetId: null,
          status: 'pending',
          error: null,
          clipPath: null,
          duration: null,
        });
      }
    } else {
      parsedLines.push({
        id: uuidv4(),
        lineNo: entry.index,
        text: cleanText,
        presetId: null,
        status: 'pending',
        error: null,
        clipPath: null,
        duration: null,
      });
    }
  }

  return {
    lines: parsedLines,
    totalLines: entries.length,
    validLines: parsedLines.length,
    skippedLines: entries.length - parsedLines.length,
  };
}

export function parseSrtToEntries(content: string): SrtEntry[] {
  const entries: SrtEntry[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    // Skip empty lines
    while (i < lines.length && !lines[i]?.trim()) {
      i++;
    }

    if (i >= lines.length) break;

    // Parse index
    const indexLine = lines[i]?.trim();
    if (!indexLine) {
      i++;
      continue;
    }

    const index = parseInt(indexLine, 10);
    if (isNaN(index)) {
      i++;
      continue;
    }
    i++;

    // Parse timestamp
    if (i >= lines.length) break;
    const timestampLine = lines[i]?.trim();
    if (!timestampLine || !SRT_TIMESTAMP_REGEX.test(timestampLine)) {
      i++;
      continue;
    }

    const [startTime, endTime] = timestampLine.split('-->').map((t) => t.trim());
    i++;

    // Parse text (can be multiple lines)
    const textLines: string[] = [];
    while (i < lines.length && lines[i]?.trim()) {
      textLines.push(lines[i]!.trim());
      i++;
    }

    if (textLines.length > 0 && startTime && endTime) {
      entries.push({
        index,
        startTime,
        endTime,
        text: textLines.join(' '),
      });
    }
  }

  return entries;
}

export function parseContent(content: string, type: 'text' | 'srt'): ParseResult {
  if (type === 'srt') {
    return parseSrtContent(content);
  }
  return parseTextContent(content);
}

export function detectFileType(content: string): 'text' | 'srt' {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  // Check if it looks like an SRT file
  // SRT files have a pattern: number, timestamp, text, blank
  if (lines.length >= 3) {
    const firstLine = lines[0]?.trim();
    const secondLine = lines[1]?.trim();

    // First line should be a number
    if (firstLine && /^\d+$/.test(firstLine)) {
      // Second line should be a timestamp
      if (secondLine && SRT_TIMESTAMP_REGEX.test(secondLine)) {
        return 'srt';
      }
    }
  }

  return 'text';
}
