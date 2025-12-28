import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { ScoreCard } from "@/components/ScoreCard";
import { analyzeDrawing, type Point, type ScoreResult } from "@/lib/game-logic";
import { useCreateScore } from "@/hooks/use-scores";
import confetti from "canvas-confetti";
import { RotateCcw, Home, Share2 } from "lucide-react";

export default function Game() {
  const [_, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  
  const createScore = useCreateScore();

  // Resize canvas to full screen
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    // Vertical lines
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw user path
    if (points.length > 0) {
      ctx.strokeStyle = result 
        ? (result.total > 80 ? "#4ade80" : "#facc15") 
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
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        });
        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const scale = Math.max(width, height) / 1.0; // Our normalization was roughly 1.0 size

        const mapPoint = (p: Point) => ({
          x: centerX + p.x * scale,
          y: centerY + p.y * scale
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
        result.debug.corners.forEach(p => {
          const pt = mapPoint(p);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      // Close loop visually if done (Legacy simple closure line)
      if (result && !result.debug) {
        ctx.beginPath();
        ctx.moveTo(points[points.length-1].x, points[points.length-1].y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [points, result]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (result) return; // Prevent drawing after result
    setIsDrawing(true);
    setPoints([]);
    const pos = getPos(e);
    setPoints([pos]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || result) return;
    const pos = getPos(e);
    setPoints((prev) => [...prev, pos]);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (points.length > 10) {
      const scoreResult = analyzeDrawing(points);
      setResult(scoreResult);
      
      // Submit score to backend
      createScore.mutate({
        score: scoreResult.total,
        metrics: scoreResult.metrics
      });

      // Celebration if good score
      if (scoreResult.total > 80) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4ade80', '#22c55e', '#ffffff']
        });
      }
    } else {
      // Too short, just reset
      setPoints([]);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const resetGame = () => {
    setPoints([]);
    setResult(null);
    setIsDrawing(false);
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
      <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <Home className="w-4 h-4 mr-2" /> Home
          </Button>
          
          <div className="text-right">
            <h2 className="text-muted-foreground text-xs font-mono uppercase tracking-widest">Target</h2>
            <p className="font-display text-xl text-primary">Perfect Square</p>
          </div>
        </div>

        {/* Instructions (Only visible when empty) */}
        {!isDrawing && points.length === 0 && !result && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
          >
            <p className="text-muted-foreground font-mono animate-pulse">
              Click & Drag to Draw
            </p>
          </motion.div>
        )}

        {/* Results Panel */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md pointer-events-auto"
            >
              <div className="bg-card/90 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mb-6"
                >
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-2">Total Score</span>
                  <div className="text-8xl font-black font-sans text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 inline-block text-glow">
                    {result.total}
                  </div>
                </motion.div>

                <p className="text-accent font-display text-2xl mb-8 -rotate-2">
                  "{result.feedback}"
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <ScoreCard label="Closure" value={result.metrics.closure} delay={0.3} />
                  <ScoreCard label="Sides" value={result.metrics.sides} delay={0.4} />
                  <ScoreCard label="Angles" value={result.metrics.angles} delay={0.5} />
                  <ScoreCard label="Straight" value={result.metrics.straightness} delay={0.6} />
                </div>

                <div className="flex gap-4 justify-center">
                  <Button onClick={resetGame} variant="primary" size="lg" className="w-full">
                    <RotateCcw className="w-5 h-5 mr-2" /> Try Again
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
