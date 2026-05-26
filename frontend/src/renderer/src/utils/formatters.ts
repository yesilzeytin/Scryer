/**
 * Converts a raw binary VCD/FST string into the user's requested radix representation.
 * Handles Unknown (X) and High-Z (Z) states cleanly.
 * 
 * @param valStr - The raw string value from the backend (e.g. '010x0')
 * @param bitwidth - The width of the signal
 * @param radix - The requested formatting (e.g. 'hex', 'octal', 'ascii')
 * @returns The formatted string
 */
export function formatValue(valStr: string | undefined, bitwidth: number, radix: string): string {
  if (!valStr) return '';
  const binStr = String(valStr).toLowerCase();
  
  if (radix === 'binary') return binStr;

  const isAllX = /^[xXuUwW\-]+$/.test(binStr);
  if (isAllX) return binStr[0] === 'x' ? 'X' : 'Z';

  if (radix === 'hex') {
    let padded = binStr;
    while (padded.length % 4 !== 0) {
      padded = padded[0] === 'x' ? 'x' + padded : (padded[0] === 'z' ? 'z' + padded : '0' + padded);
    }
    let hex = '';
    for (let i = 0; i < padded.length; i += 4) {
      const nibble = padded.slice(i, i + 4);
      if (/^[xXuUwW\-]+$/.test(nibble)) hex += 'X';
      else if (/^[zZ]+$/.test(nibble)) hex += 'Z';
      else {
        const parsed = parseInt(nibble, 2);
        if (isNaN(parsed)) return binStr;
        hex += parsed.toString(16).toUpperCase();
      }
    }
    return '0x' + hex;
  }

  if (/[xXuUwWzZ\-]/i.test(binStr)) return binStr;

  const num = parseInt(binStr, 2);
  if (isNaN(num)) return binStr;

  if (radix === 'octal') return '0o' + num.toString(8);
  if (radix === 'decimal' || radix === 'unsigned') return num.toString(10);
  if (radix === 'ascii') {
    let ascii = '';
    let padded = binStr;
    while (padded.length % 8 !== 0) padded = '0' + padded;
    for (let i = 0; i < padded.length; i += 8) {
      const byte = parseInt(padded.slice(i, i+8), 2);
      if (byte >= 32 && byte <= 126) ascii += String.fromCharCode(byte);
      else ascii += '.';
    }
    return ascii || '.';
  }

  return binStr;
}
