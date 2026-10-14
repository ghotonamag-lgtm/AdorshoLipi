/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Stroke, BanglaCharacterDefinition, BrushStyle, SmoothingLevel } from '../types/font';
import {
  renderStrokesOnCanvas,
  strokesToNormalizedSvgPath,
} from '../utils/vectorEngine';

export type GhostMode = 'dashed' | 'solid' | 'font';

interface DrawingCanvasProps {
  charDef: BanglaCharacterDefinition;
  initialStrokes: Stroke[];
  initialSvgPath?: string;
  strokeWidth: number;
  strokeColor: string;
  brushStyle: BrushStyle;
  smoothing: SmoothingLevel;
  isEraser: boolean;
  showMatra: boolean;
  showBaseline: boolean;
  showMeanline?: boolean;
  showMargins?: boolean;
  showProportionsGrid?: boolean;
  showGhost: boolean;
  ghostOpacity: number;
  ghostMode?: GhostMode;
  showStartDot?: boolean;
  onPressureChange?: (pressure: number, isHardwareStylus: boolean) => void;
  onDrawingChanged: (strokes: Stroke[], svgPath: string) => void;
  // External ref access for undo / redo / clear
  strokesHistoryRef: React.MutableRefObject<{
    strokes: Stroke[];
    undoStack: Stroke[][];
    redoStack: Stroke[][];
    canUndo: boolean;
    canRedo: boolean;
  }>;
  onHistoryStatusChange?: (canUndo: boolean, canRedo: boolean) => void;
  // Replay animation props
  isReplaying?: boolean;
  replaySpeed?: 1 | 2 | 3;
  isReplayPaused?: boolean;
  onReplayProgress?: (progress: number) => void;
  onReplayFinished?: () => void;
  onStopReplay?: () => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  charDef,
  initialStrokes,
  initialSvgPath,
  strokeWidth,
  strokeColor,
  brushStyle,
  smoothing,
  isEraser,
  showMatra,
  showBaseline,
  showMeanline = true,
  showProportionsGrid = true,
  showGhost,
  ghostOpacity,
  ghostMode = 'dashed',
  showStartDot = true,
  onPressureChange,
  onDrawingChanged,
  strokesHistoryRef,
  onHistoryStatusChange,
  isReplaying = false,
  replaySpeed = 1,
  isReplayPaused = false,
  onReplayProgress,
  onReplayFinished,
  onStopReplay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 600, height: 600 });
  const [replayingTip, setReplayingTip] = useState<{ x: number; y: number; color: string } | null>(null);

  // Keep history ref updated
  useEffect(() => {
    strokesHistoryRef.current.strokes = strokes;
  }, [strokes, strokesHistoryRef]);

  // Sync internal state when initialStrokes change (from undo, redo, or clear)
  useEffect(() => {
    setStrokes(initialStrokes);
  }, [initialStrokes]);

  // Reset undo/redo history stacks ONLY when switching characters
  useEffect(() => {
    setStrokes(initialStrokes);
    strokesHistoryRef.current.undoStack = [];
    strokesHistoryRef.current.redoStack = [];
    onHistoryStatusChange?.(false, false);
  }, [charDef.id]);

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        const size = Math.min(600, Math.max(300, clientWidth));
        setCanvasDimensions({ width: size, height: size });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Redraw canvas whenever strokes or activeStroke changes (when not replaying)
  useEffect(() => {
    if (isReplaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays for ultra-crisp calligraphic lines
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvasDimensions;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Draw active strokes with calligraphic smoothing and variable width
    renderStrokesOnCanvas(ctx, strokes, activeStroke);
  }, [strokes, activeStroke, canvasDimensions, isReplaying]);

  // Animated Replay Engine: Sequentially animates the user's strokes point by point
  useEffect(() => {
    if (!isReplaying || strokes.length === 0) {
      setReplayingTip(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animStrokeIndex = 0;
    let animPointIndex = 0;
    const completedStrokes: Stroke[] = [];
    let currentPartialStroke: Stroke | null = null;
    let rafId: number;

    const totalPoints = strokes.reduce((sum, s) => sum + s.points.length, 0);
    let pointsRendered = 0;

    const step = () => {
      if (isReplayPaused) {
        rafId = requestAnimationFrame(step);
        return;
      }

      if (animStrokeIndex >= strokes.length) {
        // Animation finished: render pristine final state
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = canvasDimensions;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);
        renderStrokesOnCanvas(ctx, strokes, null);

        setReplayingTip(null);
        onReplayProgress?.(100);
        onReplayFinished?.();
        return;
      }

      const targetStroke = strokes[animStrokeIndex];
      const ptsPerFrame = replaySpeed === 3 ? 4 : replaySpeed === 2 ? 2 : 1;

      for (let p = 0; p < ptsPerFrame && animPointIndex < targetStroke.points.length; p++) {
        animPointIndex++;
        pointsRendered++;
      }

      const subPoints = targetStroke.points.slice(0, animPointIndex);
      currentPartialStroke = {
        ...targetStroke,
        points: subPoints,
      };

      // Draw canvas frame
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvasDimensions;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      renderStrokesOnCanvas(ctx, completedStrokes, currentPartialStroke);

      const latestPoint = subPoints[subPoints.length - 1];
      if (latestPoint) {
        setReplayingTip({
          x: latestPoint.x,
          y: latestPoint.y,
          color: targetStroke.color,
        });
      }

      if (totalPoints > 0) {
        const pct = Math.min(100, Math.round((pointsRendered / totalPoints) * 100));
        onReplayProgress?.(pct);
      }

      if (animPointIndex >= targetStroke.points.length) {
        completedStrokes.push(targetStroke);
        animStrokeIndex++;
        animPointIndex = 0;
        currentPartialStroke = null;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    isReplaying,
    isReplayPaused,
    replaySpeed,
    strokes,
    canvasDimensions,
    onReplayProgress,
    onReplayFinished,
  ]);

  // Extract starting coordinate and secondary stroke coordinates from authentic reference SVG path
  const strokeMarkers = useMemo(() => {
    const pathStr = initialSvgPath || charDef.referenceSvgPath;
    if (!pathStr) return { start: null, second: null };

    // Find coordinates along the letterform to locate the authentic starting point
    const allCoords = [...pathStr.matchAll(/[MLQ]\s*([\d.-]+)[,\s]+([\d.-]+)/gi)];
    if (allCoords.length === 0) return { start: null, second: null };

    let minY = 1000;
    allCoords.forEach((m) => {
      const y = parseFloat(m[2]);
      if (y < minY) minY = y;
    });

    // Points located near the top of the character
    const topPoints: { x: number; y: number }[] = [];
    allCoords.forEach((m) => {
      const x = parseFloat(m[1]);
      const y = parseFloat(m[2]);
      if (y <= minY + 80) {
        topPoints.push({ x, y });
      }
    });

    // Pick the leftmost top point as the natural Bengali writing start (matra or initial loop)
    topPoints.sort((a, b) => a.x - b.x);
    const startPoint = topPoints[0] || { x: 300, y: 220 };

    const start = {
      x: (startPoint.x / 1000) * canvasDimensions.width,
      y: (startPoint.y / 1000) * canvasDimensions.height,
    };

    // Find second inflection/loop point if multi-part
    const moves = [...pathStr.matchAll(/M\s*([\d.-]+)[,\s]+([\d.-]+)/gi)];
    const second = moves.length > 1
      ? {
          x: (parseFloat(moves[1][1]) / 1000) * canvasDimensions.width,
          y: (parseFloat(moves[1][2]) / 1000) * canvasDimensions.height,
        }
      : null;

    return { start, second };
  }, [initialSvgPath, charDef.referenceSvgPath, canvasDimensions]);

  // Real-time tracing engagement estimation
  const traceStats = useMemo(() => {
    if (!showGhost || strokes.length === 0) return null;
    let totalPoints = 0;
    strokes.forEach((s) => {
      totalPoints += s.points.length;
    });
    const targetPoints = 35;
    const progress = Math.min(100, Math.round((totalPoints / targetPoints) * 100));
    return {
      progress,
      isComplete: progress >= 75,
    };
  }, [showGhost, strokes]);

  // Calculates calibrated pressure from hardware PointerEvent or dynamic velocity fallback
  const extractPointerPressure = (
    e: React.PointerEvent<HTMLCanvasElement>,
    lastPoint?: { x: number; y: number; time?: number }
  ): { pressure: number; isHardware: boolean } => {
    const isPen = e.pointerType === 'pen';

    // 1. Hardware Stylus (Apple Pencil, Wacom, S-Pen, Surface Pen)
    if (isPen && typeof e.pressure === 'number' && e.pressure > 0) {
      return {
        pressure: Math.max(0.08, Math.min(1.0, e.pressure)),
        isHardware: true,
      };
    }

    // 2. Analog Pressure reporting on compatible trackpads
    if (typeof e.pressure === 'number' && e.pressure > 0 && e.pressure !== 0.5) {
      return {
        pressure: Math.max(0.08, Math.min(1.0, e.pressure)),
        isHardware: true,
      };
    }

    // 3. Velocity-derived dynamic pressure for mouse and finger touch
    if (lastPoint && lastPoint.time) {
      const dt = Math.max(8, Date.now() - lastPoint.time);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        const dist = Math.hypot(curX - lastPoint.x, curY - lastPoint.y);
        const speed = dist / dt; // px/ms
        const simulatedPressure = Math.max(0.28, Math.min(0.92, 0.88 - Math.min(speed, 2.0) * 0.28));
        return { pressure: simulatedPressure, isHardware: false };
      }
    }

    return { pressure: 0.55, isHardware: false };
  };

  // Pointer event handlers with pressure sensitivity & palm rejection
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    if (isReplaying) {
      onStopReplay?.();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { pressure, isHardware } = extractPointerPressure(e);
    onPressureChange?.(pressure, isHardware);

    if (isEraser) {
      eraseAtPoint(x, y, strokeWidth * 2);
      return;
    }

    const newStroke: Stroke = {
      points: [{ x, y, pressure, time: Date.now() }],
      color: strokeColor,
      width: strokeWidth,
      brushStyle,
      smoothing,
    };

    setActiveStroke(newStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lastPoint = activeStroke?.points[activeStroke.points.length - 1];
    const { pressure, isHardware } = extractPointerPressure(e, lastPoint);

    if (e.buttons === 1) {
      onPressureChange?.(pressure, isHardware);
    }

    if (isEraser && e.buttons === 1) {
      eraseAtPoint(x, y, strokeWidth * 2);
      return;
    }

    if (!activeStroke || !lastPoint) return;

    const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    if (dist < 1.8) return;

    setActiveStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y, pressure, time: Date.now() }],
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    onPressureChange?.(0, false);

    if (activeStroke && activeStroke.points.length > 0) {
      strokesHistoryRef.current.undoStack.push([...strokes]);
      strokesHistoryRef.current.redoStack = [];

      const completedStroke: Stroke = {
        ...activeStroke,
        brushStyle,
        smoothing,
      };

      const updatedStrokes = [...strokes, completedStroke];
      setStrokes(updatedStrokes);
      setActiveStroke(null);

      const svgPath = strokesToNormalizedSvgPath(
        updatedStrokes,
        canvasDimensions.width,
        canvasDimensions.height
      );
      onDrawingChanged(updatedStrokes, svgPath);

      onHistoryStatusChange?.(true, false);
    }
  };

  const eraseAtPoint = (x: number, y: number, radius: number) => {
    setStrokes((prevStrokes) => {
      const remaining = prevStrokes.filter((stroke) => {
        return !stroke.points.some((p) => Math.hypot(p.x - x, p.y - y) < radius);
      });

      if (remaining.length !== prevStrokes.length) {
        strokesHistoryRef.current.undoStack.push([...prevStrokes]);
        strokesHistoryRef.current.redoStack = [];
        const svgPath = strokesToNormalizedSvgPath(
          remaining,
          canvasDimensions.width,
          canvasDimensions.height
        );
        onDrawingChanged(remaining, svgPath);
        onHistoryStatusChange?.(true, false);
      }

      return remaining;
    });
  };

  // Guideline positions proportional to 1000 viewport
  const matraY = canvasDimensions.height * 0.22;
  const meanY = canvasDimensions.height * 0.51;
  const baselineY = canvasDimensions.height * 0.8;
  const centerX = canvasDimensions.width * 0.5;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full max-w-[600px] aspect-square mx-auto select-none rounded-3xl bg-amber-50/20 border-2 border-gray-200 shadow-inner overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Background Subtle Notebook / Graph Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Proportions Grid (Horizontal & Vertical balance quadrants) */}
      {showProportionsGrid && (
        <div className="absolute inset-0 pointer-events-none opacity-30">
          {/* Vertical center balance guide */}
          <div
            className="absolute inset-y-0 border-r border-indigo-400 border-dotted"
            style={{ left: `${centerX}px` }}
          />
          {/* Left standard margin */}
          <div
            className="absolute inset-y-0 border-r border-gray-300 border-dashed"
            style={{ left: `${canvasDimensions.width * 0.15}px` }}
          />
          {/* Right standard margin */}
          <div
            className="absolute inset-y-0 border-l border-gray-300 border-dashed"
            style={{ right: `${canvasDimensions.width * 0.15}px` }}
          />
        </div>
      )}

      {/* Guide: Shirorekha / মাত্রা (Top Matra line) */}
      {showMatra && (
        <div
          className="absolute inset-x-0 border-b-2 border-red-400 border-dashed pointer-events-none flex items-center justify-between px-3 z-10"
          style={{ top: `${matraY}px` }}
        >
          <span className="text-[10px] font-bold text-red-600 bg-white/95 px-1.5 py-0.5 rounded shadow-2xs border border-red-200">
            মাত্রা (Shirorekha)
          </span>
          <span className="text-[9px] text-red-500 font-mono hidden sm:inline bg-white/80 px-1 rounded">y=220</span>
        </div>
      )}

      {/* Guide: Meanline / মধ্যরেখা (Middle proportion line) */}
      {showMeanline && (
        <div
          className="absolute inset-x-0 border-b border-emerald-400 border-dashed pointer-events-none flex items-center justify-between px-3 z-10"
          style={{ top: `${meanY}px` }}
        >
          <span className="text-[10px] font-medium text-emerald-700 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs border border-emerald-200">
            মধ্যরেখা (Meanline)
          </span>
          <span className="text-[9px] text-emerald-500 font-mono hidden sm:inline bg-white/80 px-1 rounded">y=510</span>
        </div>
      )}

      {/* Guide: Baseline (Bottom text baseline) */}
      {showBaseline && (
        <div
          className="absolute inset-x-0 border-b-2 border-blue-400 border-dashed pointer-events-none flex items-center justify-between px-3 z-10"
          style={{ top: `${baselineY}px` }}
        >
          <span className="text-[10px] font-bold text-blue-600 bg-white/95 px-1.5 py-0.5 rounded shadow-2xs border border-blue-200">
            বেইজলাইন (Baseline)
          </span>
          <span className="text-[9px] text-blue-500 font-mono hidden sm:inline bg-white/80 px-1 rounded">y=800</span>
        </div>
      )}

      {/* Real-Time Tracing Progress Badge */}
      {showGhost && traceStats && traceStats.progress > 8 && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-indigo-200 shadow-xs text-xs font-semibold animate-scale-up">
          {traceStats.isComplete ? (
            <span className="text-emerald-700 flex items-center gap-1">
              <span>⭐</span>
              <span>দারুণ ট্রেস হয়েছে!</span>
            </span>
          ) : (
            <span className="text-indigo-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>ট্রেস: {traceStats.progress}%</span>
            </span>
          )}
        </div>
      )}

      {/* Real-time Faded Dashed-Line Ghost Reference Layer */}
      {showGhost && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{ opacity: ghostOpacity }}
        >
          <svg
            viewBox="0 0 1000 1000"
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <filter id="ghostGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Authentic Typographic Letterform Reference */}
            {ghostMode === 'font' ? (
              <g id="ghost-font-guide">
                {/* 100% Authentic typography rendered directly via Hind Siliguri font */}
                <text
                  x="500"
                  y="780"
                  textAnchor="middle"
                  fontSize="700"
                  fontWeight="600"
                  fontFamily="'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
                  fill="#4338ca"
                  fillOpacity={0.28}
                  className="select-none pointer-events-none"
                >
                  {charDef.char}
                </text>
              </g>
            ) : initialSvgPath && ghostMode === 'dashed' ? (
              <g id="ghost-dashed-guide">
                {/* 1. Soft inner letterform tint to show the body of the letter */}
                <path
                  d={initialSvgPath}
                  fill="#818cf8"
                  fillOpacity={0.16}
                  stroke="none"
                />
                {/* 2. Crisp, perfectly aligned dashed tracing border */}
                <path
                  d={initialSvgPath}
                  fill="none"
                  stroke="#4338ca"
                  strokeWidth={3.5}
                  strokeDasharray="10 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 3. Subtle bright inner highlight dashes */}
                <path
                  d={initialSvgPath}
                  fill="none"
                  stroke="#c7d2fe"
                  strokeWidth={1.5}
                  strokeDasharray="10 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.7}
                />
              </g>
            ) : initialSvgPath && ghostMode === 'solid' ? (
              <g id="ghost-solid-guide">
                {/* Clean, authentic solid watermark */}
                <path
                  d={initialSvgPath}
                  fill="#6366f1"
                  fillOpacity={0.22}
                  stroke="#4338ca"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ) : (
              <g id="ghost-silhouette-guide">
                {/* Clean typographic silhouette */}
                {initialSvgPath ? (
                  <path
                    d={initialSvgPath}
                    fill="#4338ca"
                    fillOpacity={0.32}
                    stroke="none"
                  />
                ) : (
                  <text
                    x="500"
                    y="780"
                    textAnchor="middle"
                    fontSize="700"
                    fontWeight="600"
                    fontFamily="'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
                    fill="#4338ca"
                    fillOpacity={0.32}
                    className="select-none pointer-events-none"
                  >
                    {charDef.char}
                  </text>
                )}
              </g>
            )}
          </svg>

          {/* 4. Stroke Sequence Indicator 1 (১ / শুরু) */}
          {showStartDot && strokeMarkers.start && (
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              style={{
                left: `${strokeMarkers.start.x}px`,
                top: `${strokeMarkers.start.y}px`,
              }}
            >
              <span className="absolute w-8 h-8 rounded-full bg-emerald-400/40 animate-ping" />
              <span className="relative w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center shadow-md border-2 border-white">
                ১
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold shadow-xs whitespace-nowrap">
                শুরু
              </span>
            </div>
          )}

          {/* 5. Stroke Sequence Indicator 2 (২) for multi-stroke letters */}
          {showStartDot && strokeMarkers.second && (
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              style={{
                left: `${strokeMarkers.second.x}px`,
                top: `${strokeMarkers.second.y}px`,
              }}
            >
              <span className="relative w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center shadow-md border-2 border-white">
                ২
              </span>
            </div>
          )}
        </div>
      )}

      {/* Replay Animated Stylus Tip */}
      {isReplaying && replayingTip && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-75"
          style={{
            left: `${replayingTip.x}px`,
            top: `${replayingTip.y}px`,
          }}
        >
          <div className="relative flex items-center justify-center">
            <span
              className="absolute w-8 h-8 rounded-full opacity-60 animate-ping"
              style={{ backgroundColor: replayingTip.color || '#9333ea' }}
            />
            <div
              className="w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm"
              style={{ backgroundColor: replayingTip.color || '#9333ea' }}
            >
              ✍️
            </div>
          </div>
        </div>
      )}

      {/* HTML5 Canvas with Pointer Events for Stylus, Apple Pencil & Finger drawing */}
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative z-10 w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
