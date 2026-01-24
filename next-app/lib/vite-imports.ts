/**
 * Re-exports from Vite src directory for Next.js compatibility
 * This is a workaround for Next.js's restriction on importing from parent directories
 */

// Re-export ResearchHub component
export { default as ResearchHub } from '@vite-src/features/research/views/ResearchHub';

// Re-export DocumentsHomeHub component
export { DocumentsHomeHub } from '@vite-src/features/documents/components/DocumentsHomeHub';
