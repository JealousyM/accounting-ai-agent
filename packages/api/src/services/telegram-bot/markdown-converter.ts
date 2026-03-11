/**
 * Markdown to Telegram MarkdownV2 converter
 *
 * Telegram MarkdownV2 requires escaping these characters outside of code blocks:
 *   _ * [ ] ( ) ~ ` > # + - = | { } . !
 *
 * This module converts standard markdown (as produced by AI responses) into
 * Telegram-compatible MarkdownV2, and splits long messages at paragraph
 * boundaries to stay within the 4096 character limit.
 */

// eslint-disable-next-line no-useless-escape
const SPECIAL_CHARS = /([_*\[\]()~`>#\+\-=|{}.!\\])/g;

/**
 * Escape a plain-text string for Telegram MarkdownV2.
 */
function escapeMarkdownV2(text: string): string {
  return text.replace(SPECIAL_CHARS, '\\$1');
}

/**
 * Convert standard markdown to Telegram MarkdownV2 format.
 *
 * Handles:
 * - Headings (## Heading -> **bold**)
 * - Code blocks (preserved as-is, content not escaped)
 * - Inline code (preserved, content not escaped)
 * - Bold (**text** -> *text*)
 * - Italic (*text* or _text_ -> _text_)
 * - Tables (converted to preformatted text)
 * - Special character escaping in plain text
 */
export function convertToTelegramMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  const tableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code block state
    if (line.trimStart().startsWith('```')) {
      if (inTable) {
        flushTable(tableLines, result);
        inTable = false;
      }
      inCodeBlock = !inCodeBlock;
      // Code blocks are valid in MarkdownV2 as-is
      result.push(line);
      continue;
    }

    // Inside code block: pass through without escaping
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // Detect table rows (lines starting with |)
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableLines.length = 0;
      }
      // Skip separator rows like |---|---|
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
        continue;
      }
      tableLines.push(line);
      continue;
    }

    // Flush table if we were in one
    if (inTable) {
      flushTable(tableLines, result);
      inTable = false;
    }

    // Headings: ## Heading -> bold text
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const headingText = escapeMarkdownV2(headingMatch[2]);
      result.push(`*${headingText}*`);
      continue;
    }

    // Process inline formatting
    result.push(convertInlineFormatting(line));
  }

  // Flush any remaining table
  if (inTable) {
    flushTable(tableLines, result);
  }

  return result.join('\n');
}

/**
 * Convert inline markdown formatting in a single line.
 * Handles bold, italic, inline code, and escaping.
 */
function convertInlineFormatting(line: string): string {
  const segments: string[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Find the next inline code span
    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      // Process text before the code span
      const before = remaining.slice(0, codeMatch.index);
      segments.push(formatPlainSegment(before));
      // Inline code: preserve as-is (no escaping inside backticks)
      segments.push('`' + codeMatch[1] + '`');
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
    } else {
      // No more inline code
      segments.push(formatPlainSegment(remaining));
      break;
    }
  }

  return segments.join('');
}

/**
 * Format a text segment that does not contain inline code.
 * Converts bold/italic and escapes special characters.
 */
function formatPlainSegment(text: string): string {
  if (!text) return '';

  // Convert bold: **text** -> *text*
  // We need to handle bold before italic to avoid conflicts
  let result = text;

  // Temporarily replace bold markers
  const boldParts: string[] = [];
  result = result.replace(/\*\*(.+?)\*\*/g, (_match, content) => {
    const idx = boldParts.length;
    boldParts.push(content);
    return `\x01BOLD${idx}\x01`;
  });

  // Temporarily replace italic markers (_text_ or *text*)
  const italicParts: string[] = [];
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, (_match, content) => {
    const idx = italicParts.length;
    italicParts.push(content);
    return `\x01ITALIC${idx}\x01`;
  });
  // eslint-disable-next-line no-control-regex
  result = result.replace(/(?<!\x01)\*(.+?)\*(?!\x01)/g, (_match, content) => {
    const idx = italicParts.length;
    italicParts.push(content);
    return `\x01ITALIC${idx}\x01`;
  });

  // Escape remaining special characters
  result = escapeMarkdownV2(result);

  // Restore bold (Telegram uses single * for bold)
  for (let i = 0; i < boldParts.length; i++) {
    result = result.replace(`\x01BOLD${i}\x01`, `*${escapeMarkdownV2(boldParts[i])}*`);
  }

  // Restore italic (Telegram uses _ for italic)
  for (let i = 0; i < italicParts.length; i++) {
    result = result.replace(`\x01ITALIC${i}\x01`, `_${escapeMarkdownV2(italicParts[i])}_`);
  }

  return result;
}

/**
 * Flush collected table lines as a preformatted code block.
 */
function flushTable(tableLines: string[], result: string[]): void {
  if (tableLines.length === 0) return;

  result.push('```');
  for (const tl of tableLines) {
    // Strip leading/trailing pipes and trim cells
    const cells = tl
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
    result.push(cells.join('  |  '));
  }
  result.push('```');
  tableLines.length = 0;
}

/**
 * Split a message into chunks that fit within Telegram's character limit.
 * Splits at paragraph boundaries (double newline) when possible.
 *
 * @param text    The full message text (already in MarkdownV2 format)
 * @param maxLength  Maximum characters per chunk (default 4096)
 * @returns Array of message chunks
 */
export function splitMessage(text: string, maxLength: number = 4096): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Try to split at a paragraph boundary (double newline)
    let splitIdx = remaining.lastIndexOf('\n\n', maxLength);

    if (splitIdx <= 0 || splitIdx < maxLength * 0.3) {
      // Fall back to single newline
      splitIdx = remaining.lastIndexOf('\n', maxLength);
    }

    if (splitIdx <= 0 || splitIdx < maxLength * 0.3) {
      // Last resort: hard split at maxLength
      splitIdx = maxLength;
    }

    chunks.push(remaining.slice(0, splitIdx).trimEnd());
    remaining = remaining.slice(splitIdx).trimStart();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}
