export interface Point {
  x: number;
  y: number;
}

export interface ScoreResult {
  total: number;
  metrics: {
    closure: number;
    angles: number;
    sides: number;
    straightness: number;
  };
  feedback: string;
  debug?: {
    corners: Point[];
    idealSquare: Point[];
  };
}

const CONSTANTS = {
  MIN_POINTS: 20,
  CORNER_THRESHOLD: 0.5, // radians for direction change
  CLOSURE_THRESHOLD: 0.05, // 5% of perimeter
  SMOOTHING_WINDOW: 5,
  DOWNSAMPLE_RATE: 2,
};

// --- Math Utilities ---

const distance = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

const getVector = (p1: Point, p2: Point) => ({ x: p2.x - p1.x, y: p2.y - p1.y });

const dotProduct = (v1: { x: number; y: number }, v2: { x: number; y: number }) => 
  v1.x * v2.x + v1.y * v2.y;

const magnitude = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

const angleBetween = (v1: { x: number; y: number }, v2: { x: number; y: number }) => {
  const m1 = magnitude(v1);
  const m2 = magnitude(v2);
  if (m1 === 0 || m2 === 0) return 0;
  const dot = dotProduct(v1, v2);
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2))));
};

// --- Logic Modules ---

function normalizePath(points: Point[]): Point[] {
  // 1. Centroid Translation
  let sumX = 0, sumY = 0;
  points.forEach(p => { sumX += p.x; sumY += p.y; });
  const centroid = { x: sumX / points.length, y: sumY / points.length };
  let normalized = points.map(p => ({ x: p.x - centroid.x, y: p.y - centroid.y }));

  // 2. Uniform Scaling (longest side = 1)
  let maxDist = 0;
  normalized.forEach(p => { maxDist = Math.max(maxDist, Math.hypot(p.x, p.y)); });
  const scale = 0.5 / maxDist; // Scale so max radius is 0.5 (diameter/side ~ 1)
  normalized = normalized.map(p => ({ x: p.x * scale, y: p.y * scale }));

  // 3. Smoothing (Moving Average)
  const smoothed: Point[] = [];
  for (let i = 0; i < normalized.length; i++) {
    let avgX = 0, avgY = 0, count = 0;
    for (let j = -CONSTANTS.SMOOTHING_WINDOW; j <= CONSTANTS.SMOOTHING_WINDOW; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < normalized.length) {
        avgX += normalized[idx].x;
        avgY += normalized[idx].y;
        count++;
      }
    }
    smoothed.push({ x: avgX / count, y: avgY / count });
  }

  return smoothed;
}

function detectCorners(points: Point[]): Point[] {
  const candidates: { idx: number; strength: number }[] = [];
  
  for (let i = 2; i < points.length - 2; i++) {
    const v1 = getVector(points[i - 2], points[i]);
    const v2 = getVector(points[i], points[i + 2]);
    const angleChange = angleBetween(v1, v2);
    if (angleChange > 0.3) { // Curvature spike
      candidates.push({ idx: i, strength: angleChange });
    }
  }

  // Cluster candidates to find 4 peaks
  candidates.sort((a, b) => b.strength - a.strength);
  const corners: number[] = [];
  for (const cand of candidates) {
    if (corners.length >= 4) break;
    if (corners.every(idx => Math.abs(idx - cand.idx) > points.length / 8)) {
      corners.push(cand.idx);
    }
  }

  // If we don't have 4, pick points based on path length segments
  while (corners.length < 4) {
    const nextIdx = (corners.length * points.length) / 4;
    corners.push(Math.floor(nextIdx));
  }

  return corners.sort((a, b) => a - b).map(idx => points[idx]);
}

function evaluateSides(corners: Point[]): number {
  const lengths = [];
  for (let i = 0; i < 4; i++) {
    lengths.push(distance(corners[i], corners[(i + 1) % 4]));
  }
  const avg = lengths.reduce((a, b) => a + b) / 4;
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - avg, 2), 0) / 4;
  const stdDev = Math.sqrt(variance);
  const relError = stdDev / avg;
  return Math.max(0, 100 * (1 - relError * 5)); // 20% error = 0 score
}

function evaluateAngles(corners: Point[]): number {
  let totalScore = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = corners[(i + 3) % 4];
    const p2 = corners[i];
    const p3 = corners[(i + 1) % 4];
    const v1 = getVector(p2, p1);
    const v2 = getVector(p2, p3);
    const angle = angleBetween(v1, v2);
    const ideal = Math.PI / 2;
    const diff = Math.abs(angle - ideal);
    totalScore += Math.max(0, 1 - diff / (Math.PI / 4)); // 45 deg error = 0
  }
  return (totalScore / 4) * 100;
}

function evaluateStraightness(points: Point[], corners: Point[]): number {
  let totalDeviation = 0;
  let count = 0;
  
  for (let i = 0; i < 4; i++) {
    const start = corners[i];
    const end = corners[(i + 1) % 4];
    const sideVec = getVector(start, end);
    const sideLen = magnitude(sideVec);
    const normal = { x: -sideVec.y / sideLen, y: sideVec.x / sideLen };

    // Find points belonging to this segment
    points.forEach(p => {
      const toP = getVector(start, p);
      const proj = dotProduct(toP, sideVec) / sideLen;
      if (proj >= 0 && proj <= sideLen) {
        const distToLine = Math.abs(dotProduct(toP, normal));
        totalDeviation += distToLine;
        count++;
      }
    });
  }
  
  const avgDev = count > 0 ? totalDeviation / count : 0.5;
  return Math.max(0, 100 * (1 - avgDev * 10)); // Heuristic
}

function calculateFinalScore(metrics: ScoreResult["metrics"]): number {
  const weights = {
    angles: 0.35,
    sides: 0.30,
    straightness: 0.25,
    closure: 0.10,
  };
  return Math.round(
    metrics.angles * weights.angles +
    metrics.sides * weights.sides +
    metrics.straightness * weights.straightness +
    metrics.closure * weights.closure
  );
}

export function analyzeDrawing(rawPoints: Point[]): ScoreResult {
  if (rawPoints.length < CONSTANTS.MIN_POINTS) {
    return {
      total: 0,
      metrics: { closure: 0, angles: 0, sides: 0, straightness: 0 },
      feedback: "Too fast! Draw more slowly.",
    };
  }

  const points = normalizePath(rawPoints);
  const corners = detectCorners(points);
  
  // Metrics
  const startP = points[0];
  const endP = points[points.length - 1];
  const closureDist = distance(startP, endP);
  const closureScore = Math.max(0, 100 * (1 - closureDist / (CONSTANTS.CLOSURE_THRESHOLD * 5)));

  const sidesScore = evaluateSides(corners);
  const anglesScore = evaluateAngles(corners);
  const straightnessScore = evaluateStraightness(points, corners);

  const metrics = {
    closure: Math.round(closureScore),
    sides: Math.round(sidesScore),
    angles: Math.round(anglesScore),
    straightness: Math.round(straightnessScore),
  };

  const total = calculateFinalScore(metrics);

  // Generate Ideal Square for Debugging
  // Use the average center and size from corners
  let centerX = 0, centerY = 0;
  corners.forEach(p => { centerX += p.x; centerY += p.y; });
  centerX /= 4; centerY /= 4;
  const avgDist = corners.reduce((acc, p) => acc + distance({x:centerX, y:centerY}, p), 0) / 4;
  const radius = avgDist;
  const idealSquare = [
    { x: centerX - radius, y: centerY - radius },
    { x: centerX + radius, y: centerY - radius },
    { x: centerX + radius, y: centerY + radius },
    { x: centerX - radius, y: centerY + radius },
  ];

  // Feedback mapping
  let feedback = "Needs Practice";
  if (total >= 95) feedback = "Perfect Square";
  else if (total >= 85) feedback = "Almost Perfect";
  else if (total >= 70) feedback = "Good Attempt";

  // Map back to screen coordinates for debugging
  // We need the original transformation info, but for now we'll just skip 
  // complex coordinate mapping and rely on the UI component to handle the overlay
  // if we can. Actually, it's easier to just return the normalized coordinates 
  // and have the UI scale them to the canvas.

  return {
    total,
    metrics,
    feedback,
    debug: {
      corners,
      idealSquare
    }
  };
}

