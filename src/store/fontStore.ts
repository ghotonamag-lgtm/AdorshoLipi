/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserDrawingRecord,
  PlaygroundMode,
  FontMetadata,
  Stroke,
  BanglaCharacterDefinition,
} from '../types/font';
import {
  ALL_BANGLA_CHARACTERS,
  BANGLA_CHAR_MAP,
  MODE_CONFIG,
} from '../data/banglaCharacters';

const STORAGE_KEY_DRAWINGS = 'adorsholipi_drawings_v1';
const STORAGE_KEY_MODE = 'adorsholipi_mode_v1';
const STORAGE_KEY_METADATA = 'adorsholipi_meta_v1';

const DEFAULT_METADATA: FontMetadata = {
  fontName: 'AdorshoLipi Custom',
  authorName: 'ছোট্ট শিল্পী (Young Artist)',
  styleName: 'Regular',
  version: '1.0.0',
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
};

// Fun initial handwritten sample letters for instant enjoyment
const PRELOADED_SAMPLE_IDS = ['u0985', 'u0986', 'u0995'];

export function useFontStore() {
  // 1. User Drawings State
  const [drawings, setDrawings] = useState<Record<string, UserDrawingRecord>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRAWINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read drawings from storage', e);
    }
    // Seed with pre-configured cute sample for first 3 letters so the user immediately sees the Figma state (3 letters drawn)
    const initialSamples: Record<string, UserDrawingRecord> = {};
    PRELOADED_SAMPLE_IDS.forEach((id) => {
      const def = BANGLA_CHAR_MAP[id];
      if (def) {
        initialSamples[id] = {
          characterId: id,
          rawStrokes: [],
          svgPath: def.referenceSvgPath,
          timestamp: Date.now(),
        };
      }
    });
    return initialSamples;
  });

  // 2. Active Mode State (Easy / Medium / Typographer)
  const [activeMode, setActiveMode] = useState<PlaygroundMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MODE);
      if (saved && (saved === 'easy' || saved === 'medium' || saved === 'typographer')) {
        return saved as PlaygroundMode;
      }
    } catch {
      // fallback
    }
    return 'easy';
  });

  // 3. Active filter tab ('all' | 'ready' | 'completed')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'completed'>('all');

  // 4. Currently Selected Character for Drawing Studio Modal
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // 5. Test-Drive Playground Modal State
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);

  // 6. Font Metadata
  const [fontMetadata, setFontMetadata] = useState<FontMetadata>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_METADATA);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_METADATA;
  });

  // Persist drawings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DRAWINGS, JSON.stringify(drawings));
    } catch (e) {
      console.error('Failed to persist drawings:', e);
    }
  }, [drawings]);

  // Persist mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MODE, activeMode);
    } catch (e) {
      console.error('Failed to persist mode:', e);
    }
  }, [activeMode]);

  // Persist metadata to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(fontMetadata));
    } catch (e) {
      console.error('Failed to persist metadata:', e);
    }
  }, [fontMetadata]);

  // Save or update a character drawing
  const saveDrawing = useCallback((charId: string, rawStrokes: Stroke[], svgPath: string) => {
    setDrawings((prev) => ({
      ...prev,
      [charId]: {
        characterId: charId,
        rawStrokes,
        svgPath,
        timestamp: Date.now(),
      },
    }));
  }, []);

  // Clear/delete a character drawing
  const clearDrawing = useCallback((charId: string) => {
    setDrawings((prev) => {
      const next = { ...prev };
      delete next[charId];
      return next;
    });
  }, []);

  // Reset all drawings
  const resetAllDrawings = useCallback(() => {
    setDrawings({});
  }, []);

  // Load sample handwriting
  const loadSampleHandwriting = useCallback(() => {
    const samples: Record<string, UserDrawingRecord> = {};
    ALL_BANGLA_CHARACTERS.forEach((char) => {
      samples[char.id] = {
        characterId: char.id,
        rawStrokes: [],
        svgPath: char.referenceSvgPath,
        timestamp: Date.now(),
      };
    });
    setDrawings(samples);
  }, []);

  // Characters in current mode
  const currentModeCharacters = useMemo(() => {
    const config = MODE_CONFIG[activeMode];
    return ALL_BANGLA_CHARACTERS.filter((c) => config.sections.includes(c.category));
  }, [activeMode]);

  // Navigation helpers for drawing studio modal
  const getNextCharId = useCallback((currentId: string): string | null => {
    const chars = currentModeCharacters;
    const currentIndex = chars.findIndex((c) => c.id === currentId);
    if (currentIndex >= 0 && currentIndex < chars.length - 1) {
      return chars[currentIndex + 1].id;
    }
    return chars[0]?.id || null;
  }, [currentModeCharacters]);

  const getPrevCharId = useCallback((currentId: string): string | null => {
    const chars = currentModeCharacters;
    const currentIndex = chars.findIndex((c) => c.id === currentId);
    if (currentIndex > 0) {
      return chars[currentIndex - 1].id;
    }
    return chars[chars.length - 1]?.id || null;
  }, [currentModeCharacters]);

  // Computed statistics
  const totalCharactersInMode = MODE_CONFIG[activeMode].totalLetters;
  const drawnCountInMode = useMemo(() => {
    return currentModeCharacters.filter((c) => !!drawings[c.id]).length;
  }, [currentModeCharacters, drawings]);

  const minRequiredForDownload = 3;
  const canDownload = drawnCountInMode >= minRequiredForDownload;
  const unlockRemaining = Math.max(0, minRequiredForDownload - drawnCountInMode);
  const progressPercent = Math.min(100, Math.round((drawnCountInMode / totalCharactersInMode) * 100));

  return {
    drawings,
    activeMode,
    setActiveMode,
    filterStatus,
    setFilterStatus,
    selectedCharId,
    setSelectedCharId,
    isTestDriveOpen,
    setIsTestDriveOpen,
    fontMetadata,
    setFontMetadata,
    saveDrawing,
    clearDrawing,
    resetAllDrawings,
    loadSampleHandwriting,
    currentModeCharacters,
    getNextCharId,
    getPrevCharId,
    totalCharactersInMode,
    drawnCountInMode,
    minRequiredForDownload,
    canDownload,
    unlockRemaining,
    progressPercent,
  };
}

export type FontStoreType = ReturnType<typeof useFontStore>;
