/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { PlaygroundMode } from '../types/font';
import { FontStoreType } from '../store/fontStore';

interface PlaygroundModeSelectorProps {
  store: FontStoreType;
}

export const PlaygroundModeSelector: React.FC<PlaygroundModeSelectorProps> = ({ store }) => {
  const { activeMode, setActiveMode } = store;

  const modes: Array<{
    id: PlaygroundMode;
    title: string;
    description: string;
    badge: string;
    dotColor: string;
    activeBorder: string;
    activeBg: string;
  }> = [
    {
      id: 'easy',
      title: 'Easy Mode (Vowels & Consonants)',
      description: 'Your everyday letters. 50 happy ones.',
      badge: '৫০টি অক্ষর',
      dotColor: 'bg-emerald-500',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      activeBg: 'bg-emerald-50/40',
    },
    {
      id: 'medium',
      title: 'Medium Mode (+ Core Juktakkhor)',
      description: 'A little challenge with joined letters & vowel signs.',
      badge: '৭৫টি রূপ',
      dotColor: 'bg-amber-500',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
      activeBg: 'bg-amber-50/40',
    },
    {
      id: 'typographer',
      title: 'Typographer Mode (All Variants)',
      description: 'The whole alphabet adventure including digits.',
      badge: '৮৫টি রূপ',
      dotColor: 'bg-rose-500',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
      activeBg: 'bg-rose-50/40',
    },
  ];

  return (
    <div className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Choose your playground</h2>
          <p className="text-xs sm:text-sm text-gray-600">Start easy. Explore at your own pace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((m) => {
          const isSelected = activeMode === m.id;

          return (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? `${m.activeBorder} ${m.activeBg} shadow-sm`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${m.dotColor}`} />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border border-gray-200/80 text-gray-700 shadow-2xs">
                    {m.badge}
                  </span>
                </div>

                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-gray-900" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
                {m.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {m.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
