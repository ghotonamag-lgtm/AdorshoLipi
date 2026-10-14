/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FontStoreType } from '../store/fontStore';
import { CharacterCard } from './CharacterCard';
import {
  BANGLA_VOWELS,
  BANGLA_CONSONANTS,
  BANGLA_VOWEL_SIGNS,
  BANGLA_CONJUNCTS,
  BANGLA_DIGITS,
  MODE_CONFIG,
} from '../data/banglaCharacters';
import { BanglaCharacterDefinition } from '../types/font';
import { Info, Sparkles } from 'lucide-react';

interface CharacterMatrixProps {
  store: FontStoreType;
}

export const CharacterMatrix: React.FC<CharacterMatrixProps> = ({ store }) => {
  const {
    drawings,
    fontMetadata,
    activeMode,
    filterStatus,
    setFilterStatus,
    setSelectedCharId,
  } = store;

  const currentModeSections = MODE_CONFIG[activeMode].sections;

  // Filter helper
  const filterList = (chars: BanglaCharacterDefinition[]) => {
    if (filterStatus === 'all') return chars;
    if (filterStatus === 'completed') return chars.filter((c) => !!drawings[c.id]);
    if (filterStatus === 'ready') return chars.filter((c) => !drawings[c.id]);
    return chars;
  };

  const vowels = filterList(BANGLA_VOWELS);
  const consonants = filterList(BANGLA_CONSONANTS);
  const vowelSigns = filterList(BANGLA_VOWEL_SIGNS);
  const conjuncts = filterList(BANGLA_CONJUNCTS);
  const digits = filterList(BANGLA_DIGITS);

  // Section counters
  const countDrawn = (list: BanglaCharacterDefinition[]) =>
    list.filter((c) => !!drawings[c.id]).length;

  return (
    <div className="py-6 space-y-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Your character collection
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Tap any card to start. Tap a completed letter to make it even more you.
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100/80 border border-gray-200 text-xs font-semibold text-gray-600">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'hover:text-gray-900'
            }`}
          >
            সবগুলো
          </button>
          <button
            onClick={() => setFilterStatus('ready')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'ready'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'hover:text-gray-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Ready to draw</span>
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'completed'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'hover:text-gray-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Completed</span>
          </button>
        </div>
      </div>

      {/* 1. স্বরবর্ণ (Vowels - 11) */}
      {currentModeSections.includes('vowel') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-serif">
                স্বরবর্ণ (Vowels - 11)
              </h3>
              <span className="text-xs font-semibold text-gray-600">
                {countDrawn(BANGLA_VOWELS)} / 11 drawn
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-3 sm:gap-3.5">
            {vowels.map((charDef) => (
              <CharacterCard
                key={charDef.id}
                charDef={charDef}
                drawing={drawings[charDef.id]}
                onClick={() => setSelectedCharId(charDef.id)}
                fontName={fontMetadata.fontName}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. ব্যঞ্জনবর্ণ (Consonants - 39) */}
      {currentModeSections.includes('consonant') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-serif">
                ব্যঞ্জনবর্ণ (Consonants - 39)
              </h3>
              <span className="text-xs font-semibold text-gray-600">
                {countDrawn(BANGLA_CONSONANTS)} / 39 drawn
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-3.5">
            {consonants.map((charDef) => (
              <CharacterCard
                key={charDef.id}
                charDef={charDef}
                drawing={drawings[charDef.id]}
                onClick={() => setSelectedCharId(charDef.id)}
                fontName={fontMetadata.fontName}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. কার চিহ্ন (Vowel Modifiers - 10) */}
      {currentModeSections.includes('vowel-sign') && (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-serif">
                কার চিহ্ন (Vowel Modifiers - 10)
              </h3>
              <span className="text-xs font-semibold text-gray-600">
                {countDrawn(BANGLA_VOWEL_SIGNS)} / 10 drawn
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 w-fit">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>The dotted circle is just a guide. Draw only the vowel mark.</span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-3.5">
            {vowelSigns.map((charDef) => (
              <CharacterCard
                key={charDef.id}
                charDef={charDef}
                drawing={drawings[charDef.id]}
                onClick={() => setSelectedCharId(charDef.id)}
                fontName={fontMetadata.fontName}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. যুক্তবর্ণ (Core Conjuncts - 15) */}
      {currentModeSections.includes('conjunct') && (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-serif">
                যুক্তবর্ণ (Core Juktakkhor - 15)
              </h3>
              <span className="text-xs font-semibold text-gray-600">
                {countDrawn(BANGLA_CONJUNCTS)} / 15 drawn
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 w-fit">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-600" />
              <span>ওপেনটাইপ লাইগেচার (OpenType GSUB Ligature) স্বয়ংক্রিয়ভাবে তৈরি হবে।</span>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-3 sm:gap-3.5">
            {conjuncts.map((charDef) => (
              <CharacterCard
                key={charDef.id}
                charDef={charDef}
                drawing={drawings[charDef.id]}
                onClick={() => setSelectedCharId(charDef.id)}
                fontName={fontMetadata.fontName}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. সংখ্যা (Digits - 10) */}
      {currentModeSections.includes('digit') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-serif">
                বাংলা সংখ্যা (Digits - 10)
              </h3>
              <span className="text-xs font-semibold text-gray-600">
                {countDrawn(BANGLA_DIGITS)} / 10 drawn
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-3.5">
            {digits.map((charDef) => (
              <CharacterCard
                key={charDef.id}
                charDef={charDef}
                drawing={drawings[charDef.id]}
                onClick={() => setSelectedCharId(charDef.id)}
                fontName={fontMetadata.fontName}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
