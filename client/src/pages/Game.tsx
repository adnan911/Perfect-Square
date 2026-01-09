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
      // Create the Witcher-themed card container
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 280px;
        height: 400px;
        z-index: 9999;
        font-family: 'Cinzel', serif;
      `;

      tempDiv.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Luckiest+Guy&display=swap');
        </style>
        <!-- Witcher Card -->
        <div style="
          position: relative;
          width: 280px;
          height: 400px;
          background-color: #121214;
          border: 3px solid #4a4a4a;
          font-family: 'Cinzel', Georgia, serif;
          color: #a8a8a8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          box-sizing: border-box;
          overflow: hidden;
          background-image: radial-gradient(circle at 50% 30%, #2a2a2e, #121214 70%),
            repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 4px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.8), inset 0 0 32px rgba(0,0,0,0.9);
        ">
          <!-- Magic Aura Overlay -->
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: radial-gradient(circle at 50% 40%, rgba(205,179,128,0.15) 0%, transparent 60%);
            pointer-events: none;
          "></div>

          <!-- Corner Decorations -->
          <div style="position: absolute; top: 8px; left: 8px; width: 32px; height: 32px; border: 2px solid #cba874; border-right: none; border-bottom: none; opacity: 0.8;"></div>
          <div style="position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: 2px solid #cba874; border-left: none; border-bottom: none; opacity: 0.8;"></div>
          <div style="position: absolute; bottom: 8px; left: 8px; width: 32px; height: 32px; border: 2px solid #cba874; border-right: none; border-top: none; opacity: 0.8;"></div>
          <div style="position: absolute; bottom: 8px; right: 8px; width: 32px; height: 32px; border: 2px solid #cba874; border-left: none; border-top: none; opacity: 0.8;"></div>

          <!-- Card Content -->
          <div style="
            position: relative;
            z-index: 2;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
          ">
            <!-- Title -->
            <div style="
              text-transform: uppercase;
              letter-spacing: 0.15em;
              font-size: 14px;
              color: #cba874;
              border-bottom: 1px solid #4a4a4a;
              padding-bottom: 8px;
              width: 100%;
              text-align: center;
              text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            ">Perfect Square Report</div>

            <!-- Score Circle -->
            <div style="
              width: 120px;
              height: 120px;
              margin: 8px 0;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              filter: drop-shadow(0 8px 16px rgba(0,0,0,0.8));
            ">
              <!-- Outer Ring -->
              <div style="
                position: absolute;
                width: 100%;
                height: 100%;
                border: 2px solid #cba874;
                border-radius: 50%;
                opacity: 0.5;
              "></div>
              <!-- Inner Ring -->
              <div style="
                position: absolute;
                width: 90%;
                height: 90%;
                border: 1px solid #4a4a4a;
                border-radius: 50%;
              "></div>
              <!-- Score Value -->
              <span style="
                font-size: 56px;
                font-weight: 700;
                color: #fff;
                font-family: 'Luckiest Guy', cursive;
                line-height: 1;
                text-shadow: 0 0 20px #cba874, 0 4px 8px rgba(0,0,0,0.8);
                z-index: 1;
              ">${result.total}</span>
            </div>

            <!-- Feedback -->
            <div style="
              font-size: 12px;
              color: #a8a8a8;
              font-style: italic;
              text-align: center;
              padding: 5px 16px;
              background: rgba(0,0,0,0.3);
              border-radius: 4px;
              border: 1px solid #4a4a4a;
            ">"${result.feedback}"</div>

            <!-- Stats -->
            <div style="
              margin-top: auto;
              width: 100%;
              font-size: 11px;
              color: #888;
              text-align: center;
              line-height: 1.6;
            ">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding: 4px 0;">
                <span style="text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Closure</span>
                <span style="color: #4ade80; font-weight: 600;">${result.metrics.closure}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding: 4px 0;">
                <span style="text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Sides</span>
                <span style="color: #4ade80; font-weight: 600;">${result.metrics.sides}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding: 4px 0;">
                <span style="text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Angles</span>
                <span style="color: #4ade80; font-weight: 600;">${result.metrics.angles}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span style="text-transform: uppercase; letter-spacing: 0.1em; color: #666;">Straight</span>
                <span style="color: #4ade80; font-weight: 600;">${result.metrics.straightness}</span>
              </div>
            </div>
          </div>

          <!-- Branding -->
          <div style="
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8px;
            letter-spacing: 0.2em;
            color: rgba(168,168,168,0.4);
            text-transform: uppercase;
            z-index: 3;
          ">Perfect Square</div>
        </div>
      `;

      document.body.appendChild(tempDiv);

      // Wait for styles and fonts to apply
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(tempDiv, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });

      document.body.removeChild(tempDiv);

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
            <Home className="w-10 h-10 text-emerald-500" />
            <span className="hidden sm:inline">Home</span>
          </Button>

          <div className="text-right">
            <h2 className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-widest">
              Target
            </h2>
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

        {/* Hidden Report Card for Download - Same as visible cyber card but without buttons */}
        {result && (
          <div
            ref={resultCardRef}
            style={{
              position: 'fixed',
              left: '-9999px',
              top: '-9999px',
              width: '320px',
              height: '420px',
              opacity: 0,
            }}
          >
            <div className="cyber-card" style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div className="cyber-card-content">
                <div className="cyber-card-glare"></div>
                <div className="cyber-lines">
                  <span></span><span></span><span></span><span></span>
                </div>

                {/* Score Section */}
                <div className="cyber-score-title">Total Score</div>
                <div className="cyber-score-value">{result.total}</div>

                {/* Feedback */}
                <p className="cyber-feedback">"{result.feedback}"</p>

                {/* Metrics */}
                <div className="cyber-metrics">
                  <div className="cyber-metric">
                    <div className="cyber-metric-label">Closure</div>
                    <div className="cyber-metric-value">{result.metrics.closure}</div>
                  </div>
                  <div className="cyber-metric">
                    <div className="cyber-metric-label">Sides</div>
                    <div className="cyber-metric-value">{result.metrics.sides}</div>
                  </div>
                  <div className="cyber-metric">
                    <div className="cyber-metric-label">Angles</div>
                    <div className="cyber-metric-value">{result.metrics.angles}</div>
                  </div>
                  <div className="cyber-metric">
                    <div className="cyber-metric-label">Straight</div>
                    <div className="cyber-metric-value">{result.metrics.straightness}</div>
                  </div>
                </div>

                {/* Footer instead of buttons */}
                <div style={{
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  marginTop: 'auto',
                  letterSpacing: '1px'
                }}>
                  perfect Square
                </div>

                {/* Decorative Elements */}
                <div className="cyber-glowing-elements">
                  <div className="cyber-glow-1"></div>
                  <div className="cyber-glow-2"></div>
                  <div className="cyber-glow-3"></div>
                </div>
                <div className="cyber-corner-elements">
                  <span></span><span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Panel - Witcher Card Modal */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto"
            >
              <div className="witcher-card relative">
                {/* Corners */}
                <div className="witcher-corner wc-tl"></div>
                <div className="witcher-corner wc-tr"></div>
                <div className="witcher-corner wc-bl"></div>
                <div className="witcher-corner wc-br"></div>

                {/* Title */}
                <div className="text-[#cba874] text-xs tracking-[0.2em] border-b border-[#4a4a4a] pb-2 w-full text-center mb-6 font-serif">
                  PERFECT SQUARE
                </div>

                {/* Score */}
                <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                  <div className="absolute inset-0 border-2 border-[#cba874] rounded-full opacity-50"></div>
                  <div className="absolute inset-2 border border-[#4a4a4a] rounded-full"></div>
                  <span className="text-5xl font-bold text-white z-10 drop-shadow-[0_0_15px_#cba874]">
                    {result.total}
                  </span>
                </div>

                {/* Feedback */}
                <div className="text-[#a8a8a8] text-xs italic border border-[#4a4a4a] px-3 py-1 rounded bg-black/30 mb-auto text-center">
                  "{result.feedback}"
                </div>

                {/* Stats */}
                <div className="w-full text-[10px] text-gray-500 mt-4 space-y-1">
                  <div className="flex justify-between border-b border-[#333] pb-1">
                    <span>CLOSURE</span> <span className="text-emerald-500 font-bold">{result.metrics.closure}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#333] pb-1">
                    <span>SIDES</span> <span className="text-emerald-500 font-bold">{result.metrics.sides}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#333] pb-1">
                    <span>ANGLES</span> <span className="text-emerald-500 font-bold">{result.metrics.angles}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>STRAIGHT</span> <span className="text-emerald-500 font-bold">{result.metrics.straightness}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full mt-4">
                  <button
                    onClick={resetGame}
                    className="flex-1 py-2 bg-[#10b981] text-black text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-3 h-3" /> AGAIN
                  </button>
                  <button
                    onClick={downloadReportCard}
                    className="flex-1 py-2 border border-[#10b981] text-[#10b981] text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 hover:bg-[#10b981]/10 active:scale-95 transition-all"
                  >
                    <Download className="w-3 h-3" /> SAVE
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

