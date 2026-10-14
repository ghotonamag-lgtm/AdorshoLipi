/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import opentype from 'opentype.js';
import { BanglaCharacterDefinition, FontMetadata, UserDrawingRecord } from '../types/font';
import { ALL_BANGLA_CHARACTERS, BANGLA_CONJUNCTS } from '../data/banglaCharacters';

/**
 * Transforms SVG coordinate (0..1000, Y down) into OpenType font coordinates (unitsPerEm=1000, baseline=0, Y up)
 */
function toFontCoords(svgX: number, svgY: number): { x: number; y: number } {
  // SVG baseline is around y = 800, matra is around y = 220
  // In font coords, baseline is at y = 0, matra is at y = 580 (800 - 220)
  const fontX = Math.round(svgX);
  const fontY = Math.round(800 - svgY);
  return { x: fontX, y: fontY };
}

/**
 * Expands an open centerline path into a ribbon outline with a specified stroke thickness
 */
function expandPointsToOutline(points: { x: number; y: number }[], thickness = 28): opentype.Path {
  const path = new opentype.Path();
  if (points.length < 2) return path;

  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];
  const half = thickness / 2;

  for (let i = 0; i < points.length; i++) {
    const cur = points[i];
    let dx = 0;
    let dy = 0;

    if (i < points.length - 1) {
      const next = points[i + 1];
      dx = next.x - cur.x;
      dy = next.y - cur.y;
    } else if (i > 0) {
      const prev = points[i - 1];
      dx = cur.x - prev.x;
      dy = cur.y - prev.y;
    }

    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    leftSide.push({ x: cur.x + nx * half, y: cur.y + ny * half });
    rightSide.push({ x: cur.x - nx * half, y: cur.y - ny * half });
  }

  // Draw clockwise closed polygon
  const start = leftSide[0];
  path.moveTo(start.x, start.y);

  for (let i = 1; i < leftSide.length; i++) {
    path.lineTo(leftSide[i].x, leftSide[i].y);
  }

  // End cap
  const lastRight = rightSide[rightSide.length - 1];
  path.lineTo(lastRight.x, lastRight.y);

  for (let i = rightSide.length - 2; i >= 0; i--) {
    path.lineTo(rightSide[i].x, rightSide[i].y);
  }

  path.close();
  return path;
}

/**
 * Parses an SVG path string into an opentype.Path object with proper TrueType coordinate inversion
 */
export function svgPathToOpenTypePath(svgPathStr: string): opentype.Path {
  const path = new opentype.Path();
  if (!svgPathStr || !svgPathStr.trim()) return path;

  const isClosedRibbon = /z/i.test(svgPathStr);

  // Split into tokens
  const commands = svgPathStr.match(/[a-df-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/gi);
  if (!commands) return path;

  let i = 0;
  let currentCmd = '';
  let curX = 0;
  let curY = 0;

  const currentPoints: { x: number; y: number }[] = [];

  const flushPoints = () => {
    if (currentPoints.length >= 2) {
      const outline = expandPointsToOutline(currentPoints, 32);
      outline.commands.forEach((cmd) => {
        if (cmd.type === 'M') path.moveTo(cmd.x, cmd.y);
        else if (cmd.type === 'L') path.lineTo(cmd.x, cmd.y);
        else if (cmd.type === 'C') path.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        else if (cmd.type === 'Q') path.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        else if (cmd.type === 'Z') path.close();
      });
      currentPoints.length = 0;
    }
  };

  while (i < commands.length) {
    const token = commands[i];

    if (/^[a-df-z]$/i.test(token)) {
      currentCmd = token;
      i++;
      if (currentCmd.toUpperCase() === 'Z') {
        if (!isClosedRibbon) flushPoints();
        path.close();
      }
      continue;
    }

    if (currentCmd.toUpperCase() === 'M') {
      if (!isClosedRibbon) flushPoints();
      const rawX = parseFloat(token);
      const rawY = parseFloat(commands[++i]);
      const p = toFontCoords(rawX, rawY);
      curX = p.x;
      curY = p.y;
      if (isClosedRibbon) {
        path.moveTo(curX, curY);
      } else {
        currentPoints.push({ x: curX, y: curY });
      }
      i++;
    } else if (currentCmd.toUpperCase() === 'L') {
      const rawX = parseFloat(token);
      const rawY = parseFloat(commands[++i]);
      const p = toFontCoords(rawX, rawY);
      curX = p.x;
      curY = p.y;
      if (isClosedRibbon) {
        path.lineTo(curX, curY);
      } else {
        currentPoints.push({ x: curX, y: curY });
      }
      i++;
    } else if (currentCmd.toUpperCase() === 'Q') {
      const x1 = parseFloat(token);
      const y1 = parseFloat(commands[++i]);
      const x = parseFloat(commands[++i]);
      const y = parseFloat(commands[++i]);
      const p1 = toFontCoords(x1, y1);
      const p = toFontCoords(x, y);

      if (isClosedRibbon) {
        path.quadraticCurveTo(p1.x, p1.y, p.x, p.y);
      } else {
        for (let t = 0.25; t <= 1.0; t += 0.25) {
          const u = 1 - t;
          const qx = u * u * curX + 2 * u * t * p1.x + t * t * p.x;
          const qy = u * u * curY + 2 * u * t * p1.y + t * t * p.y;
          currentPoints.push({ x: qx, y: qy });
        }
      }

      curX = p.x;
      curY = p.y;
      i++;
    } else if (currentCmd.toUpperCase() === 'C') {
      const x1 = parseFloat(token);
      const y1 = parseFloat(commands[++i]);
      const x2 = parseFloat(commands[++i]);
      const y2 = parseFloat(commands[++i]);
      const x = parseFloat(commands[++i]);
      const y = parseFloat(commands[++i]);
      const p1 = toFontCoords(x1, y1);
      const p2 = toFontCoords(x2, y2);
      const p = toFontCoords(x, y);

      if (isClosedRibbon) {
        path.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y);
      } else {
        for (let t = 0.2; t <= 1.0; t += 0.2) {
          const u = 1 - t;
          const cx =
            u * u * u * curX +
            3 * u * u * t * p1.x +
            3 * u * t * t * p2.x +
            t * t * t * p.x;
          const cy =
            u * u * u * curY +
            3 * u * u * t * p1.y +
            3 * u * t * t * p2.y +
            t * t * t * p.y;
          currentPoints.push({ x: cx, y: cy });
        }
      }

      curX = p.x;
      curY = p.y;
      i++;
    } else {
      i++;
    }
  }

  if (!isClosedRibbon) flushPoints();
  return path;
}

/**
 * Creates the standard .notdef glyph required by TrueType specifications
 */
function createNotDefGlyph(): opentype.Glyph {
  const path = new opentype.Path();
  // Outer rectangle
  path.moveTo(100, 0);
  path.lineTo(600, 0);
  path.lineTo(600, 700);
  path.lineTo(100, 700);
  path.close();

  // Inner cutout
  path.moveTo(150, 50);
  path.lineTo(150, 650);
  path.lineTo(550, 650);
  path.lineTo(550, 50);
  path.close();

  return new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 700,
    path,
  });
}

/**
 * Creates a standard Space glyph
 */
function createSpaceGlyph(): opentype.Glyph {
  const path = new opentype.Path();
  return new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: 320,
    path,
  });
}

/**
 * Compiles a full OpenType Font in browser memory from the application state
 */
export function compileBanglaFont(
  metadata: FontMetadata,
  drawings: Record<string, UserDrawingRecord>
): opentype.Font {
  const glyphs: opentype.Glyph[] = [];

  // 1. Mandatory .notdef glyph
  glyphs.push(createNotDefGlyph());

  // 2. Space glyph
  glyphs.push(createSpaceGlyph());

  // 3. Process every Bangla letter in database
  ALL_BANGLA_CHARACTERS.forEach((charDef: BanglaCharacterDefinition) => {
    const userDrawing = drawings[charDef.id];
    const svgPathToUse = userDrawing ? userDrawing.svgPath : charDef.referenceSvgPath;

    let opPath = svgPathToOpenTypePath(svgPathToUse);

    // If path is empty, make a minimal subtle mark so the glyph is valid
    if (opPath.commands.length === 0) {
      opPath = svgPathToOpenTypePath(charDef.referenceSvgPath);
    }

    const glyphConfig: opentype.GlyphOptions = {
      name: charDef.id,
      unicode: charDef.unicodeDec,
      advanceWidth: charDef.advanceWidth || 750,
      path: opPath,
    };

    const glyph = new opentype.Glyph(glyphConfig);
    glyphs.push(glyph);
  });

  // 4. Initialize opentype.Font instance
  const font = new opentype.Font({
    familyName: metadata.fontName || 'AdorshoLipi Custom',
    styleName: metadata.styleName || 'Regular',
    unitsPerEm: metadata.unitsPerEm || 1000,
    ascender: metadata.ascender || 800,
    descender: metadata.descender || -200,
    glyphs,
  });

  // 5. OpenType GSUB Layout Tables (Ligature Substitution for Juktakkhor)
  // Maps sequences of: [Base Consonant] + [Hasant (0x09CD)] + [Secondary Consonant] -> Juktakkhor Glyph
  try {
    const ligaturesList: Array<{ sub: number[]; by: number }> = [];

    BANGLA_CONJUNCTS.forEach((conjunct) => {
      if (conjunct.ligatureComponents && conjunct.ligatureComponents.length >= 3) {
        // Find glyph index for this conjunct in font.glyphs
        const glyphIndex = glyphs.findIndex((g) => g.name === conjunct.id);
        if (glyphIndex >= 0) {
          // Components as glyph indices or unicode decimal sequences
          ligaturesList.push({
            sub: conjunct.ligatureComponents,
            by: glyphIndex,
          });
        }
      }
    });

    // Program GSUB table ligature substitution feature
    if (ligaturesList.length > 0) {
      // opentype.js GSUB custom ligature table structure
      (font.tables as Record<string, unknown>).gsub = {
        version: 1,
        scripts: [
          {
            tag: 'bng2', // Bengali new script tag
            script: {
              defaultLangSys: {
                reqFeatureIndex: 0xFFFF,
                featureIndexes: [0],
              },
              langSysRecords: [],
            },
          },
          {
            tag: 'beng', // Bengali traditional tag
            script: {
              defaultLangSys: {
                reqFeatureIndex: 0xFFFF,
                featureIndexes: [0],
              },
              langSysRecords: [],
            },
          },
          {
            tag: 'DFLT',
            script: {
              defaultLangSys: {
                reqFeatureIndex: 0xFFFF,
                featureIndexes: [0],
              },
              langSysRecords: [],
            },
          },
        ],
        features: [
          {
            tag: 'liga',
            feature: {
              lookupListIndexes: [0],
            },
          },
        ],
        lookups: [
          {
            lookupType: 4, // Ligature Substitution
            lookupFlag: 0,
            subtables: [
              {
                substFormat: 1,
                coverage: {
                  format: 1,
                  glyphs: ligaturesList.map((l) => {
                    const firstChar = l.sub[0];
                    return glyphs.findIndex((g) => g.unicode === firstChar);
                  }),
                },
                ligatureSets: ligaturesList.map((l) => [
                  {
                    ligGlyph: l.by,
                    components: l.sub.slice(1).map((code) => glyphs.findIndex((g) => g.unicode === code)),
                  },
                ]),
              },
            ],
          },
        ],
      };
    }
  } catch (err) {
    console.warn('Could not compile GSUB table:', err);
  }

  return font;
}

/**
 * Downloads the generated font as a .TTF file
 */
export function downloadFont(
  metadata: FontMetadata,
  drawings: Record<string, UserDrawingRecord>
) {
  const font = compileBanglaFont(metadata, drawings);
  const cleanName = (metadata.fontName || 'AdorshoLipi')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '');
  font.download(`${cleanName}.ttf`);
}

/**
 * Registers the compiled font dynamically into document.fonts for real-time CSS rendering
 */
export async function registerLiveFontFace(
  font: opentype.Font,
  fontFamilyName = 'AdorshoLipiLive'
): Promise<boolean> {
  try {
    const buffer = font.toArrayBuffer();
    const fontFace = new FontFace(fontFamilyName, buffer);
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    return true;
  } catch (err) {
    console.warn('Failed to register live FontFace:', err);
    return false;
  }
}
