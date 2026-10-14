/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ArrowRight,
  Feather,
  Wand2,
  Download,
  Copy,
  FileCode,
  Play,
  Pause,
  Square,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FontStoreType } from '../store/fontStore';
import { BANGLA_CHAR_MAP } from '../data/banglaCharacters';
import { Stroke, BrushStyle, SmoothingLevel } from '../types/font';
import { DrawingCanvas } from './DrawingCanvas';
import {
  exportCharacterAsSvg,
  copyCharacterSvgToClipboard,
} from '../utils/svgExporter';

interface DrawingStudioModalProps {
  store: FontStoreType;
}

const STROKE_WIDTHS = [
  { label: 'সূক্ষ্ম (Fine)', value: 16 },
  { label: 'মাঝারি (Medium)', value: 28 },
  { label: 'মোটা (Chunky)', value: 42 },
  { label: 'গাঢ় (Bold)', value: 56 },
];

const INK_COLORS = [
  { label: 'গাঢ় কালো', value: '#111827' },
  { label: 'নীল কালি', value: '#1e3a8a' },
  { label: 'বেগুনী কালি', value: '#581c87' },
  { label: 'সবুজ কালি', value: '#064e3b' },
];

const BRUSH_STYLES: Array<{
  id: BrushStyle;
  nameBn: string;
  nameEn: string;
  hint: string;
  icon: string;
}> = [
  {
    id: 'calligraphy',
    nameBn: 'ক্যালিগ্রাফিক নিব',
    nameEn: 'Calligraphic Nib',
    hint: '৪০° কোণে বাঁকানো ক্লাসিক বাংলা নিব',
    icon: '✒️',
  },
  {
    id: 'brush',
    nameBn: 'মসৃণ ব্রাশ',
    nameEn: 'Smooth Brush',
    hint: 'প্রেসার-সেন্সিটিভ অর্গানিক ব্রাশ',
    icon: '🖌️',
  },
  {
    id: 'pen',
    nameBn: 'ক্লিন পেন',
    nameEn: 'Clean Pen',
    hint: 'সুষম ও আধুনিক ডিজিটাল লাইন',
    icon: '✏️',
  },
];

const SMOOTHING_LEVELS: Array<{
  id: SmoothingLevel;
  labelBn: string;
  labelEn: string;
  description: string;
}> = [
  {
    id: 'low',
    labelBn: 'হালকা',
    labelEn: 'Light',
    description: 'হাতের লেখার স্বাভাবিক স্বকীয়তা বজায় রাখে',
  },
  {
    id: 'medium',
    labelBn: 'মসৃণ',
    labelEn: 'Smooth',
    description: 'কম্পন দূর করে পরিচ্ছন্ন পেশাদার রূপ দেয় (প্রস্তাবিত)',
  },
  {
    id: 'high',
    labelBn: 'মায়াবী ক্যালিগ্রাফি',
    labelEn: 'Ultra',
    description: 'অতিরিক্ত মসৃণ ও দৃষ্টিনন্দন বক্ররেখা',
  },
];

export const DrawingStudioModal: React.FC<DrawingStudioModalProps> = ({ store }) => {
  const {
    selectedCharId,
    setSelectedCharId,
    drawings,
    fontMetadata,
    saveDrawing,
    clearDrawing,
    getNextCharId,
    getPrevCharId,
  } = store;

  const charDef = selectedCharId ? BANGLA_CHAR_MAP[selectedCharId] : null;

  // Active Tool States
  const [isEraser, setIsEraser] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(28);
  const [strokeColor, setStrokeColor] = useState('#111827');
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('calligraphy');
  const [smoothing, setSmoothing] = useState<SmoothingLevel>('medium');

  // Guidelines & Ghost Reference states
  const [showMatra, setShowMatra] = useState(true);
  const [showMeanline, setShowMeanline] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showProportionsGrid, setShowProportionsGrid] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [ghostOpacity, setGhostOpacity] = useState(0.5);
  const [ghostMode, setGhostMode] = useState<'dashed' | 'solid' | 'font'>('dashed');
  const [showStartDot, setShowStartDot] = useState(true);

  // Standalone SVG Export States
  const [includeGuidesInExport, setIncludeGuidesInExport] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [copiedSvg, setCopiedSvg] = useState(false);

  // Live pressure feedback from PointerEvent
  const [livePressure, setLivePressure] = useState({ pressure: 0, isHardware: false });

  // Stroke Replay Animation State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 3>(1);
  const [isReplayPaused, setIsReplayPaused] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  // Auto-advance toggle
  const [autoAdvance, setAutoAdvance] = useState(true);

  // History tracking state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Local draft of drawing
  const currentDrawingRecord = selectedCharId ? drawings[selectedCharId] : undefined;
  const [draftStrokes, setDraftStrokes] = useState<Stroke[]>(
    currentDrawingRecord?.rawStrokes || []
  );
  const [draftSvgPath, setDraftSvgPath] = useState<string>(
    currentDrawingRecord?.svgPath || ''
  );

  // History ref to pass down to DrawingCanvas
  const strokesHistoryRef = useRef<{
    strokes: Stroke[];
    undoStack: Stroke[][];
    redoStack: Stroke[][];
    canUndo: boolean;
    canRedo: boolean;
  }>({
    strokes: currentDrawingRecord?.rawStrokes || [],
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
  });

  // Re-sync draft when selected character changes
  useEffect(() => {
    if (selectedCharId) {
      const rec = drawings[selectedCharId];
      const initialStrokes = rec?.rawStrokes || [];
      setDraftStrokes(initialStrokes);
      setDraftSvgPath(rec?.svgPath || '');
      strokesHistoryRef.current = {
        strokes: initialStrokes,
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      };
      setCanUndo(false);
      setCanRedo(false);
      setIsReplaying(false);
      setIsReplayPaused(false);
      setReplayProgress(0);
    }
  }, [selectedCharId, drawings]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    const history = strokesHistoryRef.current;
    if (history.undoStack.length === 0) return;

    const previous = history.undoStack.pop();
    if (previous) {
      history.redoStack.push([...draftStrokes]);
      setDraftStrokes(previous);
      setCanUndo(history.undoStack.length > 0);
      setCanRedo(true);
    }
  }, [draftStrokes]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    const history = strokesHistoryRef.current;
    if (history.redoStack.length === 0) return;

    const next = history.redoStack.pop();
    if (next) {
      history.undoStack.push([...draftStrokes]);
      setDraftStrokes(next);
      setCanUndo(true);
      setCanRedo(history.redoStack.length > 0);
    }
  }, [draftStrokes]);

  // Handle Clear
  const [showClearToast, setShowClearToast] = useState(false);

  const handleClear = useCallback(() => {
    if (draftStrokes.length > 0) {
      strokesHistoryRef.current.undoStack.push([...draftStrokes]);
      setDraftStrokes([]);
      setDraftSvgPath('');
      setCanUndo(true);
      setCanRedo(false);
      setIsReplaying(false);
      setIsReplayPaused(false);
      setReplayProgress(0);
      setShowClearToast(true);
      setTimeout(() => setShowClearToast(false), 2400);
    }
  }, [draftStrokes]);

  // Stroke Replay Controls
  const handleStartReplay = useCallback(() => {
    if (draftStrokes.length === 0) return;
    setIsReplayPaused(false);
    setReplayProgress(0);
    setIsReplaying(true);
  }, [draftStrokes]);

  const handleStopReplay = useCallback(() => {
    setIsReplaying(false);
    setIsReplayPaused(false);
  }, []);

  const handleReplayFinished = useCallback(() => {
    setIsReplaying(false);
    setIsReplayPaused(false);
    setReplayProgress(100);
  }, []);

  // Handle standalone SVG export
  const handleExportSvg = useCallback(
    (includeGuidesOverride?: boolean) => {
      if (!charDef) return;
      const path = draftSvgPath || currentDrawingRecord?.svgPath || charDef.referenceSvgPath;
      const withGuides =
        includeGuidesOverride !== undefined ? includeGuidesOverride : includeGuidesInExport;
      const result = exportCharacterAsSvg(charDef, path, draftStrokes, {
        includeGuides: withGuides,
        fontName: fontMetadata.fontName,
        authorName: fontMetadata.authorName,
      });
      setExportFeedback(`ডাউনলোড সম্পন্ন: ${result.filename}`);
      setTimeout(() => setExportFeedback(null), 3200);
      setIsExportMenuOpen(false);
    },
    [charDef, draftSvgPath, currentDrawingRecord, includeGuidesInExport, draftStrokes, fontMetadata]
  );

  // Copy SVG XML code to clipboard
  const handleCopySvg = useCallback(async () => {
    if (!charDef) return;
    const path = draftSvgPath || currentDrawingRecord?.svgPath || charDef.referenceSvgPath;
    const success = await copyCharacterSvgToClipboard(charDef, path, draftStrokes, {
      includeGuides: includeGuidesInExport,
      fontName: fontMetadata.fontName,
      authorName: fontMetadata.authorName,
    });
    if (success) {
      setCopiedSvg(true);
      setExportFeedback('SVG XML কোড সফলভাবে ক্লিপবোর্ডে কপি হয়েছে!');
      setTimeout(() => {
        setCopiedSvg(false);
        setExportFeedback(null);
      }, 3000);
    }
  }, [charDef, draftSvgPath, currentDrawingRecord, includeGuidesInExport, draftStrokes, fontMetadata]);

  // Save drawing
  const handleSave = (moveToNext = false) => {
    if (!selectedCharId || !charDef) return;

    if (draftStrokes.length === 0 && !draftSvgPath) {
      clearDrawing(selectedCharId);
    } else {
      const svgToSave = draftSvgPath || charDef.referenceSvgPath;
      saveDrawing(selectedCharId, draftStrokes, svgToSave);

      try {
        confetti({
          particleCount: 30,
          spread: 45,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#10b981', '#3b82f6'],
        });
      } catch {
        // fallback
      }
    }

    if (moveToNext || autoAdvance) {
      const nextId = getNextCharId(selectedCharId);
      if (nextId) {
        setSelectedCharId(nextId);
        return;
      }
    }

    setSelectedCharId(null);
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCharId) return;

      if (e.key === 'Escape') {
        setSelectedCharId(null);
      } else if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const next = getNextCharId(selectedCharId);
        if (next) setSelectedCharId(next);
      } else if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const prev = getPrevCharId(selectedCharId);
        if (prev) setSelectedCharId(prev);
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === 'y' && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCharId, getNextCharId, getPrevCharId, handleUndo, handleRedo, setSelectedCharId]);

  if (!selectedCharId || !charDef) return null;

  const nextCharId = getNextCharId(selectedCharId);
  const prevCharId = getPrevCharId(selectedCharId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[96vh] overflow-hidden animate-scale-up">
        {/* Floating feedback toast for SVG export or Clear */}
        {exportFeedback && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            <span>{exportFeedback}</span>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/70">
          {/* Character Identity & Example word */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-serif text-2xl font-bold shadow-md shadow-purple-500/20">
              {charDef.char}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  {charDef.nameBn} ({charDef.nameEn})
                </h3>
                <span className="text-[11px] font-mono text-gray-600 bg-gray-200/70 px-1.5 py-0.5 rounded">
                  {charDef.unicodeHex}
                </span>
              </div>
              <p className="text-xs text-purple-700 font-medium flex items-center gap-1.5">
                <span>উদাহরণ:</span>
                <span className="font-semibold text-gray-900">{charDef.exampleWordBn}</span>
                <span>({charDef.exampleWordEn})</span>
                <span className="text-sm">{charDef.emoji}</span>
              </p>
            </div>
          </div>

          {/* Stepper, SVG Export & Close button */}
          <div className="flex items-center gap-2">
            {/* Standalone SVG Export Button & Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                title="এই অক্ষরের ভেক্টর পাথ .SVG ফাইল হিসেবে এক্সপোর্ট করুন"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SVG এক্সপোর্ট</span>
                <span className="sm:hidden">SVG</span>
              </button>

              {/* Dropdown Menu */}
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-3.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                      <FileCode className="w-4 h-4 text-purple-600" />
                      <span>স্ট্যান্ডঅ্যালোন SVG এক্সপোর্ট</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExportMenuOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                    ফন্ট জেনারেশন ছাড়াই আপনার আঁকা অক্ষরের পাথ সরাসরি একটি স্বয়ংসম্পূর্ণ .SVG ফাইল আকারে সেভ করুন।
                  </p>

                  <div className="mt-3 pt-2 border-t border-gray-100 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeGuidesInExport}
                        onChange={(e) => setIncludeGuidesInExport(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>টাইপোগ্রাফি গাইডলাইনসহ এক্সপোর্ট</span>
                    </label>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleExportSvg()}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ডাউনলোড .SVG</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopySvg}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        {copiedSvg ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">কপি হয়েছে!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-gray-600" />
                            <span>কপি SVG</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center rounded-xl border border-gray-200 bg-white p-0.5 text-xs font-medium text-gray-600 shadow-2xs">
              <button
                onClick={() => prevCharId && setSelectedCharId(prevCharId)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-30 cursor-pointer"
                title="আগের অক্ষর (Cmd + Left)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[11px]">
                {charDef.char}
              </span>
              <button
                onClick={() => nextCharId && setSelectedCharId(nextCharId)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-30 cursor-pointer"
                title="পরের অক্ষর (Cmd + Right)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setSelectedCharId(null)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition cursor-pointer"
              title="বন্ধ করুন (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content: Drawing Studio & Toolbar */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center">
          {/* Main Drawing Canvas with Pointer Events */}
          <div className="flex-1 w-full flex flex-col items-center relative">
            {/* Clear Toast Notification */}
            {showClearToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-gray-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl border border-gray-700 backdrop-blur-xs animate-scale-up">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>ক্যানভাস পরিষ্কার হয়েছে (Undo করে ফেরত আনতে পারেন)</span>
              </div>
            )}

            {/* Quick Replay floating trigger button when not replaying */}
            {!isReplaying && draftStrokes.length > 0 && !showClearToast && (
              <button
                type="button"
                onClick={handleStartReplay}
                className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-50 transition shadow-md cursor-pointer animate-scale-up"
                title="আপনার আঁকা প্রতিটি স্ট্রোক ক্রমানুসারে অ্যানিমেট করে দেখুন (Stroke Replay)"
              >
                <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                <span>রি-প্লে (Replay)</span>
              </button>
            )}

            {/* Floating Replay Active Controller Bar */}
            {isReplaying && (
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-gray-900/95 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-2xl border border-purple-500/40 backdrop-blur-md animate-scale-up">
                <div className="flex items-center gap-1.5 text-purple-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                  </span>
                  <span>রিপ্লে হচ্ছে ({replayProgress}%)</span>
                </div>
                <div className="h-3 w-px bg-gray-700" />
                <button
                  type="button"
                  onClick={() => setIsReplayPaused((p) => !p)}
                  className="p-1 hover:bg-white/20 rounded transition cursor-pointer text-gray-200 hover:text-white"
                  title={isReplayPaused ? 'চালিয়ে যান (Resume)' : 'বিরতি দিন (Pause)'}
                >
                  {isReplayPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setReplaySpeed((s) => (s === 1 ? 2 : s === 2 ? 3 : 1))}
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-600 hover:bg-purple-500 transition cursor-pointer"
                  title="অ্যানিমেশনের গতি পরিবর্তন করুন"
                >
                  {replaySpeed}x
                </button>
                <button
                  type="button"
                  onClick={handleStopReplay}
                  className="p-1 hover:bg-red-500/30 text-gray-400 hover:text-red-300 rounded transition cursor-pointer"
                  title="রিপ্লে বন্ধ করুন (Stop)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <DrawingCanvas
              charDef={charDef}
              initialStrokes={draftStrokes}
              initialSvgPath={charDef.referenceSvgPath}
              strokeWidth={strokeWidth}
              strokeColor={strokeColor}
              brushStyle={brushStyle}
              smoothing={smoothing}
              isEraser={isEraser}
              showMatra={showMatra}
              showMeanline={showMeanline}
              showBaseline={showBaseline}
              showProportionsGrid={showProportionsGrid}
              showGhost={showGhost}
              ghostOpacity={ghostOpacity}
              ghostMode={ghostMode}
              showStartDot={showStartDot}
              onPressureChange={(p, isHw) => setLivePressure({ pressure: p, isHardware: isHw })}
              onDrawingChanged={(updatedStrokes, svgPath) => {
                setDraftStrokes(updatedStrokes);
                setDraftSvgPath(svgPath);
              }}
              strokesHistoryRef={strokesHistoryRef}
              onHistoryStatusChange={(canU, canR) => {
                setCanUndo(canU);
                setCanRedo(canR);
              }}
              isReplaying={isReplaying}
              replaySpeed={replaySpeed}
              isReplayPaused={isReplayPaused}
              onReplayProgress={setReplayProgress}
              onReplayFinished={handleReplayFinished}
              onStopReplay={handleStopReplay}
            />

            {/* Canvas Hint Text & Real-Time Pressure Meter */}
            <div className="mt-3 w-full max-w-[600px] flex items-center justify-between text-xs px-1 gap-2">
              <div className="flex items-center gap-2">
                {livePressure.pressure > 0 ? (
                  <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-200">
                    <span className="font-bold text-[11px]">
                      চাপ (Pressure): {Math.round(livePressure.pressure * 100)}%
                    </span>
                    <div className="w-16 h-2 rounded-full bg-purple-200 overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-75"
                        style={{ width: `${Math.round(livePressure.pressure * 100)}%` }}
                      />
                    </div>
                    {livePressure.isHardware && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        Apple Pencil / Stylus
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>ভেরিয়েবল উইডথ সক্রিয় — চাপ ও গতির সাথে কালির ঘনত্ব বদলাবে।</span>
                  </span>
                )}
              </div>

              <span className="hidden sm:inline text-gray-500 font-medium">পাম রিজেকশন সক্রিয়</span>
            </div>
          </div>

          {/* Right Sidebar: Tools, Calligraphy & Guideline Controls */}
          <div className="w-full lg:w-80 flex flex-col gap-4 bg-gray-50/90 p-4 rounded-2xl border border-gray-200/80">
            {/* Live Character Preview Card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 shadow-2xs">
              <div>
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                  লাইভ ফন্ট প্রিভিউ
                </span>
                <span className="text-xs text-purple-700 font-medium">
                  {draftSvgPath ? 'স্মুথ ও ক্যালিগ্রাফিক' : 'রেফারেন্স গাইড'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50/60 border border-gray-200 flex items-center justify-center p-1 overflow-hidden">
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
                  <path d={draftSvgPath || charDef.referenceSvgPath} />
                </svg>
              </div>
            </div>

            {/* Calligraphic Brush Style Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>ব্রাশ স্টাইল (Brush Style)</span>
                <span className="text-[10px] text-purple-600 font-semibold lowercase">কলম ধরণ</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {BRUSH_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setBrushStyle(style.id);
                      setIsEraser(false);
                    }}
                    className={`py-2 px-1.5 rounded-xl text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      brushStyle === style.id && !isEraser
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    title={style.hint}
                  >
                    <span className="text-base">{style.icon}</span>
                    <span className="text-[11px] leading-tight truncate w-full px-1">
                      {style.nameBn}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Smoothing Strength Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>স্ট্রোক স্মুথিং (Smoothing)</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Chaikin Curve</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {SMOOTHING_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setSmoothing(lvl.id)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium transition cursor-pointer text-center ${
                      smoothing === lvl.id
                        ? 'bg-purple-100 text-purple-800 border-2 border-purple-500 font-bold shadow-2xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                    title={lvl.description}
                  >
                    {lvl.labelBn}
                  </button>
                ))}
              </div>
            </div>

            {/* Tool Toggle: Pen vs Eraser */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                টুল
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsEraser(false)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !isEraser
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>আঁকুন</span>
                </button>
                <button
                  onClick={() => setIsEraser(true)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isEraser
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                  <span>ইরেজার</span>
                </button>
              </div>
            </div>

            {/* Stroke Width Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                কালির ঘনত্ব (Thickness)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {STROKE_WIDTHS.map((sw) => (
                  <button
                    key={sw.value}
                    onClick={() => setStrokeWidth(sw.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left flex items-center justify-between cursor-pointer ${
                      strokeWidth === sw.value
                        ? 'bg-white text-purple-700 border-2 border-purple-500 font-bold shadow-2xs'
                        : 'bg-white/70 border border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <span>{sw.label.split(' ')[0]}</span>
                    <span
                      className="rounded-full bg-gray-900 inline-block"
                      style={{ width: `${sw.value / 4}px`, height: `${sw.value / 4}px` }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Ink Color Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                কালির রঙ
              </label>
              <div className="flex items-center gap-2">
                {INK_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setStrokeColor(c.value);
                      setIsEraser(false);
                    }}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative ${
                      strokeColor === c.value && !isEraser
                        ? 'ring-2 ring-purple-500 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Guideline & Proportions Toggles */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>টাইপোগ্রাফি ও অনুপাত গাইড</span>
                <span className="text-[10px] text-purple-600 font-semibold">Proportions</span>
              </label>

              {/* Matra information tip badge */}
              <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200/70 text-[11px] flex items-start gap-2">
                <span className="text-base leading-none">💡</span>
                <div className="leading-tight">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <span>মাত্রার ধরণ:</span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-200/70 text-purple-800 text-[10px]">
                      {charDef.matraType === 'full' ? 'পূর্ণমাত্রা (Full)' : charDef.matraType === 'half' ? 'অর্ধমাত্রা (Half)' : 'মাত্রাহীন (None)'}
                    </span>
                  </div>
                  <p className="text-purple-700 text-[10px] mt-0.5">
                    {charDef.matraType === 'full'
                      ? 'অক্ষরের উপর সোজা লাল মাত্রা রেখা স্পর্শ করে টানুন।'
                      : charDef.matraType === 'half'
                      ? 'অক্ষরের একাংশে সামান্য মাত্রা দিন, অন্য অংশ খোলা রাখুন।'
                      : 'এই অক্ষরে কোনো মাত্রা রেখা দেবেন না, ছাঁচ অনুযায়ী আঁকুন।'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer p-1.5 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                  <input
                    type="checkbox"
                    checked={showMatra}
                    onChange={(e) => setShowMatra(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-0.5 bg-red-500 rounded" />
                    <span>মাত্রা (y=220)</span>
                  </span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer p-1.5 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                  <input
                    type="checkbox"
                    checked={showBaseline}
                    onChange={(e) => setShowBaseline(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-0.5 bg-blue-500 rounded" />
                    <span>বেইজ (y=800)</span>
                  </span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer p-1.5 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                  <input
                    type="checkbox"
                    checked={showMeanline}
                    onChange={(e) => setShowMeanline(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-0.5 bg-emerald-500 rounded" />
                    <span>মধ্যরেখা (y=510)</span>
                  </span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer p-1.5 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                  <input
                    type="checkbox"
                    checked={showProportionsGrid}
                    onChange={(e) => setShowProportionsGrid(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 border border-indigo-400 border-dashed rounded-xs" />
                    <span>অনুপাত গ্রিড</span>
                  </span>
                </label>
              </div>

              {/* Overlay Guide Section */}
              <div className="pt-2 border-t border-gray-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGhost}
                      onChange={(e) => setShowGhost(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="flex items-center gap-1">
                      {showGhost ? <Eye className="w-3.5 h-3.5 text-purple-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                      <span>ওভারলে গাইড (Overlay Guide)</span>
                    </span>
                  </label>
                  {showGhost && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      {Math.round(ghostOpacity * 100)}%
                    </span>
                  )}
                </div>

                {showGhost && (
                  <div className="space-y-2 mt-2 bg-white/70 p-2.5 rounded-xl border border-gray-200/70">
                    {/* Ghost Mode Selector */}
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setGhostMode('dashed')}
                        className={`py-1 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                          ghostMode === 'dashed'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="ড্যাশড লাইন - শিশুদের সহজে দাগ দেখে আঁকার জন্য"
                      >
                        ✏️ ড্যাশড
                      </button>
                      <button
                        type="button"
                        onClick={() => setGhostMode('solid')}
                        className={`py-1 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                          ghostMode === 'solid'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="সলিড লাইন - একনজরে সম্পূর্ণ রেখা"
                      >
                        〰️ সলিড
                      </button>
                      <button
                        type="button"
                        onClick={() => setGhostMode('font')}
                        className={`py-1 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                          ghostMode === 'font'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="ফন্ট ছায়া - পূর্ণাঙ্গ হরফের ছায়া"
                      >
                        👻 ছায়া
                      </button>
                    </div>

                    {/* Opacity slider */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-gray-500 font-medium">হালকা</span>
                      <input
                        type="range"
                        min="0.15"
                        max="0.85"
                        step="0.05"
                        value={ghostOpacity}
                        onChange={(e) => setGhostOpacity(parseFloat(e.target.value))}
                        className="flex-1 accent-purple-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-gray-500 font-medium">গাঢ়</span>
                    </div>

                    {/* Start dot indicator toggle */}
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-700 font-medium cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={showStartDot}
                        onChange={(e) => setShowStartDot(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>শুরুর বিন্দু (Start Dot ১)</span>
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* History Actions: Undo / Redo / Clear */}
            <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition flex items-center justify-center gap-1 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition flex items-center justify-center gap-1 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span>Redo</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={draftStrokes.length === 0}
                className="py-1.5 px-2.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-30 transition flex items-center justify-center gap-1 cursor-pointer"
                title="সব মুছুন (Clear)"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>মুছুন</span>
              </button>
              <button
                type="button"
                onClick={isReplaying ? handleStopReplay : handleStartReplay}
                disabled={draftStrokes.length === 0}
                className={`col-span-3 py-1.5 px-2.5 rounded-lg border text-xs font-semibold disabled:opacity-30 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isReplaying
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                }`}
                title="আপনার আঁকা প্রতিটি স্ট্রোক অ্যানিমেট করে দেখুন (Stroke Replay)"
              >
                {isReplaying ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>রিপ্লে বন্ধ করুন</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-purple-700" />
                    <span>অঙ্কন রি-প্লে (Replay Stroke)</span>
                  </>
                )}
              </button>
            </div>

            {/* Standalone SVG Export Card */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>অক্ষর পাথ এক্সপোর্ট (.SVG)</span>
                <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200/60">Standalone</span>
              </label>
              <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-200 space-y-2">
                <p className="text-[11px] text-gray-500 leading-tight">
                  ফন্ট কম্পাইল ছাড়াও এই অক্ষরের ভেক্টর পাথটি সরাসরি স্ট্যান্ডার্ড .SVG ফাইল আকারে সেভ করুন।
                </p>

                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGuidesInExport}
                    onChange={(e) => setIncludeGuidesInExport(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>গাইডলাইন রেখা সহ (Shirorekha / Baseline)</span>
                </label>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleExportSvg()}
                    className="py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    title="SVG ফাইল ডাউনলোড করুন"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ডাউনলোড SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySvg}
                    className="py-1.5 px-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    title="SVG XML কোড ক্লিপবোর্ডে কপি করুন"
                  >
                    {copiedSvg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                        <span>কপি কোড</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-100">
          {/* Auto advance toggle */}
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>সংরক্ষণ করার পর স্বয়ংক্রিয়ভাবে পরের অক্ষরে যান</span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* Animated Stroke Replay Button */}
            <button
              type="button"
              onClick={isReplaying ? handleStopReplay : handleStartReplay}
              disabled={draftStrokes.length === 0}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                isReplaying
                  ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                  : 'border-purple-200 bg-white hover:bg-purple-50 text-purple-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isReplaying ? 'রিপ্লে বন্ধ করুন' : 'আপনার আঁকা প্রতিটি স্ট্রোক ক্রমানুসারে অ্যানিমেট করে দেখুন (Stroke Replay)'}
            >
              {isReplaying ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>রিপ্লে বন্ধ</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-purple-600 fill-purple-600" />
                  <span>Replay</span>
                </>
              )}
            </button>

            {/* Prominent Clear Canvas Button */}
            <button
              type="button"
              onClick={handleClear}
              disabled={draftStrokes.length === 0}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl border border-red-200 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="বর্তমান ক্যানভাস পরিষ্কার করুন (Reset to blank)"
            >
              <Trash2 className="w-4 h-4" />
              <span>মুছুন</span>
            </button>

            {/* Standalone SVG Export Button */}
            <button
              type="button"
              onClick={() => handleExportSvg()}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-xs sm:text-sm font-semibold text-purple-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="এই অক্ষরের ভেক্টর পাথ সরাসরি .SVG ফাইল আকারে ডাউনলোড করুন"
            >
              <Download className="w-4 h-4" />
              <span>SVG Export</span>
            </button>

            <button
              onClick={() => setSelectedCharId(null)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              বাতিল
            </button>

            <button
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Letter</span>
            </button>

            {nextCharId && (
              <button
                onClick={() => handleSave(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer"
                title="Save and advance to next letter"
              >
                <span>Save & Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
