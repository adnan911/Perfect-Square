import { motion } from "framer-motion";

interface ScoreCardProps {
  label: string;
  value: number;
  delay?: number;
}

export function ScoreCard({ label, value, delay = 0 }: ScoreCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-secondary/50 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center backdrop-blur-sm"
    >
      <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-1">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono text-foreground">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">%</span>
      </div>
      
      {/* Mini Progress Bar */}
      <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${
            value > 90 ? "bg-accent" : value > 70 ? "bg-primary" : "bg-destructive"
          }`}
        />
      </div>
    </motion.div>
  );
}
