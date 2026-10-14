/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Check, Edit2, Download } from 'lucide-react';
import { BanglaCharacterDefinition, UserDrawingRecord } from '../types/font';
import { exportCharacterAsSvg } from '../utils/svgExporter';

interface CharacterCardProps {
  charDef: BanglaCharacterDefinition;
  drawing?: UserDrawingRecord;
  onClick: () => void;
  fontName?: string;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  charDef,
  drawing,
  onClick,
  fontName,
}) => {
  const isDrawn = !!drawing && !!drawing.svgPath;
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleQuickExportSvg = (e: React.MouseEvent) => {
    e.stopPropagation();
    exportCharacterAsSvg(charDef, drawing?.svgPath, drawing?.rawStrokes, {
      fontName: fontName || 'Bangla Font Craft',
    });
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center aspect-square rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden p-2 ${
        isDrawn
          ? 'bg-white border-purple-300 shadow-xs hover:border-purple-500 hover:shadow-md hover:-translate-y-0.5'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 hover:-translate-y-0.5'
      }`}
      title={`${charDef.char} (${charDef.nameBn}) - উদাহরণ: ${charDef.exampleWordBn} ${charDef.emoji}`}
    >
      {/* Quick SVG Export Button (Top-Left) */}
      <div className="absolute top-1.5 left-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleQuickExportSvg}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition shadow-2xs cursor-pointer ${
            downloadSuccess
              ? 'bg-emerald-500 text-white'
              : 'bg-white/90 hover:bg-purple-100 text-gray-600 hover:text-purple-700 border border-gray-200'
          }`}
          title={`${charDef.char} এর .SVG ফাইল ডাউনলোড করুন`}
        >
          {downloadSuccess ? (
            <Check className="w-3 h-3 stroke-[3]" />
          ) : (
            <Download className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Top indicator badge */}
      <div className="absolute top-1.5 right-1.5 z-10">
        {isDrawn ? (
          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 group-hover:hidden shadow-2xs">
            <Check className="w-3 h-3 stroke-[3]" />
          </span>
        ) : (
          <span className="w-4 h-4 rounded-full text-gray-400 flex items-center justify-center group-hover:text-purple-600 group-hover:bg-purple-50 transition">
            <Plus className="w-3 h-3 stroke-[2.5]" />
          </span>
        )}

        {isDrawn && (
          <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-600 hidden group-hover:flex items-center justify-center border border-purple-200 shadow-2xs">
            <Edit2 className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Main Character Graphic / Drawing */}
      <div className="w-full h-full flex items-center justify-center p-1">
        {isDrawn ? (
          // Render hand-drawn digital ink
          <svg
            viewBox="0 0 1000 1000"
            className="w-full h-full max-w-[85%] max-h-[85%] text-gray-950 transition-transform duration-200 group-hover:scale-105"
            style={
              /[Zz]/.test(drawing.svgPath)
                ? { fill: 'currentColor', stroke: 'none' }
                : {
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 32,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  }
            }
          >
            <path d={drawing.svgPath} />
          </svg>
        ) : (
          // Ghost reference character
          <span className="text-2xl sm:text-3xl lg:text-4xl font-normal text-gray-600 group-hover:text-gray-600 transition-colors select-none font-serif">
            {charDef.char}
          </span>
        )}
      </div>

      {/* Bottom subtle detail (char string or accent line) */}
      <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold text-gray-600 truncate">
          {charDef.nameBn}
        </span>
        {isDrawn && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        )}
      </div>
    </button>
  );
};
