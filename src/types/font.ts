/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CharacterCategory = 'vowel' | 'consonant' | 'vowel-sign' | 'conjunct' | 'digit';

export type MatraType = 'full' | 'half' | 'none';

export type BrushStyle = 'calligraphy' | 'brush' | 'pen';

export type SmoothingLevel = 'low' | 'medium' | 'high';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  brushStyle?: BrushStyle;
  smoothing?: SmoothingLevel;
}

export interface BanglaCharacterDefinition {
  id: string; // e.g., 'u0985' or 'jukto_ksho'
  char: string; // e.g. 'অ'
  nameBn: string; // 'স্বর অ'
  nameEn: string; // 'Shoro O'
  unicodeHex: string; // '0x0985'
  unicodeDec: number; // 2437
  category: CharacterCategory;
  exampleWordBn: string; // 'অজগর'
  exampleWordEn: string; // 'Python / Snake'
  emoji: string; // '🐍'
  matraType: MatraType; // 'full', 'half', or 'none'
  advanceWidth: number; // typically 700 - 1000 for unitsPerEm=1000
  // For conjuncts (Juktakkhor) requiring OpenType GSUB ligatures
  isConjunct?: boolean;
  ligatureComponents?: number[]; // Unicode decimals e.g. [0x0995, 0x09CD, 0x09B7]
  ligatureString?: string; // 'ক' + '্' + 'ষ'
  // Default reference SVG path string in 0 0 1000 1000 viewport
  referenceSvgPath: string;
}

export interface UserDrawingRecord {
  characterId: string;
  rawStrokes: Stroke[];
  svgPath: string; // SVG path data 'M ... C ... Z'
  timestamp: number;
  brushStyle?: BrushStyle;
}

export type PlaygroundMode = 'easy' | 'medium' | 'typographer';

export interface FontMetadata {
  fontName: string;
  authorName: string;
  styleName: string;
  version: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
}
