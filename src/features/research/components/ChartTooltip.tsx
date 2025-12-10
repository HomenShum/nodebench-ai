import { motion, AnimatePresence } from "framer-motion";
import type { Annotation } from "@/features/research/types";

interface TooltipProps {
  active: boolean;
  data: Annotation | null;
}

export const ChartTooltip = ({ active, data }: TooltipProps) => {
  if (!data) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10, x: "-50%" }}
          animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute z-50 pointer-events-none w-64"
          style={{
            left: `${data.position.x}%`,
            top: `${data.position.y}%`,
            marginTop: "-140px",
          }}
        >
          <div className="bg-emerald-950/90 text-white p-4 rounded-lg shadow-2xl border border-emerald-500/30 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
                Intel Log
              </span>
            </div>
            <h4 className="font-serif font-bold text-sm mb-1 text-emerald-50">{data.title}</h4>
            <p className="font-mono text-[10px] leading-relaxed text-emerald-200/90">
              {data.description}
            </p>
          </div>
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-900/90 mx-auto mt-[-1px]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChartTooltip;
