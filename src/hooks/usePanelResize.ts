import { useState, useRef, useCallback } from 'react';

interface UsePanelResizeOptions {
    initialSidebarWidth?: number;
    initialAgentPanelWidth?: number;
    sidebarMinWidth?: number;
    sidebarMaxWidth?: number;
    agentPanelMinWidth?: number;
    agentPanelMaxWidth?: number;
}

interface UsePanelResizeReturn {
    // Sidebar
    sidebarWidth: number;
    effectiveSidebarWidth: number;
    isSidebarCollapsed: boolean;
    toggleSidebarCollapse: () => void;
    startSidebarResizing: (e: React.MouseEvent) => void;
    // Agent Panel
    agentPanelWidth: number;
    startAgentResizing: (e: React.MouseEvent) => void;
}

/**
 * Hook to manage resizable panel widths (sidebar and agent panel).
 * Handles drag-to-resize functionality with proper cleanup.
 */
export function usePanelResize(options: UsePanelResizeOptions = {}): UsePanelResizeReturn {
    const {
        initialSidebarWidth = 256,
        initialAgentPanelWidth = 620,
        sidebarMinWidth = 200,
        sidebarMaxWidth = 500,
        agentPanelMinWidth = 300,
        agentPanelMaxWidth = 800,
    } = options;

    // Sidebar state
    const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sidebar-collapsed') === 'true';
        }
        return false;
    });
    const sidebarResizingRef = useRef(false);
    const startSidebarWidthRef = useRef(0);

    const toggleSidebarCollapse = useCallback(() => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebar-collapsed', String(next));
            return next;
        });
    }, []);

    const effectiveSidebarWidth = isSidebarCollapsed ? 56 : sidebarWidth;

    // Agent Panel state
    const [agentPanelWidth, setAgentPanelWidth] = useState(initialAgentPanelWidth);
    const agentResizingRef = useRef(false);
    const startAgentWidthRef = useRef(0);

    // Shared ref for tracking start X position
    const startXRef = useRef(0);

    // --- Sidebar Resize Handlers ---
    const resizeSidebar = useCallback((e: MouseEvent) => {
        if (!sidebarResizingRef.current) return;
        const diff = e.clientX - startXRef.current;
        const newWidth = Math.min(Math.max(startSidebarWidthRef.current + diff, sidebarMinWidth), sidebarMaxWidth);
        setSidebarWidth(newWidth);
    }, [sidebarMinWidth, sidebarMaxWidth]);

    const stopSidebarResizing = useCallback(() => {
        sidebarResizingRef.current = false;
        document.removeEventListener('mousemove', resizeSidebar);
        document.removeEventListener('mouseup', stopSidebarResizing);
    }, [resizeSidebar]);

    const startSidebarResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        sidebarResizingRef.current = true;
        startXRef.current = e.clientX;
        startSidebarWidthRef.current = sidebarWidth;
        document.addEventListener('mousemove', resizeSidebar);
        document.addEventListener('mouseup', stopSidebarResizing);
    }, [sidebarWidth, resizeSidebar, stopSidebarResizing]);

    // --- Agent Panel Resize Handlers ---
    const resizeAgent = useCallback((e: MouseEvent) => {
        if (!agentResizingRef.current) return;
        // Dragging left increases width (agent panel is on the right)
        const diff = startXRef.current - e.clientX;
        const newWidth = Math.min(Math.max(startAgentWidthRef.current + diff, agentPanelMinWidth), agentPanelMaxWidth);
        setAgentPanelWidth(newWidth);
    }, [agentPanelMinWidth, agentPanelMaxWidth]);

    const stopAgentResizing = useCallback(() => {
        agentResizingRef.current = false;
        document.removeEventListener('mousemove', resizeAgent);
        document.removeEventListener('mouseup', stopAgentResizing);
    }, [resizeAgent]);

    const startAgentResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        agentResizingRef.current = true;
        startXRef.current = e.clientX;
        startAgentWidthRef.current = agentPanelWidth;
        document.addEventListener('mousemove', resizeAgent);
        document.addEventListener('mouseup', stopAgentResizing);
    }, [agentPanelWidth, resizeAgent, stopAgentResizing]);

    return {
        sidebarWidth,
        effectiveSidebarWidth,
        isSidebarCollapsed,
        toggleSidebarCollapse,
        startSidebarResizing,
        agentPanelWidth,
        startAgentResizing,
    };
}
