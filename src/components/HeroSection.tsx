/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, CheckCircle2, RotateCcw, Wand2 } from 'lucide-react';
import { FontStoreType } from '../store/fontStore';

interface HeroSectionProps {
  store: FontStoreType;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ store }) => {
  const {
    drawnCountInMode,
    totalCharactersInMode,
    progressPercent,
    unlockRemaining,
    canDownload,
    loadSampleHandwriting,
    resetAllDrawings,
  } = store;

  return (
    <div className="pt-8 pb-6 border-b border-gray-100">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Heading and Stepper */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            A Little Handwriting, A Lot of You
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight">
            তোমার ছাঁচে, <br />
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              তোমার ফন্ট।
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
            Turn your Bangla handwriting into a font. Pick a letter below and make it
            yours — every little wobble is welcome.
          </p>

          {/* Stepper Pill */}
          <div className="inline-flex flex-wrap items-center gap-3 sm:gap-4 p-1.5 px-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5 text-purple-700">
              <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold">1</span>
              Pick a letter
            </span>
            <span className="text-gray-300">➔</span>
            <span className="flex items-center gap-1.5 text-indigo-700">
              <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold">2</span>
              Draw it
            </span>
            <span className="text-gray-300">➔</span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold">3</span>
              Download .TTF
            </span>
          </div>
        </div>

        {/* Right Column: Kid-Friendly Progress Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl bg-gradient-to-br from-purple-50/80 via-white to-blue-50/80 p-6 sm:p-7 border border-purple-100/80 shadow-lg shadow-purple-500/5">
            {/* Top row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {drawnCountInMode === 0
                    ? 'আঁকা শুরু হোক!'
                    : drawnCountInMode >= 3
                    ? 'চমৎকার হচ্ছে!'
                    : 'সুন্দর হচ্ছে!'}
                </h2>
              </div>

              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={loadSampleHandwriting}
                  className="px-2 py-1 rounded-lg text-purple-700 hover:bg-purple-100 font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="নমুনা হাতের লেখা দিয়ে পূরণ করুন"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>নমুনা লোড</span>
                </button>
                {drawnCountInMode > 0 && (
                  <button
                    onClick={resetAllDrawings}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="সব অক্ষর খালি করুন"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Big Stat Count */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl sm:text-5xl font-black text-gray-900 font-serif">
                {drawnCountInMode}
              </span>
              <span className="text-base sm:text-lg font-medium text-gray-600">
                / {totalCharactersInMode} letters drawn
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-gray-200/80 overflow-hidden p-0.5 mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>

            {/* Unlock Status */}
            <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
              {canDownload ? (
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ফন্ট ডাউনলোড আনলকড! চাইলে এখনই .TTF ডাউনলোড করতে পারেন।</span>
                </div>
              ) : (
                <span>
                  <strong>{unlockRemaining} more letters</strong> to unlock your font
                </span>
              )}
              <span className="font-bold text-gray-700">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
