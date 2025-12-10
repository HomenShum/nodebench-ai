import React from "react";
import { motion } from "framer-motion";
import type { Annotation } from "@/features/research/types";

interface ChartProps {
  data: number[];
  annotations?: Annotation[];
  onHover: (note: Annotation | null) => void;
}

export const InteractiveLineChart: React.FC<ChartProps> = ({ data, annotations, onHover }) => {
  if (!data?.length) {
    return <div className="w-full h-full rounded-md bg-slate-50" />;
  }
  const width = 400;
  const height = 150;
  const maxVal = Math.max(...data, 100) * 1.1;

  const points = data
    .map((val, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - (val / maxVal) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const lastPoint = {
    x: width,
    y: height - (data[data.length - 1] / maxVal) * height,
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <motion.path
        d={`M ${points.replace(/ /g, " L ")}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-800"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      <motion.circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="3"
        className="fill-slate-900"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5 }}
      />

      {annotations?.map((note) => (
        <motion.g key={note.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <circle
            cx={`${note.position.x}%`}
            cy={`${note.position.y}%`}
            r="4"
            className="fill-white stroke-emerald-600 stroke-[2px] cursor-pointer hover:stroke-emerald-400 hover:scale-125 transition-all duration-300"
          />
          <circle
            cx={`${note.position.x}%`}
            cy={`${note.position.y}%`}
            r="16"
            className="fill-transparent cursor-pointer"
            onMouseEnter={() => onHover(note)}
            onMouseLeave={() => onHover(null)}
          />
        </motion.g>
      ))}
    </svg>
  );
};

export default InteractiveLineChart;
