const fs = require('fs');

const files = [
  'src/features/documents/components/documentsHub/utils/__tests__/statusHelpers.test.ts',
  'src/features/documents/components/documentsHub/utils/constants.ts',
  'src/features/documents/components/documentsHub/utils/statusHelpers.ts',
  'src/index.css',
  'src/lib/documentThemes.ts',
  'src/components/CostDashboard.tsx',
  'src/components/HashtagQuickNotePopover.tsx',
  'src/components/IndustryUpdatesPanel.tsx',
  'src/components/MiniNoteAgentChat.tsx',
  'src/components/sidebar/footer/TrashButton.tsx',
  'src/components/sidebar/modals/MoveFolderModal.tsx',
  'src/components/sidebar/modals/ShareModal.tsx',
  'src/components/sidebar/modals/TagPickerModal.tsx',
  'src/components/unified/UnifiedRow.tsx',
  'src/features/admin/views/FeedbackDashboard.tsx',
  'src/features/agents/components/AgentCommandBar.tsx',
  'src/features/agents/components/AgentSidebar.tsx',
  'src/features/agents/components/AgentStatusCard.tsx',
  'src/features/agents/components/FastAgentPanel/ArbitrageReportCard.tsx',
  'src/features/agents/components/FastAgentPanel/CollapsibleAgentProgress.tsx',
  'src/features/agents/components/FastAgentPanel/ConfirmationDialog.tsx',
  'src/features/agents/components/FastAgentPanel/ContextBar.tsx',
  'src/features/agents/components/FastAgentPanel/EditProgressCard.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.AgentTasksTab.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.ArtifactCard.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.BriefTab.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.DecisionTreeKanban.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.DeepAgentProgress.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.DisclosureTrace.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.EditsTab.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.FileUpload.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.InputBar.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.LiveThinking.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.MessageBubble.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.MessageStream.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.ParallelTaskTimeline.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.Settings.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.SkillsPanel.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.TasksTab.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.ThreadList.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.TraceAuditPanel.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx',
  'src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx',
  'src/features/agents/components/FastAgentPanel/HumanRequestCard.tsx',
  'src/features/agents/components/FastAgentPanel/LiveEventCard.tsx',
  'src/features/agents/components/FastAgentPanel/LiveEventsPanel.tsx',
  'src/features/agents/components/FastAgentPanel/MemoryPill.tsx',
  'src/features/agents/components/FastAgentPanel/MemoryStatusHeader.tsx',
  'src/features/agents/components/FastAgentPanel/MermaidDiagram.tsx',
  'src/features/agents/components/FastAgentPanel/ResourceLinkCard.tsx',
  'src/features/agents/components/FastAgentPanel/SourceCard.tsx',
  'src/features/agents/components/FastAgentPanel/StepTimeline.tsx',
  'src/features/agents/components/FastAgentPanel/StepTimelineItem.tsx',
  'src/features/agents/components/FastAgentPanel/SwarmLanesView.tsx',
  'src/features/agents/components/FastAgentPanel/SwarmQuickActions.tsx',
  'src/features/agents/components/FastAgentPanel/ThreadTabBar.tsx',
  'src/features/agents/components/FastAgentPanel/ToolCallTransparency.tsx',
  'src/features/agents/components/FastAgentPanel/ToolResultPopover.tsx',
  'src/features/agents/components/FastAgentPanel/TypingIndicator.tsx',
  'src/features/agents/components/FreeModelRankingsPanel.tsx',
  'src/features/agents/components/HumanApprovalQueue.tsx',
  'src/features/agents/components/TaskManager/TaskManagerView.tsx',
  'src/features/agents/components/TaskManager/TaskSessionCard.tsx',
  'src/features/agents/components/TaskManager/TaskSessionDetail.tsx',
  'src/features/agents/components/TaskManager/TelemetrySpanTree.tsx',
  'src/features/agents/views/LiveAgentLanes.tsx',
  'src/features/agents/views/TaskPlanPanel.tsx',
  'src/features/agents/views/WorkflowMetricsBar.tsx',
  'src/features/calendar/components/CalendarDatePopover.tsx',
  'src/features/calendar/components/EventEditorPanel.tsx',
  'src/features/calendar/components/TaskEditorPanel.tsx',
  'src/features/calendar/components/agenda/AgendaEditorPopover.tsx',
  'src/features/calendar/components/agenda/InlineEventEditor.tsx',
  'src/features/calendar/components/agenda/InlineTaskEditor.tsx',
  'src/features/calendar/views/CalendarView.tsx',
  'src/features/documents/components/CodeViewer.tsx',
  'src/features/documents/components/DocumentGrid.tsx',
  'src/features/documents/components/DocumentHeader.tsx',
  'src/features/documents/components/DocumentRecommendations.tsx',
  'src/features/documents/components/RichPreviews.tsx',
  'src/features/documents/components/documentsHub/DocumentsSidebar.tsx',
  'src/features/documents/components/documentsHub/cards/DocumentCard.tsx',
  'src/features/documents/components/documentsHub/rows/HolidayRow.tsx',
  'src/features/documents/components/documentsHub/rows/TaskRow.tsx',
  'src/features/documents/components/documentsHub/views/IntelligenceTable.tsx',
  'src/features/documents/editors/DocumentMiniEditor.tsx',
  'src/features/documents/editors/DossierMiniEditor.tsx',
  'src/features/documents/editors/DualCreateMiniPanel.tsx',
  'src/features/documents/editors/DualEditMiniPanel.tsx',
  'src/features/documents/editors/SpreadsheetMiniEditor.tsx',
  'src/features/documents/views/DocumentView.tsx',
  'src/features/documents/views/FileViewer.tsx',
  'src/features/documents/views/SpreadsheetView.tsx',
  'src/features/editor/components/UnifiedEditor.tsx',
  'src/features/editor/components/UnifiedEditor/ProposalInlineDecorations.tsx',
  'src/features/monitoring/components/PRSuggestions.tsx',
  'src/features/onboarding/views/TutorialPage.tsx',
  'src/features/proactive/components/onboarding/ConsentStep.tsx',
  'src/features/proactive/components/onboarding/FeaturesStep.tsx',
  'src/features/proactive/components/onboarding/PreferencesStep.tsx',
  'src/features/proactive/components/onboarding/SuccessStep.tsx',
  'src/features/proactive/components/onboarding/WelcomeStep.tsx',
  'src/features/proactive/views/CustomDetectorBuilder.tsx',
  'src/features/proactive/views/ProactiveFeed.tsx',
  'src/features/proactive/views/ProactiveOnboarding.tsx',
  'src/features/research/components/GitHubExplorer.tsx',
  'src/features/research/components/dossier/DossierMediaGallery.tsx',
  'src/features/research/views/DossierViewer.tsx',
  'src/features/spreadsheets/views/SpreadsheetSheetView.tsx',
  'src/lib/buttonClasses.ts',
  'src/shared/editors/PopoverMiniDocEditor.tsx',
  'src/shared/ui/SidebarUpcoming.tsx',
  'src/shared/ui/UnifiedHubPills.tsx',
  'src/components/EnhancedTimelineStrip.tsx',
  'src/features/admin/FundingDataReview.tsx',
  'src/features/analytics/views/HITLAnalyticsDashboard.tsx',
  'src/features/analytics/views/RecommendationAnalyticsDashboard.tsx',
  'src/features/emailIntelligence/components/ScrollytellingLayout.tsx',
  'src/features/research/components/TimelineStrip.tsx',
  'src/features/research/views/PhaseAllShowcase.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) {
    return;
  }
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  // Replace CSS vars with Tailwind classes
  content = content.replace(/bg-\[var\(--bg-primary\)\]/g, 'bg-surface');
  content = content.replace(/bg-\[var\(--bg-secondary\)\]/g, 'bg-surface-secondary');
  content = content.replace(/bg-\[var\(--bg-hover\)\]/g, 'bg-surface-hover');
  content = content.replace(/border-\[var\(--border-color\)\]/g, 'border-edge');
  content = content.replace(/text-\[var\(--text-primary\)\]/g, 'text-content');
  content = content.replace(/text-\[var\(--text-secondary\)\]/g, 'text-content-secondary');
  content = content.replace(/text-\[var\(--text-muted\)\]/g, 'text-content-muted');
  content = content.replace(/text-\[var\(--accent-primary\)\]/g, 'text-indigo-600 dark:text-indigo-400');
  content = content.replace(/border-\[var\(--accent-primary\)\]/g, 'border-indigo-500\/30');
  content = content.replace(/from-\[var\(--accent-primary-bg\)\]/g, 'from-indigo-500\/10');
  
  // Replace container widths
  content = content.replace(/max-w-7xl/g, 'max-w-6xl');
  content = content.replace(/p-8/g, 'p-6');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
  }
});
