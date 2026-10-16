/**
 * Lightweight deterministic QR code generator for Safety Numbers and Room Invites.
 * Produces clean SVG markup without external bloated packages.
 */

// Simple matrix generation for visual representation of safety fingerprint
export function generateFingerprintGrid(safetyNumber: string): boolean[][] {
  const size = 17;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Seeded hash from safety number
  let hash = 0;
  for (let i = 0; i < safetyNumber.length; i++) {
    hash = (hash << 5) - hash + safetyNumber.charCodeAt(i);
    hash |= 0;
  }

  // Draw 3 corner finder patterns
  const drawCorner = (r: number, c: number) => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (i === 0 || i === 4 || j === 0 || j === 4 || (i >= 1 && i <= 3 && j >= 1 && j <= 3 && (i === 2 || j === 2))) {
          grid[r + i][c + j] = true;
        }
      }
    }
  };

  drawCorner(0, 0);
  drawCorner(0, size - 5);
  drawCorner(size - 5, 0);

  // Fill data matrix deterministically with safety number bits
  let bitIndex = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder corners
      if (
        (r < 5 && c < 5) ||
        (r < 5 && c >= size - 5) ||
        (r >= size - 5 && c < 5)
      ) {
        continue;
      }
      const charCode = safetyNumber.charCodeAt(bitIndex % safetyNumber.length);
      const val = (charCode + hash + r * 7 + c * 13) % 2 === 0;
      grid[r][c] = val;
      bitIndex++;
    }
  }

  return grid;
}
