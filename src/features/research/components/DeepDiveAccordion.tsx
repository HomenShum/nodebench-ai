import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface DeepDiveProps {
  title: string;
  content: string;
}

export const DeepDiveAccordion: React.FC<DeepDiveProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-6 overflow-hidden rounded-md border-l-4 border-indigo-500 bg-stone-50">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900 font-serif hover:bg-stone-100 transition-colors"
      >
        <span>Deep Dive: {title}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 pt-0 text-sm leading-relaxed text-gray-600">{content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeepDiveAccordion;
