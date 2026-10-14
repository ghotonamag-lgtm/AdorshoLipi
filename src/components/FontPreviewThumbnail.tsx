/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Type, Sparkles, ZoomIn, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { FontStoreType } from '../store/fontStore';
import { compileBanglaFont } from '../utils/fontCompiler';
import { BANGLA_CHAR_MAP } from '../data/banglaCharacters';

interface FontPreviewThumbnailProps {
  store: FontStoreType;
}

export const FontPreviewThumbnail: React.FC<FontPreviewThumbnailProps> = ({ store }) => {
  const { drawings, fontMetadata, drawnCountInMode, setIsTestDriveOpen } = store;

  const thumbnailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const popoverCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [previewFontSize, setPreviewFontSize] = useState(48);
  const [previewSampleText, setPreviewSampleText] = useState('অ আ ক খ');

  // Determine which characters to showcase in the preview
  // Prioritize letters the user has actively drawn, or default to foundational alphabet letters
  const showcaseLetters = useMemo(() => {
    const drawnKeys = Object.keys(drawings);
    if (drawnKeys.length > 0) {
      // Pick up to 5 drawn characters
      const chars = drawnKeys
        .map((key) => BANGLA_CHAR_MAP[key]?.char)
        .filter(Boolean) as string[];
      return chars.slice(0, 5).join(' ');
    }
    // Default foundational Bangla letters
    return 'অ আ ক খ';
  }, [drawings]);

  // Compile the opentype.js font instance in browser memory whenever drawings change
  const opentypeFont = useMemo(() => {
    try {
      return compileBanglaFont(fontMetadata, drawings);
    } catch (err) {
      console.warn('Failed to compile font in memory for thumbnail:', err);
      return null;
    }
  }, [fontMetadata, drawings]);

  // Render the mini thumbnail in the Header using opentype.js
  useEffect(() => {
    const canvas = thumbnailCanvasRef.current;
    if (!canvas || !opentypeFont) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 110;
    const height = 36;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Subtle background
    ctx.fillStyle = '#faf5ff'; // subtle purple-50
    ctx.fillRect(0, 0, width, height);

    // Draw Shirorekha / Matra line guideline
    ctx.strokeStyle = '#fbcfe8'; // light pink/red
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.lineTo(width, 11);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw baseline guideline
    ctx.strokeStyle = '#dbeafe'; // light blue
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(width, 28);
    ctx.stroke();

    try {
      // Use opentype.js getPath to render the alphabet sample directly onto the canvas!
      const displayText = showcaseLetters.slice(0, 7); // keep compact
      const fontSize = 21;
      const x = 6;
      const y = 28; // text baseline

      // Render with opentype.js Path
      const path = opentypeFont.getPath(displayText, x, y, fontSize);
      path.fill = '#4c1d95'; // deep purple-900
      path.draw(ctx);
    } catch (e) {
      console.error('opentype.js thumbnail render error:', e);
    }
  }, [opentypeFont, showcaseLetters]);

  // Render the expanded popover canvas using opentype.js
  useEffect(() => {
    if (!isOpen) return;

    const canvas = popoverCanvasRef.current;
    if (!canvas || !opentypeFont) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 420;
    const height = 110;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Clean canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw Matra and Baseline guidelines
    const baselineY = Math.round(height * 0.75);
    const matraY = Math.round(height * 0.75 - previewFontSize * 0.58);

    ctx.strokeStyle = '#fca5a5'; // red-300
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, matraY);
    ctx.lineTo(width, matraY);
    ctx.stroke();

    ctx.strokeStyle = '#93c5fd'; // blue-300
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(width, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    try {
      const textToRender = previewSampleText || showcaseLetters;
      const path = opentypeFont.getPath(textToRender, 16, baselineY, previewFontSize);
      path.fill = '#1e1b4b';
      path.draw(ctx);
    } catch (e) {
      console.error('opentype.js expanded preview error:', e);
    }
  }, [isOpen, opentypeFont, previewSampleText, previewFontSize, showcaseLetters]);

  return (
    <div className="relative">
      {/* Thumbnail Button in Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl border border-purple-200/90 bg-white hover:bg-purple-50/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        title="Open opentype.js Live Font Preview"
        aria-label="Font Preview Thumbnail"
      >
        {/* Real-time opentype.js Canvas Thumbnail */}
        <div className="relative flex flex-col items-start">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider leading-none">
              ফন্ট প্রিভিউ
            </span>
            <span className="text-[9px] font-semibold text-purple-600 bg-purple-100 px-1 py-0.2 rounded-xs">
              opentype.js
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-purple-200/70 bg-purple-50/40 shadow-inner">
            <canvas
              ref={thumbnailCanvasRef}
              style={{ width: '110px', height: '36px' }}
              className="block cursor-pointer"
            />
          </div>
        </div>

        {/* Expand Icon Badge */}
        <div className="hidden sm:flex flex-col items-center justify-center pl-0.5 text-gray-400 group-hover:text-purple-600 transition-colors">
          <ZoomIn className="w-4 h-4" />
          <span className="text-[9px] font-medium text-gray-500 group-hover:text-purple-700">
            {drawnCountInMode} আঁকা
          </span>
        </div>
      </button>

      {/* Expanded Font Preview Popover */}
      {isOpen && (
        <>
          {/* Backdrop overlay for closing */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 z-50 w-[92vw] sm:w-[460px] bg-white rounded-2xl shadow-2xl border border-purple-200 p-4 animate-scale-up">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <span>লাইভ ফন্ট প্রিভিউ (opentype.js)</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                      ইন-মেমরি টিটিএফ
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    opentype.Font() ইঞ্জিন দ্বারা ব্রাউজারে সরাসরি রেন্ডার করা হয়েছে
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* opentype.js Rendered Canvas Display */}
            <div className="mt-3 p-2 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-[10px] text-gray-500 mb-1 px-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-red-400" /> মাত্রা লাইন (Shirorekha)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-blue-400" /> বেইজলাইন (Baseline)
                </span>
                <span className="font-mono text-purple-600 font-bold">{previewFontSize}px</span>
              </div>

              <div className="w-full rounded-lg bg-white border border-gray-200 shadow-inner flex items-center justify-center overflow-x-auto p-1">
                <canvas
                  ref={popoverCanvasRef}
                  style={{ width: '420px', height: '110px' }}
                  className="block"
                />
              </div>
            </div>

            {/* Quick Text Input for Testing */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={previewSampleText}
                  onChange={(e) => setPreviewSampleText(e.target.value)}
                  placeholder="অক্ষর বা শব্দ লিখুন..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-500 font-serif"
                />
              </div>

              {/* Font size slider */}
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-500 font-medium">আকার:</span>
                <input
                  type="range"
                  min="24"
                  max="72"
                  value={previewFontSize}
                  onChange={(e) => setPreviewFontSize(parseInt(e.target.value, 10))}
                  className="w-18 accent-purple-600 h-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-[10px] text-gray-400 font-medium shrink-0">নমুনা:</span>
              {[
                showcaseLetters,
                'অ আ ক খ',
                'আদর্শলিপি',
                'বাংলাদেশ',
                'আমার বর্ণমালা',
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewSampleText(sample)}
                  className={`px-2 py-0.5 rounded-lg border text-[11px] whitespace-nowrap cursor-pointer transition ${
                    previewSampleText === sample
                      ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Font Metrics & Statistics from opentype.js */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 rounded-lg bg-gray-50">
                <span className="text-gray-400 block">Family Name</span>
                <span className="font-bold text-gray-800 truncate block">
                  {fontMetadata.fontName}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-gray-50">
                <span className="text-gray-400 block">Units Per Em</span>
                <span className="font-bold text-purple-700">
                  {opentypeFont?.unitsPerEm || 1000} UPM
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-gray-50">
                <span className="text-gray-400 block">হাতে আঁকা</span>
                <span className="font-bold text-emerald-700 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {drawnCountInMode} টি হরফ
                </span>
              </div>
            </div>

            {/* Action Bar inside Popover */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsTestDriveOpen(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>টেস্ট ড্রাইভে বড় করে লিখুন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
