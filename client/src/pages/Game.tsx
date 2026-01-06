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
      // Create the main container with gradient border effect
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 280px;
        height: 400px;
        border-radius: 20px;
        overflow: hidden;
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      tempDiv.innerHTML = `
        <!-- Gradient Border Layer -->
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          padding: 3px;
          background: linear-gradient(135deg, #a855f7 0%, #f97316 50%, #a855f7 100%);
          border-radius: 20px;
          box-sizing: border-box;
        ">
          <div style="
            width: 100%;
            height: 100%;
            border-radius: 17px;
            border-top-right-radius: 100px;
            border-bottom-right-radius: 50px;
            background: #1a1a2e;
          "></div>
        </div>

        <!-- Gradient Orb with Score in Center -->
        <div style="
          position: absolute;
          width: 100%;
          height: 80%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 80px;
          border-radius: 20px;
          overflow: hidden;
        ">
          <div style="
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a855f7 0%, #fb923c 50%, #f472b6 100%);
            filter: blur(1px);
            opacity: 0.9;
            display: flex;
            align-items: center;
            justify-content: center;
          "></div>
        </div>

        <!-- Score in Center of Orb -->
        <div style="
          position: absolute;
          width: 100%;
          height: 80%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        ">
          <div style="
            font-size: 100px;
            font-weight: 400;
            font-family: 'Luckiest Guy', cursive;
            color: #fffefeff;
            line-height: 1;
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.4);
          ">${result.total}</div>
        </div>

        <!-- Content Overlay -->
        <div style="
          position: absolute;
          inset: 0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
        ">
          <!-- Top Section - Feedback -->
          <div style="
            padding: 12px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: auto;
          ">
            <div style="
              font-size: 18px;
              color: rgba(255, 255, 255, 0.7);
              font-style: normal;
              font-family: 'Gochi Hand', cursive;
              line-height: 1.2;
              text-align: center;
            ">"${result.feedback}"</div>
          </div>
          
          <!-- Bottom Section - Metrics -->
          <div style="
            padding: 10px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          ">
            <!-- Metrics Grid -->
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
            ">
              <div style="
                background: rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 6px 6px 4px;
                text-align: center;
              ">
                <div style="font-size: 7px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0; line-height: 1;">Closure</div>
                <div style="font-size: 20px; font-weight: 600; color: #4ade80; line-height: 1;">${result.metrics.closure}</div>
              </div>
              <div style="
                background: rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 6px 6px 4px;
                text-align: center;
              ">
                <div style="font-size: 7px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0; line-height: 1;">Sides</div>
                <div style="font-size: 20px; font-weight: 600; color: #4ade80; line-height: 1;">${result.metrics.sides}</div>
              </div>
              <div style="
                background: rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 6px 6px 4px;
                text-align: center;
              ">
                <div style="font-size: 7px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0; line-height: 1;">Angles</div>
                <div style="font-size: 20px; font-weight: 600; color: #4ade80; line-height: 1;">${result.metrics.angles}</div>
              </div>
              <div style="
                background: rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 6px 6px 4px;
                text-align: center;
              ">
                <div style="font-size: 7px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0; line-height: 1;">Straight</div>
                <div style="font-size: 20px; font-weight: 600; color: #4ade80; line-height: 1;">${result.metrics.straightness}</div>
              </div>
            </div>
          </div>

          <!-- Perfect Square Branding - Lower Right -->
          <div style="
            position: absolute;
            bottom: 12px;
            right: 14px;
            text-align: right;
            color: rgba(255, 255, 255, 0.5);
            font-size: 9px;
            line-height: 1.2;
          ">
            <div>Perfect</div>
            <div>Square</div>
          </div>
        </div>
      `;

      document.body.appendChild(tempDiv);

      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 150));

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
      <div className="absolute inset-0 z-20 pointer-events-none p-3 sm:p-6 flex flex-col justify-between safe-area-inset">
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="min-h-[44px]">
            <Home className="w-4 h-4 sm:mr-2" />
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

        {/* Results Panel - Cyber Card */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            >
              <div className="cyber-container noselect">
                <div className="cyber-card">
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

                    {/* Buttons */}
                    <div className="cyber-buttons">
                      <button className="cyber-button cyber-button-primary" onClick={resetGame}>
                        <RotateCcw className="w-4 h-4" /> Again
                      </button>
                      <button className="cyber-button cyber-button-secondary" onClick={downloadReportCard}>
                        <Download className="w-4 h-4" /> Save
                      </button>
                    </div>

                    {/* Decorative Elements */}
                    <div className="cyber-glowing-elements">
                      <div className="cyber-glow-1"></div>
                      <div className="cyber-glow-2"></div>
                      <div className="cyber-glow-3"></div>
                    </div>
                    <div className="cyber-card-particles">
                      <span></span><span></span><span></span>
                      <span></span><span></span><span></span>
                    </div>
                    <div className="cyber-corner-elements">
                      <span></span><span></span><span></span><span></span>
                    </div>
                    <div className="cyber-scan-line"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

