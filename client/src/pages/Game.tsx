import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { ScoreCard } from "@/components/ScoreCard";
import { analyzeDrawing, type Point, type ScoreResult } from "@/lib/game-logic";
import { useCreateScore } from "@/hooks/use-scores";
import confetti from "canvas-confetti";
import { RotateCcw, Home, Share2, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { MemphisReportCard } from "@/components/MemphisReportCard";

export default function Game() {
  const [_, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);

  // Performance optimization: Use refs during drawing to avoid React re-renders
  const pointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const createScore = useCreateScore();

  // Draw the grid (called once on mount/resize)
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    const gridSize = 40;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  // Resize canvas to full screen
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawGrid(ctx, canvas.width, canvas.height);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawGrid]);

  // Redraw full canvas (only when result changes or points are set from state)
  useEffect(() => {
    // Only redraw from state when not actively drawing and we have points
    if (isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and redraw grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw user path from state
    if (points.length > 0) {
      ctx.strokeStyle = result
        ? result.total > 80
          ? "#4ade80"
          : "#facc15"
        : "#fff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = result ? 0 : 10;
      ctx.shadowColor = ctx.strokeStyle;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Visual Debugging Overlay
      if (result && result.debug) {
        // Calculate drawing bounds to map normalized debug points back to screen
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        points.forEach((p) => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const scale = Math.max(width, height) / 1.0; // Our normalization was roughly 1.0 size

        const mapPoint = (p: Point) => ({
          x: centerX + p.x * scale,
          y: centerY + p.y * scale,
        });

        // 1. Draw Ideal Square (Cyan)
        ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const ideal = result.debug.idealSquare.map(mapPoint);
        ctx.moveTo(ideal[0].x, ideal[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(ideal[i].x, ideal[i].y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Draw Detected Corners (Red)
        ctx.fillStyle = "#ef4444";
        result.debug.corners.forEach((p) => {
          const pt = mapPoint(p);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Close loop visually if done (Legacy simple closure line)
      if (result && !result.debug) {
        ctx.beginPath();
        ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [points, result, drawGrid]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (result) return; // Prevent drawing after result

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas and redraw grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    const pos = getPos(e);
    pointsRef.current = [pos];
    lastPointRef.current = pos;
    isDrawingRef.current = true;
    setIsDrawing(true);
    setPoints([]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || result) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);

    // Add point to ref (no React re-render!)
    pointsRef.current.push(pos);

    // Draw incrementally - just the new line segment
    if (lastPointRef.current) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#fff";

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    lastPointRef.current = pos;
  };

  const handleEnd = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    lastPointRef.current = null;

    const finalPoints = pointsRef.current;

    if (finalPoints.length > 10) {
      // Sync points to state for the result display effect
      setPoints([...finalPoints]);

      const scoreResult = analyzeDrawing(finalPoints);
      setResult(scoreResult);

      // Submit score to backend
      createScore.mutate({
        score: scoreResult.total,
        metrics: scoreResult.metrics,
      });

      // Celebration if good score
      if (scoreResult.total > 80) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#4ade80", "#22c55e", "#ffffff"],
        });
      }
    } else {
      // Too short, just reset
      setPoints([]);
      pointsRef.current = [];
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    if ("touches" in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const resetGame = () => {
    setPoints([]);
    setResult(null);
    setIsDrawing(false);
    pointsRef.current = [];
    isDrawingRef.current = false;
    lastPointRef.current = null;

    // Redraw fresh grid
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid(ctx, canvas.width, canvas.height);
      }
    }
  };

  const downloadReportCard = async () => {
    if (!resultCardRef.current || !result) return;

    try {
      // The MemphisReportCard is already rendered in the DOM (hidden) with the styles.
      // Wait for styles and fonts to apply
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(resultCardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `perfect-square-${result.total}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download:", error);
      alert("Download failed. Please try again.");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className="absolute inset-0 z-10 canvas-container"
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none pt-20 px-8 sm:pt-6 sm:px-6 flex flex-col justify-between safe-area-inset">
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto gap-2">
          <Button variant="ghost" onClick={() => setLocation("/")} className="w-14 h-14 !p-0 bg-black/40 border border-white/10 rounded-full hover:bg-black/60 backdrop-blur-sm">
            <Home className="w-13 h-13 text-emerald-500" />
            <span className="hidden sm:inline">Home</span>
          </Button>

          <div className="text-right pt-5">
            <p className="font-display text-lg sm:text-xl text-primary">Perfect Square</p>
          </div>
        </div>

        {/* Instructions (Only visible when empty) */}
        {!isDrawing && points.length === 0 && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center px-4"
          >
            <p className="text-muted-foreground font-mono animate-pulse text-sm sm:text-base">
              <span className="hidden sm:inline">Click & Drag to Draw</span>
              <span className="sm:hidden">Tap & Drag to Draw</span>
            </p>
          </motion.div>
        )}

        {/* Hidden Report Card for Download */}
        {result && (
          <div
            style={{
              position: 'fixed',
              left: '-9999px',
              top: '-9999px',
              opacity: 0,
            }}
          >
            <div ref={resultCardRef}>
              <MemphisReportCard result={result} />
            </div>
          </div>
        )}

        {/* Results Panel - Modal */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto"
            >
              <MemphisReportCard
                result={result}
                onAgain={resetGame}
                onSave={downloadReportCard}
                onClose={resetGame}
                onMint={() => alert("Mint feature coming soon!")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

