/**
 * Universal CLI Wrapper - Stream Parser
 *
 * Handles real-time stream parsing, buffering, and line assembly
 * from CLI tools with complex output patterns.
 */

import type { StreamChunk, ParsedLine, TerminalOutput } from './types.js';
import { FormatProcessor } from './FormatProcessor.js';

export class StreamParser {
  private buffers = new Map<string, Buffer>();
  private lineBuffers = new Map<string, string>();
  private sequenceCounter = 0;
  private formatProcessor = new FormatProcessor();

  // Configuration
  private readonly maxBufferSize = 1024 * 1024; // 1MB per session
  private readonly lineTimeout = 5000; // 5 seconds timeout for incomplete lines
  private readonly maxLineLength = 100000; // Maximum line length

  // Timers for incomplete lines
  private lineTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Process a chunk of data from a stream
   */
  processChunk(
    sessionId: string,
    source: 'stdout' | 'stderr',
    data: Buffer
  ): ParsedLine[] {
    const sessionKey = `${sessionId}:${source}`;

    // Append to buffer
    const existing = this.buffers.get(sessionKey) || Buffer.alloc(0);
    const combined = Buffer.concat([existing, data]);

    // Check buffer size limit
    if (combined.length > this.maxBufferSize) {
      console.warn(`Buffer overflow for session ${sessionId}:${source}, truncating`);
      const truncated = combined.subarray(-this.maxBufferSize);
      this.buffers.set(sessionKey, truncated);
    } else {
      this.buffers.set(sessionKey, combined);
    }

    // Extract complete lines
    const lines = this.extractCompleteLines(sessionKey);

    return lines.map(line => ({
      content: line,
      complete: true,
      source,
      timestamp: Date.now()
    }));
  }

  /**
   * Process real-time stream data that may contain partial lines
   */
  processRealTimeStream(
    sessionId: string,
    source: 'stdout' | 'stderr',
    data: Buffer
  ): {
    completeLines: ParsedLine[];
    partialLine?: ParsedLine;
    hasProgress?: boolean;
  } {
    const sessionKey = `${sessionId}:${source}`;
    const text = data.toString('utf8');

    // Handle carriage returns (progress indicators, live updates)
    const hasCarriageReturn = text.includes('\r');
    const hasProgress = this.formatProcessor.containsProgressIndicators(text);

    // Get existing partial line
    const existingLine = this.lineBuffers.get(sessionKey) || '';

    let combinedText: string;

    if (hasCarriageReturn) {
      // Handle carriage return - this often indicates progress or live updates
      combinedText = this.handleCarriageReturn(existingLine, text);
    } else {
      // Normal text append
      combinedText = existingLine + text;
    }

    const lines = combinedText.split('\n');
    const completeLines: ParsedLine[] = [];

    // Process complete lines (all but the last)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      if (line.length > 0) {
        completeLines.push({
          content: this.processSingleLine(line),
          complete: true,
          source,
          timestamp: Date.now()
        });
      }
    }

    // Handle the last line (potentially incomplete)
    const lastLine = lines[lines.length - 1];

    // Clear any existing timeout
    const timeoutKey = sessionKey;
    if (this.lineTimeouts.has(timeoutKey)) {
      clearTimeout(this.lineTimeouts.get(timeoutKey)!);
    }

    // Store partial line
    this.lineBuffers.set(sessionKey, lastLine);

    const result: any = {
      completeLines,
      hasProgress
    };

    // Add partial line if it exists and isn't too long
    if (lastLine.length > 0) {
      if (lastLine.length > this.maxLineLength) {
        // Line too long, treat as complete and clear buffer
        completeLines.push({
          content: this.processSingleLine(lastLine),
          complete: true,
          source,
          timestamp: Date.now()
        });
        this.lineBuffers.set(sessionKey, '');
      } else {
        result.partialLine = {
          content: this.processSingleLine(lastLine),
          complete: false,
          source,
          timestamp: Date.now()
        };

        // Set timeout to force completion of partial line
        this.lineTimeouts.set(timeoutKey, setTimeout(() => {
          this.forceCompletePartialLine(sessionId, source);
        }, this.lineTimeout));
      }
    }

    return result;
  }

  /**
   * Handle carriage return in text (common in progress indicators)
   */
  private handleCarriageReturn(existingLine: string, newText: string): string {
    const parts = newText.split('\r');

    if (parts.length === 1) {
      // No carriage return, normal append
      return existingLine + newText;
    }

    // Start with existing line + first part
    let result = existingLine + parts[0];

    // Each \r overwrites the current line
    for (let i = 1; i < parts.length; i++) {
      if (i === parts.length - 1 && !newText.endsWith('\r')) {
        // Last part without trailing \r - this becomes the new line content
        result = parts[i];
      } else {
        // Intermediate parts - treat as complete lines
        if (parts[i].length > 0) {
          result += '\n' + parts[i];
        }
      }
    }

    return result;
  }

  /**
   * Extract complete lines from buffer
   */
  private extractCompleteLines(sessionKey: string): string[] {
    const buffer = this.buffers.get(sessionKey);
    if (!buffer) return [];

    const text = buffer.toString('utf8');
    const lines = text.split('\n');

    // Keep the last line in buffer (might be incomplete)
    const lastLine = lines.pop() || '';
    this.buffers.set(sessionKey, Buffer.from(lastLine, 'utf8'));

    // Return complete lines, processed
    return lines
      .filter(line => line.length > 0)
      .map(line => this.processSingleLine(line));
  }

  /**
   * Process a single line of text
   */
  private processSingleLine(line: string): string {
    // Remove excessive whitespace
    let processed = line.trim();

    // Handle common CLI patterns
    processed = this.normalizeCommonPatterns(processed);

    return processed;
  }

  /**
   * Normalize common CLI output patterns
   */
  private normalizeCommonPatterns(line: string): string {
    let normalized = line;

    // Remove bell characters
    normalized = normalized.replace(/\x07/g, '');

    // Normalize multiple spaces to single space
    normalized = normalized.replace(/\s+/g, ' ');

    // Remove trailing carriage returns
    normalized = normalized.replace(/\r+$/, '');

    return normalized;
  }

  /**
   * Force completion of a partial line due to timeout
   */
  private forceCompletePartialLine(sessionId: string, source: 'stdout' | 'stderr'): void {
    const sessionKey = `${sessionId}:${source}`;
    const partialLine = this.lineBuffers.get(sessionKey);

    if (partialLine && partialLine.length > 0) {
      // Emit as complete line
      const completeLine: ParsedLine = {
        content: this.processSingleLine(partialLine),
        complete: true,
        source,
        timestamp: Date.now()
      };

      // Clear the buffer
      this.lineBuffers.set(sessionKey, '');

      // Emit to listeners (would need event system)
      this.emitForcedCompleteLine(sessionId, completeLine);
    }

    // Clean up timeout
    this.lineTimeouts.delete(sessionKey);
  }

  /**
   * Create a stream chunk with metadata
   */
  createStreamChunk(source: 'stdout' | 'stderr', data: Buffer): StreamChunk {
    return {
      source,
      data,
      timestamp: Date.now(),
      sequence: ++this.sequenceCounter
    };
  }

  /**
   * Get current buffer status for a session
   */
  getBufferStatus(sessionId: string): {
    stdout: { size: number; hasPartialLine: boolean };
    stderr: { size: number; hasPartialLine: boolean };
  } {
    const stdoutKey = `${sessionId}:stdout`;
    const stderrKey = `${sessionId}:stderr`;

    return {
      stdout: {
        size: this.buffers.get(stdoutKey)?.length || 0,
        hasPartialLine: (this.lineBuffers.get(stdoutKey)?.length || 0) > 0
      },
      stderr: {
        size: this.buffers.get(stderrKey)?.length || 0,
        hasPartialLine: (this.lineBuffers.get(stderrKey)?.length || 0) > 0
      }
    };
  }

  /**
   * Clear all buffers for a session
   */
  clearSession(sessionId: string): void {
    const stdoutKey = `${sessionId}:stdout`;
    const stderrKey = `${sessionId}:stderr`;

    // Clear buffers
    this.buffers.delete(stdoutKey);
    this.buffers.delete(stderrKey);
    this.lineBuffers.delete(stdoutKey);
    this.lineBuffers.delete(stderrKey);

    // Clear timeouts
    [stdoutKey, stderrKey].forEach(key => {
      if (this.lineTimeouts.has(key)) {
        clearTimeout(this.lineTimeouts.get(key)!);
        this.lineTimeouts.delete(key);
      }
    });
  }

  /**
   * Get pending partial lines for a session
   */
  getPendingPartialLines(sessionId: string): {
    stdout?: string;
    stderr?: string;
  } {
    const stdoutKey = `${sessionId}:stdout`;
    const stderrKey = `${sessionId}:stderr`;

    const result: any = {};

    const stdoutPartial = this.lineBuffers.get(stdoutKey);
    if (stdoutPartial && stdoutPartial.length > 0) {
      result.stdout = stdoutPartial;
    }

    const stderrPartial = this.lineBuffers.get(stderrKey);
    if (stderrPartial && stderrPartial.length > 0) {
      result.stderr = stderrPartial;
    }

    return result;
  }

  /**
   * Flush any pending partial lines as complete
   */
  flushPendingLines(sessionId: string): ParsedLine[] {
    const stdoutKey = `${sessionId}:stdout`;
    const stderrKey = `${sessionId}:stderr`;
    const flushedLines: ParsedLine[] = [];

    // Flush stdout
    const stdoutPartial = this.lineBuffers.get(stdoutKey);
    if (stdoutPartial && stdoutPartial.length > 0) {
      flushedLines.push({
        content: this.processSingleLine(stdoutPartial),
        complete: true,
        source: 'stdout',
        timestamp: Date.now()
      });
      this.lineBuffers.set(stdoutKey, '');
    }

    // Flush stderr
    const stderrPartial = this.lineBuffers.get(stderrKey);
    if (stderrPartial && stderrPartial.length > 0) {
      flushedLines.push({
        content: this.processSingleLine(stderrPartial),
        complete: true,
        source: 'stderr',
        timestamp: Date.now()
      });
      this.lineBuffers.set(stderrKey, '');
    }

    return flushedLines;
  }

  /**
   * Event emitter placeholder for forced completion
   * In a real implementation, this would emit to an event system
   */
  private emitForcedCompleteLine(sessionId: string, line: ParsedLine): void {
    // TODO: Implement event emission system
    console.debug(`Forced completion for ${sessionId}: ${line.content}`);
  }

  /**
   * Get statistics about stream processing
   */
  getStats(): {
    activeSessions: number;
    totalBufferSize: number;
    pendingTimeouts: number;
  } {
    let totalSize = 0;
    for (const buffer of this.buffers.values()) {
      totalSize += buffer.length;
    }

    return {
      activeSessions: this.buffers.size / 2, // Each session has stdout + stderr
      totalBufferSize: totalSize,
      pendingTimeouts: this.lineTimeouts.size
    };
  }
}