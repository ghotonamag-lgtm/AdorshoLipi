/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Sliders, RotateCcw, Download, Printer } from 'lucide-react';
import { FontStoreType } from '../store/fontStore';
import { BANGLA_CHAR_LOOKUP_BY_CHAR } from '../data/banglaCharacters';
import { downloadFont } from '../utils/fontCompiler';

interface TestDriveModalProps {
  store: FontStoreType;
}

const PRESET_SENTENCES = [
  'আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।',
  'আম পাতা জোড়া জোড়া, মারব চাবুক চড়ব ঘোড়া।',
  'আমাদের ছোট নদী চলে বাঁকে বাঁকে।',
  'কাক কালো কোকিল কালো, কদম ফুল কি সাদা?',
  'অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ',
  'ক খ গ ঘ ঙ চ ছ জ ঝ ঞ',
];

export const TestDriveModal: React.FC<TestDriveModalProps> = ({ store }) => {
  const {
    isTestDriveOpen,
    setIsTestDriveOpen,
    drawings,
    fontMetadata,
    canDownload,
  } = store;

  const [text, setText] = useState('আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।');
  const [fontSize, setFontSize] = useState(48);

  if (!isTestDriveOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                ফন্ট টেস্ট ড্রাইভ (Live Typography Playground)
              </h3>
              <p className="text-xs text-gray-600">
                নিচে যেকোনো বাংলা বাক্য লিখে দেখুন আপনার হাতের লেখায় তা কেমন দেখাচ্ছে!
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTestDriveOpen(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              জনপ্রিয় বাংলা ছড়া ও বাক্য
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SENTENCES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setText(preset)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-purple-50 hover:text-purple-700 border border-gray-200 hover:border-purple-200 transition cursor-pointer"
                >
                  {preset.length > 25 ? `${preset.slice(0, 25)}...` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Typing Input */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              এখানে লিখুন
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="যেকোনো বাংলা লেখা টাইপ করুন..."
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-base sm:text-lg text-gray-800 resize-none font-serif"
            />
          </div>

          {/* Font Controls */}
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>ফন্ট সাইজ: {fontSize}px</span>
            </div>
            <input
              type="range"
              min="24"
              max="96"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-48 sm:w-64 accent-purple-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Live Render Sandbox */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              হাতের লেখার ফন্ট ভিউ
            </label>
            <div className="min-h-[160px] p-6 rounded-3xl bg-amber-50/20 border-2 border-dashed border-gray-200 flex flex-wrap items-baseline gap-y-3 leading-relaxed">
              {text.split('').map((char, index) => {
                const charDef = BANGLA_CHAR_LOOKUP_BY_CHAR[char];
                const drawing = charDef ? drawings[charDef.id] : undefined;

                if (char === ' ') {
                  return <span key={index} style={{ width: `${fontSize * 0.35}px` }} />;
                }

                if (char === '\n') {
                  return <div key={index} className="w-full" />;
                }

                if (drawing && drawing.svgPath) {
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center justify-center relative"
                      style={{
                        width: `${fontSize * 0.85}px`,
                        height: `${fontSize * 1.1}px`,
                      }}
                      title={`${char} (Your hand-drawn glyph)`}
                    >
                      <svg
                        viewBox="0 0 1000 1000"
                        className="w-full h-full text-gray-950"
                        style={{
                          fill: 'none',
                          stroke: 'currentColor',
                          strokeWidth: 32,
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                        }}
                      >
                        <path d={drawing.svgPath} />
                      </svg>
                    </span>
                  );
                }

                // Reference glyph or standard font fallback
                return (
                  <span
                    key={index}
                    className="inline-block text-gray-800 font-serif"
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => setText('আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>রিসেট টেক্সট</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট শিট</span>
            </button>

            <button
              onClick={() => downloadFont(fontMetadata, drawings)}
              disabled={!canDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ফন্ট ডাউনলোড (.TTF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
