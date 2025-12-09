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
    <div className="group my-8 overflow-hidden rounded-xl border border-indigo-100 bg-white/40 shadow-sm backdrop-blur-sm transition-all hover:bg-white/60 hover:shadow-md hover:border-indigo-200">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors"
      >
        <span className="flex items-center gap-3 font-serif text-lg font-medium text-gray-900">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span>Deep Dive: {title}</span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-full bg-indigo-50 p-1 text-indigo-600 group-hover:bg-indigo-100"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="border-t border-indigo-50/50 px-6 pb-6 pt-4 text-base leading-loose text-gray-600 font-serif">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeepDiveAccordion;
