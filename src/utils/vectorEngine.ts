/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point, Stroke, BrushStyle, SmoothingLevel } from '../types/font';

/**
 * Calculates midpoint between two points
 */
export function getMidPoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    pressure: ((p1.pressure ?? 0.5) + (p2.pressure ?? 0.5)) / 2,
    time: ((p1.time ?? 0) + (p2.time ?? 0)) / 2,
  };
}

/**
 * Filters out jittery micro-movements and applies an Exponential Moving Average (EMA) low-pass filter
 */
export function filterAndSmoothRawPoints(
  rawPoints: Point[],
  smoothingLevel: SmoothingLevel = 'medium'
): Point[] {
  if (rawPoints.length <= 2) return rawPoints;

  // 1. Minimum distance culling (removes sensor noise and zero-delta duplicate events)
  const culled: Point[] = [rawPoints[0]];
  const minDistance = smoothingLevel === 'high' ? 3.5 : smoothingLevel === 'low' ? 1.5 : 2.5;

  for (let i = 1; i < rawPoints.length; i++) {
    const prev = culled[culled.length - 1];
    const cur = rawPoints[i];
    const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y);

    if (dist >= minDistance || i === rawPoints.length - 1) {
      culled.push(cur);
    }
  }

  if (culled.length <= 2) return culled;

  // 2. Exponential Moving Average smoothing
  const alpha = smoothingLevel === 'high' ? 0.45 : smoothingLevel === 'low' ? 0.75 : 0.6;
  const smoothed: Point[] = [culled[0]];

  for (let i = 1; i < culled.length - 1; i++) {
    const prevSmoothed = smoothed[i - 1];
    const target = culled[i];

    smoothed.push({
      x: alpha * target.x + (1 - alpha) * prevSmoothed.x,
      y: alpha * target.y + (1 - alpha) * prevSmoothed.y,
      pressure: target.pressure,
      time: target.time,
    });
  }

  // Preserve exact last point
  smoothed.push(culled[culled.length - 1]);
  return smoothed;
}

/**
 * Chaikin's Corner-Cutting Algorithm
 * Recursively cuts sharp corners at 25% and 75% along each segment.
 */
export function applyChaikinSmoothing(points: Point[], iterations = 2): Point[] {
  if (points.length <= 2 || iterations <= 0) return points;

  let current = points;

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [current[0]]; // preserve starting point

    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      // Q = 0.75 * P0 + 0.25 * P1
      const q: Point = {
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
        pressure: 0.75 * (p0.pressure ?? 0.5) + 0.25 * (p1.pressure ?? 0.5),
        time: p0.time,
      };

      // R = 0.25 * P0 + 0.75 * P1
      const r: Point = {
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
        pressure: 0.25 * (p0.pressure ?? 0.5) + 0.75 * (p1.pressure ?? 0.5),
        time: p1.time,
      };

      next.push(q, r);
    }

    next.push(current[current.length - 1]); // preserve end point
    current = next;
  }

  return current;
}

/**
 * Computes smoothly modulated variable widths across a sequence of stroke points based on
 * pointer pressure, movement velocity, and calligraphic nib orientation.
 */
export function computeVariableWidths(
  points: Point[],
  baseWidth: number,
  brushStyle: BrushStyle = 'calligraphy',
  nibAngleRad = (40 * Math.PI) / 180
): number[] {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1) return [Math.max(3, baseWidth * 0.75)];

  // 1. Smooth the raw pressure channel with moving average to eliminate sudden step artifacts
  const smoothedPressures: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)].pressure ?? 0.5;
    const cur = points[i].pressure ?? 0.5;
    const next = points[Math.min(n - 1, i + 1)].pressure ?? 0.5;
    smoothedPressures.push(prev * 0.25 + cur * 0.5 + next * 0.25);
  }

  const widths: number[] = [];

  for (let i = 0; i < n; i++) {
    const p = points[i];
    let dx = 0;
    let dy = 0;

    if (i < n - 1) {
      dx = points[i + 1].x - p.x;
      dy = points[i + 1].y - p.y;
    } else if (i > 0) {
      dx = p.x - points[i - 1].x;
      dy = p.y - points[i - 1].y;
    }

    const rawPressure = smoothedPressures[i];
    // Non-linear power response curve for natural tactile feel
    // Light touch (0.1) produces delicate hairline; Heavy touch (1.0) produces bold calligraphic stroke
    const pressureMultiplier = Math.pow(Math.max(0.08, Math.min(1.0, rawPressure)), 0.75);
    const pressureScale = 0.35 + 1.25 * pressureMultiplier;

    let styleScale = 1.0;
    if (brushStyle === 'calligraphy') {
      const strokeAngle = Math.atan2(dy, dx);
      const angleDiff = strokeAngle - nibAngleRad;
      // Perpendicular to nib is thickest, parallel is razor-thin
      styleScale = 0.3 + 0.7 * Math.pow(Math.abs(Math.sin(angleDiff)), 1.2);
    } else if (brushStyle === 'brush') {
      styleScale = 0.85 + 0.15 * Math.sin(i * 0.25);
    }

    let w = baseWidth * pressureScale * styleScale;

    // Graceful calligraphic entrance and exit tapers
    const taperLength = Math.min(7, Math.floor(n / 3));
    if (taperLength > 0) {
      if (i < taperLength) {
        const t = (i + 1) / (taperLength + 1);
        w *= Math.sin((t * Math.PI) / 2);
      } else if (i >= n - taperLength) {
        const t = (n - i) / (taperLength + 1);
        w *= Math.sin((t * Math.PI) / 2);
      }
    }

    widths.push(Math.max(2.5, w));
  }

  return widths;
}

/**
 * Builds a calligraphic ribbon polygon (outline) around the smoothed stroke path with
 * variable width based on PointerEvent pressure.
 */
export function generateCalligraphicRibbon(
  points: Point[],
  baseWidth: number,
  scaleX = 1,
  scaleY = 1,
  brushStyle: BrushStyle = 'calligraphy',
  nibAngleRad = (40 * Math.PI) / 180
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    const r = ((baseWidth * (p.pressure || 0.6)) / 2) * scaleX;
    return `M ${(p.x * scaleX).toFixed(1)},${(p.y * scaleY).toFixed(1)} m -${r.toFixed(1)},0 a ${r.toFixed(1)},${r.toFixed(1)} 0 1,0 ${(r * 2).toFixed(1)},0 a ${r.toFixed(1)},${r.toFixed(1)} 0 1,0 -${(r * 2).toFixed(1)},0`;
  }

  const widths = computeVariableWidths(points, baseWidth, brushStyle, nibAngleRad);
  const leftEdge: { x: number; y: number }[] = [];
  const rightEdge: { x: number; y: number }[] = [];
  const totalPoints = points.length;

  for (let i = 0; i < totalPoints; i++) {
    const cur = points[i];
    let dx = 0;
    let dy = 0;

    if (i < totalPoints - 1) {
      dx = points[i + 1].x - cur.x;
      dy = points[i + 1].y - cur.y;
    } else if (i > 0) {
      dx = cur.x - points[i - 1].x;
      dy = cur.y - points[i - 1].y;
    }

    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const half = widths[i] / 2;

    leftEdge.push({
      x: (cur.x + nx * half) * scaleX,
      y: (cur.y + ny * half) * scaleY,
    });
    rightEdge.push({
      x: (cur.x - nx * half) * scaleX,
      y: (cur.y - ny * half) * scaleY,
    });
  }

  // Build closed SVG path string with smooth Bézier segments
  let d = `M ${leftEdge[0].x.toFixed(1)},${leftEdge[0].y.toFixed(1)}`;

  // Forward along left edge using midpoints for curvature
  for (let i = 1; i < leftEdge.length - 1; i++) {
    const cur = leftEdge[i];
    const next = leftEdge[i + 1];
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    d += ` Q ${cur.x.toFixed(1)},${cur.y.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`;
  }
  const lastLeft = leftEdge[leftEdge.length - 1];
  d += ` L ${lastLeft.x.toFixed(1)},${lastLeft.y.toFixed(1)}`;

  // Rounded end cap
  const lastRight = rightEdge[rightEdge.length - 1];
  d += ` L ${lastRight.x.toFixed(1)},${lastRight.y.toFixed(1)}`;

  // Backward along right edge using midpoints
  for (let i = rightEdge.length - 2; i > 0; i--) {
    const cur = rightEdge[i];
    const prev = rightEdge[i - 1];
    const midX = (cur.x + prev.x) / 2;
    const midY = (cur.y + prev.y) / 2;
    d += ` Q ${cur.x.toFixed(1)},${cur.y.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`;
  }

  d += ` L ${rightEdge[0].x.toFixed(1)},${rightEdge[0].y.toFixed(1)}`;
  d += ' Z';
  return d;
}

/**
 * Converts smoothed points into a center-line Bézier path
 */
export function pointsToSmoothBezierPath(
  points: Point[],
  scaleX = 1,
  scaleY = 1
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    const r = (p.pressure || 0.5) * 4;
    return `M ${(p.x * scaleX).toFixed(1)},${(p.y * scaleY).toFixed(1)} m -${r},0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
  }

  let d = `M ${(points[0].x * scaleX).toFixed(1)},${(points[0].y * scaleY).toFixed(1)}`;

  if (points.length === 2) {
    d += ` L ${(points[1].x * scaleX).toFixed(1)},${(points[1].y * scaleY).toFixed(1)}`;
    return d;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const mid = getMidPoint(current, next);

    d += ` Q ${(current.x * scaleX).toFixed(1)},${(current.y * scaleY).toFixed(1)} ${(mid.x * scaleX).toFixed(1)},${(mid.y * scaleY).toFixed(1)}`;
  }

  const last = points[points.length - 1];
  d += ` L ${(last.x * scaleX).toFixed(1)},${(last.y * scaleY).toFixed(1)}`;

  return d;
}

/**
 * Converts all canvas strokes into a single normalized SVG path string (0..1000 viewport)
 * with the variable-width pressure algorithm applied.
 */
export function strokesToNormalizedSvgPath(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number
): string {
  if (!strokes.length || canvasWidth <= 0 || canvasHeight <= 0) return '';

  const scaleX = 1000 / canvasWidth;
  const scaleY = 1000 / canvasHeight;

  return strokes
    .map((stroke) => {
      const { points, width, brushStyle = 'calligraphy', smoothing = 'medium' } = stroke;
      if (!points.length) return '';

      const filtered = filterAndSmoothRawPoints(points, smoothing);
      const iterations = smoothing === 'high' ? 3 : smoothing === 'low' ? 1 : 2;
      const smoothed = applyChaikinSmoothing(filtered, iterations);

      // Default and calligraphy both utilize the rich variable-width ribbon
      if (brushStyle === 'calligraphy' || brushStyle === 'brush') {
        return generateCalligraphicRibbon(smoothed, width, scaleX, scaleY, brushStyle);
      }

      return pointsToSmoothBezierPath(smoothed, scaleX, scaleY);
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Renders variable-width digital ink on an HTML5 canvas context in real-time
 */
export function renderStrokesOnCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  activeStroke?: Stroke | null
) {
  const allStrokes = activeStroke ? [...strokes, activeStroke] : strokes;

  allStrokes.forEach((stroke) => {
    const { points, color, width, brushStyle = 'calligraphy', smoothing = 'medium' } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const shouldSmooth = points.length > 3;
    const workingPoints = shouldSmooth
      ? applyChaikinSmoothing(
          filterAndSmoothRawPoints(points, smoothing),
          smoothing === 'high' ? 2 : 1
        )
      : points;

    // Calligraphic variable-width ribbon rendering
    if ((brushStyle === 'calligraphy' || brushStyle === 'brush') && workingPoints.length >= 2) {
      const widths = computeVariableWidths(workingPoints, width, brushStyle);
      const totalPoints = workingPoints.length;
      const leftEdge: { x: number; y: number }[] = [];
      const rightEdge: { x: number; y: number }[] = [];

      for (let i = 0; i < totalPoints; i++) {
        const cur = workingPoints[i];
        let dx = 0;
        let dy = 0;

        if (i < totalPoints - 1) {
          dx = workingPoints[i + 1].x - cur.x;
          dy = workingPoints[i + 1].y - cur.y;
        } else if (i > 0) {
          dx = cur.x - workingPoints[i - 1].x;
          dy = cur.y - workingPoints[i - 1].y;
        }

        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const half = widths[i] / 2;
        leftEdge.push({ x: cur.x + nx * half, y: cur.y + ny * half });
        rightEdge.push({ x: cur.x - nx * half, y: cur.y - ny * half });
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(leftEdge[0].x, leftEdge[0].y);

      for (let i = 1; i < leftEdge.length; i++) {
        ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
      }

      ctx.lineTo(rightEdge[rightEdge.length - 1].x, rightEdge[rightEdge.length - 1].y);

      for (let i = rightEdge.length - 2; i >= 0; i--) {
        ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    // Single point dot
    if (workingPoints.length === 1) {
      const p = workingPoints[0];
      const pressureMultiplier = Math.pow(p.pressure || 0.5, 0.75);
      const radius = Math.max(2, (width * (0.35 + 1.25 * pressureMultiplier)) / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Default clean pen mode
    ctx.strokeStyle = color;
    for (let i = 1; i < workingPoints.length; i++) {
      const p0 = workingPoints[i - 1];
      const p1 = workingPoints[i];
      const mid = getMidPoint(p0, p1);

      const pressure = p1.pressure !== undefined ? p1.pressure : 0.6;
      ctx.lineWidth = Math.max(2, width * (0.4 + pressure * 0.9));

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
      ctx.stroke();
    }

    const last = workingPoints[workingPoints.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.restore();
  });
}
