/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Download, Type, Lock, Feather } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FontStoreType } from '../store/fontStore';
import { downloadFont } from '../utils/fontCompiler';
import { PWAInstallButton } from './PWAInstallButton';
import { FontPreviewThumbnail } from './FontPreviewThumbnail';

interface HeaderProps {
  store: FontStoreType;
}

export const Header: React.FC<HeaderProps> = ({ store }) => {
  const {
    drawings,
    fontMetadata,
    canDownload,
    unlockRemaining,
    drawnCountInMode,
    setIsTestDriveOpen,
  } = store;

  const handleDownload = () => {
    if (!canDownload) return;

    // Trigger joyful celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.2 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      });
    } catch {
      // fallback
    }

    downloadFont(fontMetadata, drawings);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Feather className="w-5 h-5 -rotate-12" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-serif">
                আদর্শলিপি
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                PWA
              </span>
            </div>
            <p className="hidden sm:block text-xs text-gray-600 font-medium">
              হাতের লেখায় তৈরি পূর্ণাঙ্গ বাংলা ইউনিকোড ফন্ট
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live opentype.js Font Preview Thumbnail */}
          <FontPreviewThumbnail store={store} />

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Test Drive Button */}
          <button
            onClick={() => setIsTestDriveOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors shadow-2xs cursor-pointer"
            title="Open Interactive Typing Sandbox"
          >
            <Type className="w-4 h-4 text-purple-600" />
            <span className="hidden md:inline">টেস্ট ড্রাইভ</span>
            <span className="md:hidden">টেস্ট</span>
          </button>

          {/* Download Button */}
          {canDownload ? (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md shadow-indigo-500/25 hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow text-yellow-300" />
              <span>✨ Download My .TTF Font</span>
            </button>
          ) : (
            <div className="relative group">
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-80"
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span className="hidden sm:inline">✨ Download My .TTF Font</span>
                <span className="sm:hidden">ডাউনলোড</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600">
                  {drawnCountInMode}/3
                </span>
              </button>
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col items-center z-50 w-64 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-gray-800 text-center">
                  ডাউনলোড আনলক করতে আর মাত্র <strong>{unlockRemaining}টি</strong> অক্ষর আঁকুন!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
