/**
 * Reusable animated components with consistent micro-interactions
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fadeVariants,
  scaleFadeVariants,
  slideUpVariants,
  slideDownVariants,
  buttonPressVariants,
  cardHoverVariants,
  staggerContainerVariants,
  staggerItemVariants,
  expandVariants,
  springs,
} from '../utils/animations';

// Animated button with press effect
interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function AnimatedButton({ children, variant = 'primary', className = '', ...props }: AnimatedButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200 focus:ring-gray-400',
    ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 focus:ring-gray-300',
  };

  return (
    <motion.button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      variants={buttonPressVariants}
      initial="idle"
      whileHover="hover"
      whileTap="tap"
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Animated card with hover lift effect
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AnimatedCard({ children, className = '', onClick }: AnimatedCardProps) {
  return (
    <motion.div
      className={`bg-white rounded-xl border border-stone-200 p-4 cursor-pointer ${className}`}
      variants={cardHoverVariants}
      initial="idle"
      whileHover="hover"
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Fade in/out wrapper
interface FadeProps {
  children: React.ReactNode;
  show?: boolean;
  className?: string;
}

export function Fade({ children, show = true, className = '' }: FadeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Scale fade for modals
interface ScaleFadeProps {
  children: React.ReactNode;
  show?: boolean;
  className?: string;
}

export function ScaleFade({ children, show = true, className = '' }: ScaleFadeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          variants={scaleFadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Slide up for toasts/notifications
interface SlideUpProps {
  children: React.ReactNode;
  show?: boolean;
  className?: string;
}

export function SlideUp({ children, show = true, className = '' }: SlideUpProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Staggered list container
interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerList({ children, className = '' }: StaggerListProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

// Staggered list item
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = '' }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}

// Collapsible section
interface CollapsibleProps {
  children: React.ReactNode;
  isOpen: boolean;
  className?: string;
}

export function Collapsible({ children, isOpen, className = '' }: CollapsibleProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={className}
          variants={expandVariants}
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

