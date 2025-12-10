export interface Annotation {
  id: string;
  title: string;
  description: string;
  // Position as percentage (0-100) on the chart canvas
  position: { x: number; y: number };
}

export interface DashboardState {
  meta: {
    currentDate: string;
    timelineProgress: number; // 0.0 to 1.0
  };
  charts: {
    trendLine: {
      data: number[]; // Y-axis values
      label: string;
    };
    marketShare: Array<{ label: string; value: number; color: "black" | "gray" | "accent" }>;
  };
  techReadiness: {
    existing: number; // 0-8
    emerging: number; // 0-8
    sciFi: number; // 0-8
  };
  keyStats: Array<{
    label: string;
    value: string;
    sub?: string;
    trend?: "up" | "down" | "flat";
  }>;
  capabilities: Array<{
    label: string;
    score: number; // 0-100
    icon: string; // lucide icon name
  }>;
  annotations?: Annotation[];
}

export interface StorySection {
  sectionId: string;
  narrative: {
    title: string;
    date_display: string;
    summary: string;
    body: string; // HTML/Markdown string
  };
  dashboard_state: DashboardState;
}
