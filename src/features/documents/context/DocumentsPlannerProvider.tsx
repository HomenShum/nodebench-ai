/**
 * DocumentsPlannerProvider
 *
 * Wraps only the 4 planner-related context slices (DateNav, Agenda, View,
 * Editor). Owns the planner runtime — calls usePlannerState() and
 * usePlannerController() internally, then projects their outputs into the
 * existing context slices so downstream consumers (DocumentsPlannerOverlays,
 * DocumentSidebarPanel) work unchanged.
 */

import { useMemo, type ReactNode } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { usePlannerState } from "@/hooks/usePlannerState";
import { usePlannerController } from "../hooks/usePlannerController";
import {
  PlannerDateNavCtx,
  PlannerAgendaCtx,
  PlannerViewCtx,
  PlannerEditorCtx,
} from "./DocumentsWorkspaceContext";

export interface DocumentsPlannerProviderProps {
  prefs: any;
  loggedInUser: unknown;
  selectedTaskId?: Id<"tasks"> | null;
  onSelectTask?: (
    id: Id<"tasks">,
    source: "today" | "upcoming" | "week" | "other",
  ) => void;
  onClearTaskSelection?: () => void;
  children: ReactNode;
}

export function DocumentsPlannerProvider({
  prefs,
  loggedInUser,
  selectedTaskId,
  onSelectTask,
  onClearTaskSelection,
  children,
}: DocumentsPlannerProviderProps) {
  const { upcoming } = usePlannerState();

  const planner = usePlannerController({
    prefs,
    loggedInUser,
    tasks: {
      today: upcoming.today.tasks,
      thisWeek: upcoming.sevenDays.tasks,
    },
    events: {
      today: upcoming.today.events,
      thisWeek: upcoming.sevenDays.events,
    },
    holidays: {
      today: upcoming.today.holidays,
      thisWeek: upcoming.sevenDays.holidays,
    },
    selectedTaskId,
    onSelectTask,
    onClearTaskSelection,
  });

  const { agendaState, editorState, viewState } = planner;

  // ── Slice projections ───────────────────────────────────────────────────────

  const plannerDateNavSlice = useMemo(() => ({
    agendaSelectedDateMs: agendaState.focusedDateMs ?? Date.now(),
    setAgendaSelectedDateMs: agendaState.setFocusedDateMs ?? (() => {}),
    showWeekInAgenda: agendaState.showWeekInAgenda ?? false,
    setShowWeekInAgenda: agendaState.setShowWeekInAgenda ?? (() => {}),
    tzOffsetMinutes: (agendaState.offsetMs ?? 0) / 60000,
    weekRangeLabel: agendaState.weekRangeLabel ?? "",
    agendaDayLabel: agendaState.agendaDayLabel ?? "",
    agendaRangeLabel: agendaState.agendaRangeLabel ?? "",
    goToPrevWeek: agendaState.goToPrevWeek ?? (() => {}),
    goToNextWeek: agendaState.goToNextWeek ?? (() => {}),
    goToToday: agendaState.goToToday ?? (() => {}),
    changeAgendaByDays: agendaState.changeAgendaByDays ?? (() => {}),
  }), [agendaState]);

  const plannerAgendaSlice = useMemo(() => ({
    agendaMode: agendaState.agendaMode ?? "day",
    setAgendaMode: agendaState.setAgendaMode ?? (() => {}),
    agendaScope: agendaState.agendaScope ?? "all",
    setAgendaScope: agendaState.setAgendaScope ?? (() => {}),
    weekEventsMerged: agendaState.weekEventsMerged ?? [],
    weekTasksMerged: agendaState.weekTasksMerged ?? [],
    weekHolidaysMerged: agendaState.weekHolidaysMerged ?? [],
  }), [agendaState]);

  const plannerViewSlice = useMemo(() => ({
    mode: viewState.mode ?? "planner",
    setMode: viewState.setMode ?? (() => {}),
    density: viewState.density ?? "comfortable",
    setDensity: viewState.setDensity ?? (() => {}),
    kanbanOrientation: viewState.kanbanOrientation ?? "vertical",
    setKanbanOrientation: viewState.setKanbanOrientation ?? (() => {}),
    viewMenuOpen: viewState.viewMenuOpen ?? false,
    setViewMenuOpen: viewState.setViewMenuOpen ?? (() => {}),
    upcomingMode: viewState.upcomingMode ?? "today",
    setUpcomingMode: viewState.setUpcomingMode ?? (() => {}),
  }), [viewState]);

  const plannerEditorSlice = useMemo(() => ({
    miniEditorAnchor: editorState.miniEditorAnchor,
    setMiniEditorAnchor: editorState.setMiniEditorAnchor,
    selectedEventId: editorState.selectedEventId ?? null,
    setSelectedEventId: editorState.setSelectedEventId ?? (() => {}),
    quickAgendaText: editorState.quickAgendaText ?? "",
    setQuickAgendaText: editorState.setQuickAgendaText ?? (() => {}),
    agendaPopover: editorState.agendaPopover ?? null,
    setAgendaPopover: editorState.setAgendaPopover ?? (() => {}),
    inlineCreate: editorState.inlineCreate ?? null,
    setInlineCreate: editorState.setInlineCreate ?? (() => {}),
    eventEditorInline: editorState.eventEditorInline ?? null,
    setEventEditorInline: editorState.setEventEditorInline ?? (() => {}),
    handleSubmitNewTask: editorState.handleSubmitNewTask ?? (() => {}),
    handleModalKeyDown: editorState.handleModalKeyDown ?? (() => {}),
    handleViewDayLocal: viewState.handleViewDayLocal ?? (() => {}),
    handleViewWeekLocal: viewState.handleViewWeekLocal ?? (() => {}),
    showNewTaskModal: editorState.showNewTaskModal ?? false,
    setShowNewTaskModal: editorState.setShowNewTaskModal ?? (() => {}),
    newTaskModalTitle: editorState.newTaskModalTitle ?? "",
    setNewTaskModalTitle: editorState.setNewTaskModalTitle ?? (() => {}),
    newTaskModalDue: editorState.newTaskModalDue ?? "",
    setNewTaskModalDue: editorState.setNewTaskModalDue ?? (() => {}),
    newTaskModalPriority: editorState.newTaskModalPriority ?? "",
    setNewTaskModalPriority: editorState.setNewTaskModalPriority ?? (() => {}),
    newTaskModalDescription: editorState.newTaskModalDescription ?? "",
    setNewTaskModalDescription: editorState.setNewTaskModalDescription ?? (() => {}),
    isSubmittingTask: editorState.isSubmittingTask ?? false,
    newTaskTitleRef: editorState.newTaskTitleRef,
    modalRef: editorState.modalRef,
  }), [editorState, viewState.handleViewDayLocal, viewState.handleViewWeekLocal]);

  return (
    <PlannerDateNavCtx.Provider value={plannerDateNavSlice}>
      <PlannerAgendaCtx.Provider value={plannerAgendaSlice}>
        <PlannerViewCtx.Provider value={plannerViewSlice}>
          <PlannerEditorCtx.Provider value={plannerEditorSlice}>
            {children}
          </PlannerEditorCtx.Provider>
        </PlannerViewCtx.Provider>
      </PlannerAgendaCtx.Provider>
    </PlannerDateNavCtx.Provider>
  );
}
