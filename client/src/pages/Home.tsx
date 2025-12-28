import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import { Play, Trophy } from "lucide-react";
import { useScores } from "@/hooks/use-scores";

export default function Home() {
  const [_, setLocation] = useLocation();
  const { data: scores } = useScores();

  // Find best score locally or from recent fetches for display (simple MVP)
  const bestScore = scores?.reduce((max, s) => Math.max(max, s.score), 0) || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-white/5 rounded-3xl -rotate-12" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 border border-primary/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center z-10 max-w-2xl w-full"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8"
        >
          <div className="inline-block border-2 border-primary w-24 h-24 mb-6 rotate-3 shadow-[0_0_30px_rgba(16,185,129,0.2)]" />
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-4 leading-tight">
            Draw the<br />
            <span className="text-primary text-glow">Perfect Square</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-mono max-w-md mx-auto">
            Test your geometric precision. No tools. Just your finger.
          </p>
        </motion.div>

        <div className="flex flex-col items-center gap-6">
          <Button 
            onClick={() => setLocation("/game")} 
            size="lg" 
            className="w-full md:w-auto min-w-[200px] text-lg h-16 shadow-2xl"
          >
            <Play className="w-5 h-5 mr-3 fill-current" /> Start Drawing
          </Button>

          {bestScore > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-3 bg-secondary/50 px-6 py-3 rounded-full border border-white/5 backdrop-blur-md"
            >
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-sm font-mono text-muted-foreground">
                Personal Best: <span className="text-foreground font-bold">{bestScore}%</span>
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>
      
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground/30 font-mono">
          v1.0 • PRECISION ENGINE ACTIVE
        </p>
      </div>
    </div>
  );
}
