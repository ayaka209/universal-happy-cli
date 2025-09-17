/**
 * Universal CLI Wrapper - Format Processor
 *
 * Handles ANSI escape sequences, colors, cursor movements, and terminal formatting.
 * Supports multiple output formats including raw, text, HTML, and JSON.
 */

import type { TerminalOutput, AnsiSequence, OutputFormat } from './types.js';

export class FormatProcessor {
  private readonly ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]/g;
  private readonly ansiParamRegex = /\x1b\[([0-9;]*)[a-zA-Z]/;

  // ANSI color codes mapping
  private readonly colorCodes = new Map([
    // Standard colors (30-37)
    ['30', { name: 'black', hex: '#000000' }],
    ['31', { name: 'red', hex: '#cd0000' }],
    ['32', { name: 'green', hex: '#00cd00' }],
    ['33', { name: 'yellow', hex: '#cdcd00' }],
    ['34', { name: 'blue', hex: '#0000ee' }],
    ['35', { name: 'magenta', hex: '#cd00cd' }],
    ['36', { name: 'cyan', hex: '#00cdcd' }],
    ['37', { name: 'white', hex: '#e5e5e5' }],

    // Bright colors (90-97)
    ['90', { name: 'bright-black', hex: '#7f7f7f' }],
    ['91', { name: 'bright-red', hex: '#ff0000' }],
    ['92', { name: 'bright-green', hex: '#00ff00' }],
    ['93', { name: 'bright-yellow', hex: '#ffff00' }],
    ['94', { name: 'bright-blue', hex: '#5c5cff' }],
    ['95', { name: 'bright-magenta', hex: '#ff00ff' }],
    ['96', { name: 'bright-cyan', hex: '#00ffff' }],
    ['97', { name: 'bright-white', hex: '#ffffff' }],

    // Background colors (40-47)
    ['40', { name: 'bg-black', hex: '#000000' }],
    ['41', { name: 'bg-red', hex: '#cd0000' }],
    ['42', { name: 'bg-green', hex: '#00cd00' }],
    ['43', { name: 'bg-yellow', hex: '#cdcd00' }],
    ['44', { name: 'bg-blue', hex: '#0000ee' }],
    ['45', { name: 'bg-magenta', hex: '#cd00cd' }],
    ['46', { name: 'bg-cyan', hex: '#00cdcd' }],
    ['47', { name: 'bg-white', hex: '#e5e5e5' }],

    // Bright background colors (100-107)
    ['100', { name: 'bg-bright-black', hex: '#7f7f7f' }],
    ['101', { name: 'bg-bright-red', hex: '#ff0000' }],
    ['102', { name: 'bg-bright-green', hex: '#00ff00' }],
    ['103', { name: 'bg-bright-yellow', hex: '#ffff00' }],
    ['104', { name: 'bg-bright-blue', hex: '#5c5cff' }],
    ['105', { name: 'bg-bright-magenta', hex: '#ff00ff' }],
    ['106', { name: 'bg-bright-cyan', hex: '#00ffff' }],
    ['107', { name: 'bg-bright-white', hex: '#ffffff' }],
  ]);

  // Style codes
  private readonly styleCodes = new Map([
    ['0', 'reset'],
    ['1', 'bold'],
    ['2', 'dim'],
    ['3', 'italic'],
    ['4', 'underline'],
    ['5', 'blink'],
    ['7', 'reverse'],
    ['8', 'hidden'],
    ['9', 'strikethrough'],
    ['22', 'normal-intensity'],
    ['23', 'no-italic'],
    ['24', 'no-underline'],
    ['25', 'no-blink'],
    ['27', 'no-reverse'],
    ['28', 'no-hidden'],
    ['29', 'no-strikethrough'],
  ]);

  /**
   * Process raw terminal output into structured format
   */
  processOutput(data: Buffer, source: 'stdout' | 'stderr' = 'stdout'): TerminalOutput {
    const raw = data;
    const ansi = data.toString('utf8');
    const text = this.stripAnsi(ansi);
    const formatted = this.parseAnsi(ansi);

    return {
      raw,
      text,
      ansi,
      formatted,
      source,
      timestamp: Date.now()
    };
  }

  /**
   * Remove all ANSI escape sequences from text
   */
  stripAnsi(input: string): string {
    return input.replace(this.ansiRegex, '');
  }

  /**
   * Parse ANSI escape sequences into structured data
   */
  parseAnsi(input: string): AnsiSequence[] {
    const sequences: AnsiSequence[] = [];
    let match;
    let lastIndex = 0;

    // Reset regex state
    this.ansiRegex.lastIndex = 0;

    while ((match = this.ansiRegex.exec(input)) !== null) {
      const code = match[0];
      const position = match.index;
      const params = this.extractParams(code);
      const type = this.detectSequenceType(code);
      const description = this.describeSequence(code, params, type);

      sequences.push({
        type,
        code,
        params,
        description,
        position
      });

      lastIndex = this.ansiRegex.lastIndex;
    }

    return sequences;
  }

  /**
   * Extract numeric parameters from ANSI sequence
   */
  private extractParams(code: string): number[] {
    const match = code.match(this.ansiParamRegex);
    if (!match || !match[1]) return [];

    return match[1]
      .split(';')
      .filter(p => p.length > 0)
      .map(p => parseInt(p, 10))
      .filter(n => !isNaN(n));
  }

  /**
   * Detect the type of ANSI sequence
   */
  private detectSequenceType(code: string): AnsiSequence['type'] {
    const lastChar = code.charAt(code.length - 1);

    switch (lastChar) {
      case 'm': return 'color'; // SGR (Select Graphic Rendition)
      case 'H': case 'f': return 'cursor'; // Cursor Position
      case 'A': case 'B': case 'C': case 'D': return 'cursor'; // Cursor Movement
      case 'J': case 'K': return 'erase'; // Erase functions
      case 'S': case 'T': return 'cursor'; // Scroll functions
      case 's': case 'u': return 'cursor'; // Save/Restore cursor
      case 'h': case 'l': return 'style'; // Set/Reset mode
      default: return 'unknown';
    }
  }

  /**
   * Generate human-readable description of ANSI sequence
   */
  private describeSequence(code: string, params: number[], type: AnsiSequence['type']): string {
    const lastChar = code.charAt(code.length - 1);

    switch (type) {
      case 'color':
        return this.describeColorSequence(params);

      case 'cursor':
        return this.describeCursorSequence(lastChar, params);

      case 'erase':
        return this.describeEraseSequence(lastChar, params);

      case 'style':
        return this.describeStyleSequence(lastChar, params);

      default:
        return `Unknown sequence: ${code}`;
    }
  }

  private describeColorSequence(params: number[]): string {
    if (params.length === 0) return 'Reset all formatting';

    const descriptions: string[] = [];

    for (const param of params) {
      const paramStr = param.toString();

      if (this.styleCodes.has(paramStr)) {
        descriptions.push(this.styleCodes.get(paramStr)!);
      } else if (this.colorCodes.has(paramStr)) {
        descriptions.push(this.colorCodes.get(paramStr)!.name);
      } else if (param >= 30 && param <= 37) {
        descriptions.push(`foreground-${param - 30}`);
      } else if (param >= 40 && param <= 47) {
        descriptions.push(`background-${param - 40}`);
      } else {
        descriptions.push(`code-${param}`);
      }
    }

    return descriptions.join(', ');
  }

  private describeCursorSequence(lastChar: string, params: number[]): string {
    switch (lastChar) {
      case 'H': case 'f':
        const row = params[0] || 1;
        const col = params[1] || 1;
        return `Move cursor to row ${row}, column ${col}`;
      case 'A':
        return `Move cursor up ${params[0] || 1} lines`;
      case 'B':
        return `Move cursor down ${params[0] || 1} lines`;
      case 'C':
        return `Move cursor right ${params[0] || 1} columns`;
      case 'D':
        return `Move cursor left ${params[0] || 1} columns`;
      case 's':
        return 'Save cursor position';
      case 'u':
        return 'Restore cursor position';
      default:
        return `Cursor command: ${lastChar}`;
    }
  }

  private describeEraseSequence(lastChar: string, params: number[]): string {
    const param = params[0] || 0;

    switch (lastChar) {
      case 'J':
        switch (param) {
          case 0: return 'Erase from cursor to end of screen';
          case 1: return 'Erase from cursor to beginning of screen';
          case 2: return 'Erase entire screen';
          case 3: return 'Erase entire screen and scrollback buffer';
          default: return `Erase screen (mode ${param})`;
        }
      case 'K':
        switch (param) {
          case 0: return 'Erase from cursor to end of line';
          case 1: return 'Erase from cursor to beginning of line';
          case 2: return 'Erase entire line';
          default: return `Erase line (mode ${param})`;
        }
      default:
        return `Erase command: ${lastChar}`;
    }
  }

  private describeStyleSequence(lastChar: string, params: number[]): string {
    return `Style command: ${lastChar} with params [${params.join(', ')}]`;
  }

  /**
   * Serialize terminal output for transmission in various formats
   */
  serializeForTransmission(output: TerminalOutput, format: OutputFormat): string {
    switch (format) {
      case 'raw':
        return output.raw.toString('base64');

      case 'text':
        return output.text;

      case 'html':
        return this.ansiToHtml(output.ansi);

      case 'json':
        return JSON.stringify({
          text: output.text,
          ansi: output.ansi,
          formatted: output.formatted,
          source: output.source,
          timestamp: output.timestamp
        }, null, 2);

      default:
        return output.text;
    }
  }

  /**
   * Convert ANSI text to HTML with proper styling
   */
  ansiToHtml(ansi: string): string {
    let html = ansi;
    let openTags: string[] = [];

    // Track current styles
    let currentStyles = {
      color: '',
      backgroundColor: '',
      bold: false,
      italic: false,
      underline: false
    };

    // Replace ANSI sequences with HTML
    html = html.replace(this.ansiRegex, (match) => {
      const params = this.extractParams(match);
      let result = '';

      for (const param of params) {
        if (param === 0) {
          // Reset all - close all tags
          result += openTags.reverse().map(tag => `</${tag}>`).join('');
          openTags = [];
          currentStyles = { color: '', backgroundColor: '', bold: false, italic: false, underline: false };
        } else if (param === 1) {
          // Bold
          if (!currentStyles.bold) {
            result += '<strong>';
            openTags.push('strong');
            currentStyles.bold = true;
          }
        } else if (param === 3) {
          // Italic
          if (!currentStyles.italic) {
            result += '<em>';
            openTags.push('em');
            currentStyles.italic = true;
          }
        } else if (param === 4) {
          // Underline
          if (!currentStyles.underline) {
            result += '<u>';
            openTags.push('u');
            currentStyles.underline = true;
          }
        } else if (param >= 30 && param <= 37) {
          // Foreground color
          const color = this.colorCodes.get(param.toString());
          if (color && currentStyles.color !== color.hex) {
            result += `<span style="color: ${color.hex}">`;
            openTags.push('span');
            currentStyles.color = color.hex;
          }
        } else if (param >= 40 && param <= 47) {
          // Background color
          const color = this.colorCodes.get(param.toString());
          if (color && currentStyles.backgroundColor !== color.hex) {
            result += `<span style="background-color: ${color.hex}">`;
            openTags.push('span');
            currentStyles.backgroundColor = color.hex;
          }
        }
      }

      return result;
    });

    // Close any remaining open tags
    html += openTags.reverse().map(tag => `</${tag}>`).join('');

    // Escape any remaining HTML characters
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Detect and strip progress indicators
   */
  stripProgressIndicators(text: string): string {
    // Common progress indicators
    const progressPatterns = [
      /\r[^\n]*[\u2588\u2589\u258A\u258B\u258C\u258D\u258E\u258F\u2590][^\n]*/, // Block progress bars
      /\r[^\n]*[░▒▓█][^\n]*/, // Block elements
      /\r[^\n]*[⠁⠂⠄⡀⢀⠠⠐⠈][^\n]*/, // Braille spinners
      /\r[^\n]*[\|\-\/\\][^\n]*/, // Simple spinners
      /\r[^\n]*\d+%[^\n]*/, // Percentage indicators
      /\r.*?[\r\n]/, // Any carriage return line
    ];

    let result = text;
    for (const pattern of progressPatterns) {
      result = result.replace(pattern, '');
    }

    return result;
  }

  /**
   * Detect if text contains progress indicators
   */
  containsProgressIndicators(text: string): boolean {
    const progressChars = ['█', '▓', '▒', '░', '⠁', '⠂', '⠄', '|', '\\', '/', '-'];
    return progressChars.some(char => text.includes(char)) ||
           text.includes('%') ||
           text.includes('\r');
  }
}