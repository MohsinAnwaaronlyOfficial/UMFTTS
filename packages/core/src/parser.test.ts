import { describe, it, expect } from 'vitest';
import { parseTextContent, parseSrtContent, detectFileType, parseContent } from './parser.js';

describe('parseTextContent', () => {
  it('should parse simple text lines', () => {
    const content = `Hello world
This is line two
And line three`;

    const result = parseTextContent(content);

    expect(result.lines).toHaveLength(3);
    expect(result.validLines).toBe(3);
    expect(result.skippedLines).toBe(0);
    expect(result.lines[0]?.text).toBe('Hello world');
    expect(result.lines[0]?.lineNo).toBe(1);
    expect(result.lines[0]?.presetId).toBeNull();
  });

  it('should skip empty lines', () => {
    const content = `Line one

Line two

Line three`;

    const result = parseTextContent(content);

    expect(result.lines).toHaveLength(3);
    expect(result.validLines).toBe(3);
    expect(result.skippedLines).toBe(2);
  });

  it('should detect preset prefixes', () => {
    const content = `#1 Hello from preset 1
Normal line
#2 Hello from preset 2
#10 Max preset`;

    const result = parseTextContent(content);

    expect(result.lines).toHaveLength(4);
    expect(result.lines[0]?.presetId).toBe(1);
    expect(result.lines[0]?.text).toBe('Hello from preset 1');
    expect(result.lines[1]?.presetId).toBeNull();
    expect(result.lines[1]?.text).toBe('Normal line');
    expect(result.lines[2]?.presetId).toBe(2);
    expect(result.lines[3]?.presetId).toBe(10);
  });

  it('should ignore invalid preset IDs', () => {
    const content = `#0 Zero is invalid
#11 Eleven is too high
#abc Not a number`;

    const result = parseTextContent(content);

    expect(result.lines).toHaveLength(3);
    // These should be treated as normal lines since preset IDs are invalid
    expect(result.lines[0]?.presetId).toBeNull();
    expect(result.lines[0]?.text).toBe('#0 Zero is invalid');
    expect(result.lines[1]?.presetId).toBeNull();
    expect(result.lines[2]?.presetId).toBeNull();
  });

  it('should assign unique IDs to each line', () => {
    const content = `Line one
Line two`;

    const result = parseTextContent(content);

    expect(result.lines[0]?.id).toBeDefined();
    expect(result.lines[1]?.id).toBeDefined();
    expect(result.lines[0]?.id).not.toBe(result.lines[1]?.id);
  });

  it('should set default status to pending', () => {
    const result = parseTextContent('Single line');

    expect(result.lines[0]?.status).toBe('pending');
  });

  it('should handle Windows line endings', () => {
    const content = 'Line one\r\nLine two\r\nLine three';

    const result = parseTextContent(content);

    expect(result.lines).toHaveLength(3);
  });
});

describe('parseSrtContent', () => {
  it('should parse valid SRT content', () => {
    const content = `1
00:00:00,000 --> 00:00:05,000
Hello, this is the first subtitle

2
00:00:05,500 --> 00:00:10,000
And this is the second one`;

    const result = parseSrtContent(content);

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.lineNo).toBe(1);
    expect(result.lines[0]?.text).toBe('Hello, this is the first subtitle');
    expect(result.lines[1]?.lineNo).toBe(2);
    expect(result.lines[1]?.text).toBe('And this is the second one');
  });

  it('should handle multi-line subtitles', () => {
    const content = `1
00:00:00,000 --> 00:00:05,000
First line of subtitle
Second line of subtitle`;

    const result = parseSrtContent(content);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.text).toBe('First line of subtitle Second line of subtitle');
  });

  it('should detect preset prefixes in SRT', () => {
    const content = `1
00:00:00,000 --> 00:00:05,000
#1 This uses preset 1

2
00:00:05,500 --> 00:00:10,000
Normal subtitle`;

    const result = parseSrtContent(content);

    expect(result.lines[0]?.presetId).toBe(1);
    expect(result.lines[0]?.text).toBe('This uses preset 1');
    expect(result.lines[1]?.presetId).toBeNull();
  });
});

describe('detectFileType', () => {
  it('should detect SRT format', () => {
    const srtContent = `1
00:00:00,000 --> 00:00:05,000
Hello world`;

    expect(detectFileType(srtContent)).toBe('srt');
  });

  it('should detect plain text format', () => {
    const textContent = `Hello world
This is just text
No timestamps here`;

    expect(detectFileType(textContent)).toBe('text');
  });

  it('should default to text for ambiguous content', () => {
    const ambiguous = 'Single line of text';
    expect(detectFileType(ambiguous)).toBe('text');
  });
});

describe('parseContent', () => {
  it('should use correct parser based on type', () => {
    const textContent = 'Hello world';
    const textResult = parseContent(textContent, 'text');
    expect(textResult.lines[0]?.text).toBe('Hello world');

    const srtContent = `1
00:00:00,000 --> 00:00:05,000
Hello SRT`;
    const srtResult = parseContent(srtContent, 'srt');
    expect(srtResult.lines[0]?.text).toBe('Hello SRT');
  });
});

describe('line ordering', () => {
  it('should maintain correct line order', () => {
    const content = `First
Second
Third
Fourth
Fifth`;

    const result = parseTextContent(content);

    expect(result.lines.map(l => l.lineNo)).toEqual([1, 2, 3, 4, 5]);
    expect(result.lines.map(l => l.text)).toEqual(['First', 'Second', 'Third', 'Fourth', 'Fifth']);
  });

  it('should maintain order after skipping empty lines', () => {
    const content = `First

Third

Fifth`;

    const result = parseTextContent(content);

    expect(result.lines.map(l => l.lineNo)).toEqual([1, 2, 3]);
    expect(result.lines.map(l => l.text)).toEqual(['First', 'Third', 'Fifth']);
  });
});
