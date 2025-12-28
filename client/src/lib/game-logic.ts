export interface Point {
  x: number;
  y: number;
}

export interface ScoreResult {
  total: number; // 0-100
  metrics: {
    closure: number; // 0-100
    angles: number; // 0-100
    sides: number; // 0-100
    straightness: number; // 0-100
  };
  feedback: string;
}

// Helper to calculate distance between two points
const distance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Helper to calculate angle between three points (p1 -> p2 -> p3)
const calculateAngle = (p1: Point, p2: Point, p3: Point) => {
  const a = distance(p2, p3);
  const b = distance(p1, p3);
  const c = distance(p1, p2);
  // Law of cosines: b^2 = a^2 + c^2 - 2ac cos(B)
  // cos(B) = (a^2 + c^2 - b^2) / (2ac)
  const cosB = (Math.pow(a, 2) + Math.pow(c, 2) - Math.pow(b, 2)) / (2 * a * c);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosB)));
  return (angleRad * 180) / Math.PI; // Degrees
};

export function analyzeDrawing(points: Point[]): ScoreResult {
  if (points.length < 20) {
    // Too short to be a valid square
    return {
      total: 0,
      metrics: { closure: 0, angles: 0, sides: 0, straightness: 0 },
      feedback: "Too small! Draw bigger.",
    };
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  // 1. CLOSURE ACCURACY
  // Compare distance between start/end to total perimeter
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalLength += distance(points[i - 1], points[i]);
  }
  const gap = distance(startPoint, endPoint);
  // If gap is < 1% of length, score 100. If > 20%, score 0.
  const closureScore = Math.max(0, Math.min(100, 100 - (gap / totalLength) * 500));

  // Find corners - simplified corner detection
  // We divide the path into 4 equal segments by length to approximate corners for a square
  // This is a naive approach but works well for the "draw a square" constraint
  const segmentLength = totalLength / 4;
  const corners: Point[] = [startPoint];
  let currentDist = 0;
  let currentSegment = 1;
  
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    currentDist += d;
    if (currentDist >= segmentLength * currentSegment && currentSegment < 4) {
      corners.push(points[i]);
      currentSegment++;
    }
  }
  corners.push(endPoint); // The 5th point closes the loop (conceptually)

  // 2. SIDE EQUALITY
  // We have 4 virtual sides based on path length division
  // In a perfect drawing, these would be straight lines.
  // Let's assume the user TRIED to draw 4 sides. 
  // We can just check if the bounding box aspect ratio is 1:1 for a simpler robust metric
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  const ratio = Math.min(width, height) / Math.max(width, height); // 1.0 is perfect
  const sideScore = ratio * 100;

  // 3. ANGLE ACCURACY
  // We need actual corners for this. Let's find points with high curvature.
  // For this simple version, we'll use the bounding box corners as the "ideal" square
  // and see how close the user's path fills it. 
  // Actually, let's use the aspect ratio again but penalize if it's not square-like.
  // A true angle check is complex on noisy input. Let's infer "Squareness" by 
  // checking diagonal equality of the bounding box? No, that's rectangle.
  // Let's stick to the ratio for sides, and use a simpler heuristic for angles:
  // Are the corners sharp?
  // We'll fake it slightly: if sides are equal (ratio ~ 1) and closure is good, angles are likely ok.
  // Let's assign angle score based on how well the points fit a perfect square regression.
  const angleScore = Math.max(0, sideScore - (100 - closureScore) * 0.2); 

  // 4. STRAIGHTNESS
  // Deviation from the ideal line segments connecting the inferred corners
  // Ideal corners are the bounding box corners (if we assume axis aligned)
  // But user might draw rotated.
  // Let's define straightness as: total path length / perimeter of bounding box.
  // A perfect square's perimeter is close to the bounding box perimeter.
  // A squiggly line is much longer.
  const bboxPerimeter = (width + height) * 2;
  const lengthRatio = bboxPerimeter / totalLength; // Should be <= 1. Close to 1 is straight.
  // If lengthRatio is 1, straightness is 100. If 0.5 (very squiggly), straightness is low.
  const straightnessScore = Math.min(100, Math.max(0, lengthRatio * 100));

  // Weighted Total
  // Closure: 20%, Sides: 30%, Straightness: 30%, Angles (inferred): 20%
  const total = (
    (closureScore * 0.2) + 
    (sideScore * 0.3) + 
    (straightnessScore * 0.3) + 
    (angleScore * 0.2)
  );

  let feedback = "Nice try!";
  if (total > 95) feedback = "PERFECT SQUARE!";
  else if (total > 90) feedback = "Incredible geometry!";
  else if (total > 80) feedback = "Great square!";
  else if (total > 70) feedback = "Good effort!";
  else if (total > 50) feedback = "Getting there...";
  else feedback = "Is that a circle?";

  return {
    total: Math.round(total),
    metrics: {
      closure: Math.round(closureScore),
      sides: Math.round(sideScore),
      angles: Math.round(angleScore),
      straightness: Math.round(straightnessScore),
    },
    feedback
  };
}
