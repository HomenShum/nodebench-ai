"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";

interface DeepDiveProps {
  title: string;
  content: string;
}

export const DeepDiveAccordion: React.FC<DeepDiveProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group border-l-4 border-slate-900 bg-slate-50 pl-4 py-2.5 transition-colors hover:bg-slate-100">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between pr-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-3.5 w-3.5 text-slate-600" />
          <span>{title}</span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-500"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="pr-2 pb-2 pt-3 text-sm leading-relaxed text-slate-700">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeepDiveAccordion;
