/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_coordinatorWorkflowActions from "../actions/coordinatorWorkflowActions.js";
import type * as actions_externalOrchestrator from "../actions/externalOrchestrator.js";
import type * as actions_openbbActions from "../actions/openbbActions.js";
import type * as actions_parallelDelegation from "../actions/parallelDelegation.js";
import type * as actions_researchMcpActions from "../actions/researchMcpActions.js";
import type * as actions_spreadsheetActions from "../actions/spreadsheetActions.js";
import type * as agentsPrefs from "../agentsPrefs.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as crons_dailyDossierCron from "../crons/dailyDossierCron.js";
import type * as crons_emailIntelligenceCron from "../crons/emailIntelligenceCron.js";
import type * as domains_agents_adapters_anthropic_anthropicReasoningAdapter from "../domains/agents/adapters/anthropic/anthropicReasoningAdapter.js";
import type * as domains_agents_adapters_convex_convexAgentAdapter from "../domains/agents/adapters/convex/convexAgentAdapter.js";
import type * as domains_agents_adapters_handoffBridge from "../domains/agents/adapters/handoffBridge.js";
import type * as domains_agents_adapters_index from "../domains/agents/adapters/index.js";
import type * as domains_agents_adapters_langgraph_langgraphAdapter from "../domains/agents/adapters/langgraph/langgraphAdapter.js";
import type * as domains_agents_adapters_multiSdkDelegation from "../domains/agents/adapters/multiSdkDelegation.js";
import type * as domains_agents_adapters_openai_openaiAgentsAdapter from "../domains/agents/adapters/openai/openaiAgentsAdapter.js";
import type * as domains_agents_adapters_registerDefaultAdapters from "../domains/agents/adapters/registerDefaultAdapters.js";
import type * as domains_agents_adapters_registry from "../domains/agents/adapters/registry.js";
import type * as domains_agents_adapters_routing_personaRouter from "../domains/agents/adapters/routing/personaRouter.js";
import type * as domains_agents_adapters_types from "../domains/agents/adapters/types.js";
import type * as domains_agents_adapters_vercel_vercelAiSdkAdapter from "../domains/agents/adapters/vercel/vercelAiSdkAdapter.js";
import type * as domains_agents_agentChat from "../domains/agents/agentChat.js";
import type * as domains_agents_agentChatActions from "../domains/agents/agentChatActions.js";
import type * as domains_agents_agentDelegations from "../domains/agents/agentDelegations.js";
import type * as domains_agents_agentInitializer from "../domains/agents/agentInitializer.js";
import type * as domains_agents_agentMemory from "../domains/agents/agentMemory.js";
import type * as domains_agents_agentPlanning from "../domains/agents/agentPlanning.js";
import type * as domains_agents_agentRouter from "../domains/agents/agentRouter.js";
import type * as domains_agents_agentScratchpads from "../domains/agents/agentScratchpads.js";
import type * as domains_agents_agentTimelines from "../domains/agents/agentTimelines.js";
import type * as domains_agents_arbitrage_agent from "../domains/agents/arbitrage/agent.js";
import type * as domains_agents_arbitrage_config from "../domains/agents/arbitrage/config.js";
import type * as domains_agents_arbitrage_index from "../domains/agents/arbitrage/index.js";
import type * as domains_agents_arbitrage_tools_contradictionDetection from "../domains/agents/arbitrage/tools/contradictionDetection.js";
import type * as domains_agents_arbitrage_tools_deltaDetection from "../domains/agents/arbitrage/tools/deltaDetection.js";
import type * as domains_agents_arbitrage_tools_index from "../domains/agents/arbitrage/tools/index.js";
import type * as domains_agents_arbitrage_tools_sourceHealthCheck from "../domains/agents/arbitrage/tools/sourceHealthCheck.js";
import type * as domains_agents_arbitrage_tools_sourceQualityRanking from "../domains/agents/arbitrage/tools/sourceQualityRanking.js";
import type * as domains_agents_chatThreads from "../domains/agents/chatThreads.js";
import type * as domains_agents_coordinator_agent from "../domains/agents/coordinator/agent.js";
import type * as domains_agents_coordinator_config from "../domains/agents/coordinator/config.js";
import type * as domains_agents_coordinator_contextPack from "../domains/agents/coordinator/contextPack.js";
import type * as domains_agents_coordinator_contextPackMutations from "../domains/agents/coordinator/contextPackMutations.js";
import type * as domains_agents_coordinator_contextPackQueries from "../domains/agents/coordinator/contextPackQueries.js";
import type * as domains_agents_coordinator_index from "../domains/agents/coordinator/index.js";
import type * as domains_agents_coordinator_tools_delegationTools from "../domains/agents/coordinator/tools/delegationTools.js";
import type * as domains_agents_coordinator_tools_index from "../domains/agents/coordinator/tools/index.js";
import type * as domains_agents_core_coordinatorAgent from "../domains/agents/core/coordinatorAgent.js";
import type * as domains_agents_core_delegation_delegationHelpers from "../domains/agents/core/delegation/delegationHelpers.js";
import type * as domains_agents_core_delegation_delegationTools from "../domains/agents/core/delegation/delegationTools.js";
import type * as domains_agents_core_delegation_temporalContext from "../domains/agents/core/delegation/temporalContext.js";
import type * as domains_agents_core_multiAgentWorkflow from "../domains/agents/core/multiAgentWorkflow.js";
import type * as domains_agents_core_prompts from "../domains/agents/core/prompts.js";
import type * as domains_agents_core_subagents_document_subagent_documentAgent from "../domains/agents/core/subagents/document_subagent/documentAgent.js";
import type * as domains_agents_core_subagents_document_subagent_documentAgentWithMetaTools from "../domains/agents/core/subagents/document_subagent/documentAgentWithMetaTools.js";
import type * as domains_agents_core_subagents_document_subagent_tools_deepAgentEditTools from "../domains/agents/core/subagents/document_subagent/tools/deepAgentEditTools.js";
import type * as domains_agents_core_subagents_document_subagent_tools_documentTools from "../domains/agents/core/subagents/document_subagent/tools/documentTools.js";
import type * as domains_agents_core_subagents_document_subagent_tools_geminiFileSearch from "../domains/agents/core/subagents/document_subagent/tools/geminiFileSearch.js";
import type * as domains_agents_core_subagents_document_subagent_tools_hashtagSearchTools from "../domains/agents/core/subagents/document_subagent/tools/hashtagSearchTools.js";
import type * as domains_agents_core_subagents_document_subagent_tools_index from "../domains/agents/core/subagents/document_subagent/tools/index.js";
import type * as domains_agents_core_subagents_dossier_subagent_dossierAgent from "../domains/agents/core/subagents/dossier_subagent/dossierAgent.js";
import type * as domains_agents_core_subagents_dossier_subagent_tools_enrichDataPoint from "../domains/agents/core/subagents/dossier_subagent/tools/enrichDataPoint.js";
import type * as domains_agents_core_subagents_dossier_subagent_tools_generateAnnotation from "../domains/agents/core/subagents/dossier_subagent/tools/generateAnnotation.js";
import type * as domains_agents_core_subagents_dossier_subagent_tools_getChartContext from "../domains/agents/core/subagents/dossier_subagent/tools/getChartContext.js";
import type * as domains_agents_core_subagents_dossier_subagent_tools_index from "../domains/agents/core/subagents/dossier_subagent/tools/index.js";
import type * as domains_agents_core_subagents_dossier_subagent_tools_updateFocusState from "../domains/agents/core/subagents/dossier_subagent/tools/updateFocusState.js";
import type * as domains_agents_core_subagents_dossier_subagent_tools_updateNarrativeSection from "../domains/agents/core/subagents/dossier_subagent/tools/updateNarrativeSection.js";
import type * as domains_agents_core_subagents_entity_subagent_entityResearchAgent from "../domains/agents/core/subagents/entity_subagent/entityResearchAgent.js";
import type * as domains_agents_core_subagents_media_subagent_mediaAgent from "../domains/agents/core/subagents/media_subagent/mediaAgent.js";
import type * as domains_agents_core_subagents_media_subagent_tools_index from "../domains/agents/core/subagents/media_subagent/tools/index.js";
import type * as domains_agents_core_subagents_media_subagent_tools_linkupSearch from "../domains/agents/core/subagents/media_subagent/tools/linkupSearch.js";
import type * as domains_agents_core_subagents_media_subagent_tools_mediaTools from "../domains/agents/core/subagents/media_subagent/tools/mediaTools.js";
import type * as domains_agents_core_subagents_media_subagent_tools_youtubeSearch from "../domains/agents/core/subagents/media_subagent/tools/youtubeSearch.js";
import type * as domains_agents_core_subagents_openbb_subagent_openbbAgent from "../domains/agents/core/subagents/openbb_subagent/openbbAgent.js";
import type * as domains_agents_core_subagents_openbb_subagent_tools_adminTools from "../domains/agents/core/subagents/openbb_subagent/tools/adminTools.js";
import type * as domains_agents_core_subagents_openbb_subagent_tools_cryptoTools from "../domains/agents/core/subagents/openbb_subagent/tools/cryptoTools.js";
import type * as domains_agents_core_subagents_openbb_subagent_tools_economyTools from "../domains/agents/core/subagents/openbb_subagent/tools/economyTools.js";
import type * as domains_agents_core_subagents_openbb_subagent_tools_equityTools from "../domains/agents/core/subagents/openbb_subagent/tools/equityTools.js";
import type * as domains_agents_core_subagents_openbb_subagent_tools_index from "../domains/agents/core/subagents/openbb_subagent/tools/index.js";
import type * as domains_agents_core_subagents_openbb_subagent_tools_newsTools from "../domains/agents/core/subagents/openbb_subagent/tools/newsTools.js";
import type * as domains_agents_core_subagents_research_subagent_multiSourceResearchAgent from "../domains/agents/core/subagents/research_subagent/multiSourceResearchAgent.js";
import type * as domains_agents_core_subagents_sec_subagent_secAgent from "../domains/agents/core/subagents/sec_subagent/secAgent.js";
import type * as domains_agents_core_subagents_sec_subagent_tools_index from "../domains/agents/core/subagents/sec_subagent/tools/index.js";
import type * as domains_agents_core_subagents_sec_subagent_tools_secCompanySearch from "../domains/agents/core/subagents/sec_subagent/tools/secCompanySearch.js";
import type * as domains_agents_core_subagents_sec_subagent_tools_secFilingTools from "../domains/agents/core/subagents/sec_subagent/tools/secFilingTools.js";
import type * as domains_agents_core_tools_externalOrchestratorTools from "../domains/agents/core/tools/externalOrchestratorTools.js";
import type * as domains_agents_dataAccess_agent from "../domains/agents/dataAccess/agent.js";
import type * as domains_agents_dataAccess_config from "../domains/agents/dataAccess/config.js";
import type * as domains_agents_dataAccess_index from "../domains/agents/dataAccess/index.js";
import type * as domains_agents_dataAccess_tools_calendarTools from "../domains/agents/dataAccess/tools/calendarTools.js";
import type * as domains_agents_dataAccess_tools_index from "../domains/agents/dataAccess/tools/index.js";
import type * as domains_agents_dataAccess_tools_taskTools from "../domains/agents/dataAccess/tools/taskTools.js";
import type * as domains_agents_digestAgent from "../domains/agents/digestAgent.js";
import type * as domains_agents_fastAgentChat from "../domains/agents/fastAgentChat.js";
import type * as domains_agents_fastAgentChatHelpers from "../domains/agents/fastAgentChatHelpers.js";
import type * as domains_agents_fastAgentDocumentCreation from "../domains/agents/fastAgentDocumentCreation.js";
import type * as domains_agents_fastAgentPanelStreaming from "../domains/agents/fastAgentPanelStreaming.js";
import type * as domains_agents_hitl_config from "../domains/agents/hitl/config.js";
import type * as domains_agents_hitl_index from "../domains/agents/hitl/index.js";
import type * as domains_agents_hitl_interruptManager from "../domains/agents/hitl/interruptManager.js";
import type * as domains_agents_hitl_tools_askHuman from "../domains/agents/hitl/tools/askHuman.js";
import type * as domains_agents_hitl_tools_index from "../domains/agents/hitl/tools/index.js";
import type * as domains_agents_humanInTheLoop from "../domains/agents/humanInTheLoop.js";
import type * as domains_agents_index from "../domains/agents/index.js";
import type * as domains_agents_mcp_tools_context_contextInitializerTool from "../domains/agents/mcp_tools/context/contextInitializerTool.js";
import type * as domains_agents_mcp_tools_context_index from "../domains/agents/mcp_tools/context/index.js";
import type * as domains_agents_mcp_tools_index from "../domains/agents/mcp_tools/index.js";
import type * as domains_agents_mcp_tools_models_healthcheck from "../domains/agents/mcp_tools/models/healthcheck.js";
import type * as domains_agents_mcp_tools_models_index from "../domains/agents/mcp_tools/models/index.js";
import type * as domains_agents_mcp_tools_models_migration from "../domains/agents/mcp_tools/models/migration.js";
import type * as domains_agents_mcp_tools_models_modelResolver from "../domains/agents/mcp_tools/models/modelResolver.js";
import type * as domains_agents_mcp_tools_tracking_index from "../domains/agents/mcp_tools/tracking/index.js";
import type * as domains_agents_mcp_tools_tracking_taskTrackerTool from "../domains/agents/mcp_tools/tracking/taskTrackerTool.js";
import type * as domains_agents_orchestrator_geminiVideoWrapper from "../domains/agents/orchestrator/geminiVideoWrapper.js";
import type * as domains_agents_orchestrator_queueProtocol from "../domains/agents/orchestrator/queueProtocol.js";
import type * as domains_agents_orchestrator_secEdgarWrapper from "../domains/agents/orchestrator/secEdgarWrapper.js";
import type * as domains_agents_orchestrator_toolHealth from "../domains/agents/orchestrator/toolHealth.js";
import type * as domains_agents_orchestrator_toolRouter from "../domains/agents/orchestrator/toolRouter.js";
import type * as domains_agents_orchestrator_worker from "../domains/agents/orchestrator/worker.js";
import type * as domains_agents_parallelTaskOrchestrator from "../domains/agents/parallelTaskOrchestrator.js";
import type * as domains_agents_parallelTaskTree from "../domains/agents/parallelTaskTree.js";
import type * as domains_agents_researchJobs from "../domains/agents/researchJobs.js";
import type * as domains_agents_types from "../domains/agents/types.js";
import type * as domains_ai_ai from "../domains/ai/ai.js";
import type * as domains_ai_genai from "../domains/ai/genai.js";
import type * as domains_ai_metadataAnalyzer from "../domains/ai/metadataAnalyzer.js";
import type * as domains_ai_morningDigest from "../domains/ai/morningDigest.js";
import type * as domains_ai_morningDigestQueries from "../domains/ai/morningDigestQueries.js";
import type * as domains_analytics_analytics from "../domains/analytics/analytics.js";
import type * as domains_analytics_ossStats from "../domains/analytics/ossStats.js";
import type * as domains_artifacts_sourceArtifacts from "../domains/artifacts/sourceArtifacts.js";
import type * as domains_auth_account from "../domains/auth/account.js";
import type * as domains_auth_apiKeys from "../domains/auth/apiKeys.js";
import type * as domains_auth_apiKeysActions from "../domains/auth/apiKeysActions.js";
import type * as domains_auth_auth from "../domains/auth/auth.js";
import type * as domains_auth_index from "../domains/auth/index.js";
import type * as domains_auth_onboarding from "../domains/auth/onboarding.js";
import type * as domains_auth_presence from "../domains/auth/presence.js";
import type * as domains_auth_usage from "../domains/auth/usage.js";
import type * as domains_auth_userPreferences from "../domains/auth/userPreferences.js";
import type * as domains_auth_userStats from "../domains/auth/userStats.js";
import type * as domains_auth_users from "../domains/auth/users.js";
import type * as domains_billing_apiUsageTracking from "../domains/billing/apiUsageTracking.js";
import type * as domains_billing_billing from "../domains/billing/billing.js";
import type * as domains_billing_index from "../domains/billing/index.js";
import type * as domains_billing_rateLimiting from "../domains/billing/rateLimiting.js";
import type * as domains_calendar_calendar from "../domains/calendar/calendar.js";
import type * as domains_calendar_events from "../domains/calendar/events.js";
import type * as domains_calendar_holidays from "../domains/calendar/holidays.js";
import type * as domains_calendar_holidaysActions from "../domains/calendar/holidaysActions.js";
import type * as domains_calendar_index from "../domains/calendar/index.js";
import type * as domains_documents_chunks from "../domains/documents/chunks.js";
import type * as domains_documents_citationValidator from "../domains/documents/citationValidator.js";
import type * as domains_documents_citations from "../domains/documents/citations.js";
import type * as domains_documents_documentEvents from "../domains/documents/documentEvents.js";
import type * as domains_documents_documentMetadataParser from "../domains/documents/documentMetadataParser.js";
import type * as domains_documents_documentTasks from "../domains/documents/documentTasks.js";
import type * as domains_documents_documentVersions from "../domains/documents/documentVersions.js";
import type * as domains_documents_documents from "../domains/documents/documents.js";
import type * as domains_documents_fileAnalysis from "../domains/documents/fileAnalysis.js";
import type * as domains_documents_fileDocuments from "../domains/documents/fileDocuments.js";
import type * as domains_documents_fileQueries from "../domains/documents/fileQueries.js";
import type * as domains_documents_fileSearch from "../domains/documents/fileSearch.js";
import type * as domains_documents_fileSearchData from "../domains/documents/fileSearchData.js";
import type * as domains_documents_files from "../domains/documents/files.js";
import type * as domains_documents_folders from "../domains/documents/folders.js";
import type * as domains_documents_gridProjects from "../domains/documents/gridProjects.js";
import type * as domains_documents_index from "../domains/documents/index.js";
import type * as domains_documents_pendingEdits from "../domains/documents/pendingEdits.js";
import type * as domains_documents_prosemirror from "../domains/documents/prosemirror.js";
import type * as domains_documents_search from "../domains/documents/search.js";
import type * as domains_documents_smartDateExtraction from "../domains/documents/smartDateExtraction.js";
import type * as domains_documents_sync from "../domains/documents/sync.js";
import type * as domains_documents_syncMutations from "../domains/documents/syncMutations.js";
import type * as domains_dossier_annotations from "../domains/dossier/annotations.js";
import type * as domains_dossier_enrichment from "../domains/dossier/enrichment.js";
import type * as domains_dossier_focusState from "../domains/dossier/focusState.js";
import type * as domains_dossier_index from "../domains/dossier/index.js";
import type * as domains_enrichment_documentStore from "../domains/enrichment/documentStore.js";
import type * as domains_enrichment_enrichmentQueue from "../domains/enrichment/enrichmentQueue.js";
import type * as domains_enrichment_enrichmentWorker from "../domains/enrichment/enrichmentWorker.js";
import type * as domains_enrichment_entityPromotion from "../domains/enrichment/entityPromotion.js";
import type * as domains_enrichment_fundingDetection from "../domains/enrichment/fundingDetection.js";
import type * as domains_enrichment_fundingMutations from "../domains/enrichment/fundingMutations.js";
import type * as domains_enrichment_fundingQueries from "../domains/enrichment/fundingQueries.js";
import type * as domains_enrichment_fundingVerification from "../domains/enrichment/fundingVerification.js";
import type * as domains_enrichment_testQueries from "../domains/enrichment/testQueries.js";
import type * as domains_enrichment_workpools from "../domains/enrichment/workpools.js";
import type * as domains_eval_evalHelpers from "../domains/eval/evalHelpers.js";
import type * as domains_eval_evalMutations from "../domains/eval/evalMutations.js";
import type * as domains_eval_evalStorage from "../domains/eval/evalStorage.js";
import type * as domains_eval_productionTestCases from "../domains/eval/productionTestCases.js";
import type * as domains_eval_runBatch from "../domains/eval/runBatch.js";
import type * as domains_eval_runBatchNative from "../domains/eval/runBatchNative.js";
import type * as domains_evaluation_benchmarkHarness from "../domains/evaluation/benchmarkHarness.js";
import type * as domains_evaluation_booleanEvaluator from "../domains/evaluation/booleanEvaluator.js";
import type * as domains_evaluation_evalHarness from "../domains/evaluation/evalHarness.js";
import type * as domains_evaluation_evalRunTracking from "../domains/evaluation/evalRunTracking.js";
import type * as domains_evaluation_evaluationPrompts from "../domains/evaluation/evaluationPrompts.js";
import type * as domains_evaluation_evidencePlanner from "../domains/evaluation/evidencePlanner.js";
import type * as domains_evaluation_groundTruth from "../domains/evaluation/groundTruth.js";
import type * as domains_evaluation_index from "../domains/evaluation/index.js";
import type * as domains_evaluation_liveApiSmoke from "../domains/evaluation/liveApiSmoke.js";
import type * as domains_evaluation_liveEval from "../domains/evaluation/liveEval.js";
import type * as domains_evaluation_personaEpisodeEval from "../domains/evaluation/personaEpisodeEval.js";
import type * as domains_evaluation_personaLiveEval from "../domains/evaluation/personaLiveEval.js";
import type * as domains_evaluation_systemE2E from "../domains/evaluation/systemE2E.js";
import type * as domains_evaluation_testAgentDirect from "../domains/evaluation/testAgentDirect.js";
import type * as domains_evaluation_testAgentQueries from "../domains/evaluation/testAgentQueries.js";
import type * as domains_evaluation_testAnthropicApi from "../domains/evaluation/testAnthropicApi.js";
import type * as domains_evaluation_testDirectApi from "../domains/evaluation/testDirectApi.js";
import type * as domains_integrations_email from "../domains/integrations/email.js";
import type * as domains_integrations_email_dossierEmailExample from "../domains/integrations/email/dossierEmailExample.js";
import type * as domains_integrations_email_dossierEmailTemplate from "../domains/integrations/email/dossierEmailTemplate.js";
import type * as domains_integrations_email_morningDigestEmailTemplate from "../domains/integrations/email/morningDigestEmailTemplate.js";
import type * as domains_integrations_gcal from "../domains/integrations/gcal.js";
import type * as domains_integrations_gmail from "../domains/integrations/gmail.js";
import type * as domains_integrations_gmail_types from "../domains/integrations/gmail/types.js";
import type * as domains_integrations_index from "../domains/integrations/index.js";
import type * as domains_integrations_integrations from "../domains/integrations/integrations.js";
import type * as domains_integrations_ntfy from "../domains/integrations/ntfy.js";
import type * as domains_integrations_polar from "../domains/integrations/polar.js";
import type * as domains_integrations_resend from "../domains/integrations/resend.js";
import type * as domains_integrations_sms from "../domains/integrations/sms.js";
import type * as domains_integrations_spreadsheets from "../domains/integrations/spreadsheets.js";
import type * as domains_integrations_voice_voiceActions from "../domains/integrations/voice/voiceActions.js";
import type * as domains_integrations_voice_voiceAgent from "../domains/integrations/voice/voiceAgent.js";
import type * as domains_integrations_voice_voiceMutations from "../domains/integrations/voice/voiceMutations.js";
import type * as domains_knowledge_entityContexts from "../domains/knowledge/entityContexts.js";
import type * as domains_knowledge_entityInsights from "../domains/knowledge/entityInsights.js";
import type * as domains_knowledge_knowledgeGraph from "../domains/knowledge/knowledgeGraph.js";
import type * as domains_knowledge_nodes from "../domains/knowledge/nodes.js";
import type * as domains_knowledge_relationTypes from "../domains/knowledge/relationTypes.js";
import type * as domains_knowledge_relations from "../domains/knowledge/relations.js";
import type * as domains_knowledge_tags from "../domains/knowledge/tags.js";
import type * as domains_landing_landingPageLog from "../domains/landing/landingPageLog.js";
import type * as domains_mcp_mcp from "../domains/mcp/mcp.js";
import type * as domains_mcp_mcpClient from "../domains/mcp/mcpClient.js";
import type * as domains_mcp_mcpHttpAuth from "../domains/mcp/mcpHttpAuth.js";
import type * as domains_mcp_mcpLearning from "../domains/mcp/mcpLearning.js";
import type * as domains_mcp_mcpMemory from "../domains/mcp/mcpMemory.js";
import type * as domains_mcp_mcpMemoryHttp from "../domains/mcp/mcpMemoryHttp.js";
import type * as domains_mcp_mcpPlans from "../domains/mcp/mcpPlans.js";
import type * as domains_mcp_mcpPlansHttp from "../domains/mcp/mcpPlansHttp.js";
import type * as domains_quickCapture_index from "../domains/quickCapture/index.js";
import type * as domains_quickCapture_quickCapture from "../domains/quickCapture/quickCapture.js";
import type * as domains_quickCapture_voiceMemos from "../domains/quickCapture/voiceMemos.js";
import type * as domains_recommendations_behaviorTracking from "../domains/recommendations/behaviorTracking.js";
import type * as domains_recommendations_index from "../domains/recommendations/index.js";
import type * as domains_recommendations_recommendationEngine from "../domains/recommendations/recommendationEngine.js";
import type * as domains_research_briefGenerator from "../domains/research/briefGenerator.js";
import type * as domains_research_dailyBriefInitializer from "../domains/research/dailyBriefInitializer.js";
import type * as domains_research_dailyBriefMemoryMutations from "../domains/research/dailyBriefMemoryMutations.js";
import type * as domains_research_dailyBriefMemoryQueries from "../domains/research/dailyBriefMemoryQueries.js";
import type * as domains_research_dailyBriefPersonalOverlay from "../domains/research/dailyBriefPersonalOverlay.js";
import type * as domains_research_dailyBriefPersonalOverlayMutations from "../domains/research/dailyBriefPersonalOverlayMutations.js";
import type * as domains_research_dailyBriefPersonalOverlayQueries from "../domains/research/dailyBriefPersonalOverlayQueries.js";
import type * as domains_research_dailyBriefWorker from "../domains/research/dailyBriefWorker.js";
import type * as domains_research_dashboardMetrics from "../domains/research/dashboardMetrics.js";
import type * as domains_research_dashboardMutations from "../domains/research/dashboardMutations.js";
import type * as domains_research_dashboardQueries from "../domains/research/dashboardQueries.js";
import type * as domains_research_dealFlow from "../domains/research/dealFlow.js";
import type * as domains_research_dealFlowQueries from "../domains/research/dealFlowQueries.js";
import type * as domains_research_executiveBrief from "../domains/research/executiveBrief.js";
import type * as domains_research_modelComparison from "../domains/research/modelComparison.js";
import type * as domains_research_modelComparisonQueries from "../domains/research/modelComparisonQueries.js";
import type * as domains_research_paperDetails from "../domains/research/paperDetails.js";
import type * as domains_research_paperDetailsQueries from "../domains/research/paperDetailsQueries.js";
import type * as domains_research_publicDossier from "../domains/research/publicDossier.js";
import type * as domains_research_publicDossierQueries from "../domains/research/publicDossierQueries.js";
import type * as domains_research_readerContent from "../domains/research/readerContent.js";
import type * as domains_research_repoScout from "../domains/research/repoScout.js";
import type * as domains_research_repoScoutQueries from "../domains/research/repoScoutQueries.js";
import type * as domains_research_repoStats from "../domains/research/repoStats.js";
import type * as domains_research_repoStatsQueries from "../domains/research/repoStatsQueries.js";
import type * as domains_research_signalTimeseries from "../domains/research/signalTimeseries.js";
import type * as domains_research_stackImpact from "../domains/research/stackImpact.js";
import type * as domains_research_stackImpactQueries from "../domains/research/stackImpactQueries.js";
import type * as domains_research_strategyMetrics from "../domains/research/strategyMetrics.js";
import type * as domains_research_strategyMetricsQueries from "../domains/research/strategyMetricsQueries.js";
import type * as domains_search_fusion_actions from "../domains/search/fusion/actions.js";
import type * as domains_search_fusion_adapters_arxivAdapter from "../domains/search/fusion/adapters/arxivAdapter.js";
import type * as domains_search_fusion_adapters_documentAdapter from "../domains/search/fusion/adapters/documentAdapter.js";
import type * as domains_search_fusion_adapters_index from "../domains/search/fusion/adapters/index.js";
import type * as domains_search_fusion_adapters_linkupAdapter from "../domains/search/fusion/adapters/linkupAdapter.js";
import type * as domains_search_fusion_adapters_newsAdapter from "../domains/search/fusion/adapters/newsAdapter.js";
import type * as domains_search_fusion_adapters_ragAdapter from "../domains/search/fusion/adapters/ragAdapter.js";
import type * as domains_search_fusion_adapters_secAdapter from "../domains/search/fusion/adapters/secAdapter.js";
import type * as domains_search_fusion_adapters_youtubeAdapter from "../domains/search/fusion/adapters/youtubeAdapter.js";
import type * as domains_search_fusion_advanced from "../domains/search/fusion/advanced.js";
import type * as domains_search_fusion_benchmark from "../domains/search/fusion/benchmark.js";
import type * as domains_search_fusion_cache from "../domains/search/fusion/cache.js";
import type * as domains_search_fusion_index from "../domains/search/fusion/index.js";
import type * as domains_search_fusion_observability from "../domains/search/fusion/observability.js";
import type * as domains_search_fusion_orchestrator from "../domains/search/fusion/orchestrator.js";
import type * as domains_search_fusion_rateLimiter from "../domains/search/fusion/rateLimiter.js";
import type * as domains_search_fusion_reranker from "../domains/search/fusion/reranker.js";
import type * as domains_search_fusion_types from "../domains/search/fusion/types.js";
import type * as domains_search_hashtagDossiers from "../domains/search/hashtagDossiers.js";
import type * as domains_search_index from "../domains/search/index.js";
import type * as domains_search_rag from "../domains/search/rag.js";
import type * as domains_search_ragEnhanced from "../domains/search/ragEnhanced.js";
import type * as domains_search_ragEnhancedBatchIndex from "../domains/search/ragEnhancedBatchIndex.js";
import type * as domains_search_ragQueries from "../domains/search/ragQueries.js";
import type * as domains_search_searchCache from "../domains/search/searchCache.js";
import type * as domains_social_instagramIngestion from "../domains/social/instagramIngestion.js";
import type * as domains_tasks_dailyNotes from "../domains/tasks/dailyNotes.js";
import type * as domains_tasks_eventTaskDocuments from "../domains/tasks/eventTaskDocuments.js";
import type * as domains_tasks_index from "../domains/tasks/index.js";
import type * as domains_tasks_userEvents from "../domains/tasks/userEvents.js";
import type * as domains_tasks_work from "../domains/tasks/work.js";
import type * as domains_tasks_workflows_bankingMemoWorkflow from "../domains/tasks/workflows/bankingMemoWorkflow.js";
import type * as domains_tasks_workflows_coordinatorWorkflow from "../domains/tasks/workflows/coordinatorWorkflow.js";
import type * as domains_tasks_workflows_index from "../domains/tasks/workflows/index.js";
import type * as domains_teachability_index from "../domains/teachability/index.js";
import type * as domains_utilities_migrations from "../domains/utilities/migrations.js";
import type * as domains_utilities_seedGoldenDataset from "../domains/utilities/seedGoldenDataset.js";
import type * as domains_utilities_snapshotMigrations from "../domains/utilities/snapshotMigrations.js";
import type * as domains_verification_claimVerificationAction from "../domains/verification/claimVerificationAction.js";
import type * as domains_verification_claimVerificationQueries from "../domains/verification/claimVerificationQueries.js";
import type * as domains_verification_claimVerifications from "../domains/verification/claimVerifications.js";
import type * as domains_verification_facts from "../domains/verification/facts.js";
import type * as domains_verification_index from "../domains/verification/index.js";
import type * as feed from "../feed.js";
import type * as globalResearch_artifacts from "../globalResearch/artifacts.js";
import type * as globalResearch_cacheSimple from "../globalResearch/cacheSimple.js";
import type * as globalResearch_compaction from "../globalResearch/compaction.js";
import type * as globalResearch_index from "../globalResearch/index.js";
import type * as globalResearch_locks from "../globalResearch/locks.js";
import type * as globalResearch_mentions from "../globalResearch/mentions.js";
import type * as globalResearch_queries from "../globalResearch/queries.js";
import type * as globalResearch_runs from "../globalResearch/runs.js";
import type * as http from "../http.js";
import type * as http_mcpMemory from "../http/mcpMemory.js";
import type * as http_mcpPlans from "../http/mcpPlans.js";
import type * as lib_actionItemsGenerator from "../lib/actionItemsGenerator.js";
import type * as lib_agentCache from "../lib/agentCache.js";
import type * as lib_artifactModels from "../lib/artifactModels.js";
import type * as lib_artifactPersistence from "../lib/artifactPersistence.js";
import type * as lib_artifactQueries from "../lib/artifactQueries.js";
import type * as lib_artifactValidators from "../lib/artifactValidators.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_dossierGenerator from "../lib/dossierGenerator.js";
import type * as lib_dossierHelpers from "../lib/dossierHelpers.js";
import type * as lib_entityResolution from "../lib/entityResolution.js";
import type * as lib_factValidation from "../lib/factValidation.js";
import type * as lib_featureFlags from "../lib/featureFlags.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_markdown from "../lib/markdown.js";
import type * as lib_markdownToTipTap from "../lib/markdownToTipTap.js";
import type * as lib_mcpTransport from "../lib/mcpTransport.js";
import type * as lib_memoryLimits from "../lib/memoryLimits.js";
import type * as lib_memoryQuality from "../lib/memoryQuality.js";
import type * as lib_parallelDelegation from "../lib/parallelDelegation.js";
import type * as lib_predictivePrefetch from "../lib/predictivePrefetch.js";
import type * as lib_streamingDelegation from "../lib/streamingDelegation.js";
import type * as lib_withArtifactPersistence from "../lib/withArtifactPersistence.js";
import type * as presence from "../presence.js";
import type * as prosemirror from "../prosemirror.js";
import type * as router from "../router.js";
import type * as schema_apiUsage from "../schema/apiUsage.js";
import type * as schema_toolSearchSchema from "../schema/toolSearchSchema.js";
import type * as tags from "../tags.js";
import type * as tags_actions from "../tags_actions.js";
import type * as tests_fastAgentPanelStreamingTests from "../tests/fastAgentPanelStreamingTests.js";
import type * as tests_fusionSearchContractTests from "../tests/fusionSearchContractTests.js";
import type * as tools_arbitrage_analyzeWithArbitrage from "../tools/arbitrage/analyzeWithArbitrage.js";
import type * as tools_arbitrage_index from "../tools/arbitrage/index.js";
import type * as tools_calendarIcs from "../tools/calendarIcs.js";
import type * as tools_calendarIcsMutations from "../tools/calendarIcsMutations.js";
import type * as tools_calendar_calendarCrudTools from "../tools/calendar/calendarCrudTools.js";
import type * as tools_calendar_confirmEventSelection from "../tools/calendar/confirmEventSelection.js";
import type * as tools_calendar_emailEventExtractor from "../tools/calendar/emailEventExtractor.js";
import type * as tools_calendar_recentEventSearch from "../tools/calendar/recentEventSearch.js";
import type * as tools_context_nodebenchContextTools from "../tools/context/nodebenchContextTools.js";
import type * as tools_document_contextTools from "../tools/document/contextTools.js";
import type * as tools_document_deepAgentEditTools from "../tools/document/deepAgentEditTools.js";
import type * as tools_document_documentEditingLiveTest from "../tools/document/documentEditingLiveTest.js";
import type * as tools_document_documentTools from "../tools/document/documentTools.js";
import type * as tools_document_geminiFileSearch from "../tools/document/geminiFileSearch.js";
import type * as tools_document_hashtagSearchTools from "../tools/document/hashtagSearchTools.js";
import type * as tools_dossier_dossierCrudTools from "../tools/dossier/dossierCrudTools.js";
import type * as tools_editDocument from "../tools/editDocument.js";
import type * as tools_editDocumentMutations from "../tools/editDocumentMutations.js";
import type * as tools_editSpreadsheet from "../tools/editSpreadsheet.js";
import type * as tools_editSpreadsheetMutations from "../tools/editSpreadsheetMutations.js";
import type * as tools_email_emailIntelligenceParser from "../tools/email/emailIntelligenceParser.js";
import type * as tools_evaluation_comprehensiveTest from "../tools/evaluation/comprehensiveTest.js";
import type * as tools_evaluation_evaluator from "../tools/evaluation/evaluator.js";
import type * as tools_evaluation_groundTruthLookup from "../tools/evaluation/groundTruthLookup.js";
import type * as tools_evaluation_groundTruthLookupTool from "../tools/evaluation/groundTruthLookupTool.js";
import type * as tools_evaluation_helpers from "../tools/evaluation/helpers.js";
import type * as tools_evaluation_multiSdkLiveValidation from "../tools/evaluation/multiSdkLiveValidation.js";
import type * as tools_evaluation_quickTest from "../tools/evaluation/quickTest.js";
import type * as tools_evaluation_testCases from "../tools/evaluation/testCases.js";
import type * as tools_evaluation_testOptimizations from "../tools/evaluation/testOptimizations.js";
import type * as tools_evaluation_testPersonas from "../tools/evaluation/testPersonas.js";
import type * as tools_financial_enhancedFundingTools from "../tools/financial/enhancedFundingTools.js";
import type * as tools_financial_fundingDetectionTools from "../tools/financial/fundingDetectionTools.js";
import type * as tools_financial_fundingResearchTools from "../tools/financial/fundingResearchTools.js";
import type * as tools_integration_confirmCompanySelection from "../tools/integration/confirmCompanySelection.js";
import type * as tools_integration_confirmNewsSelection from "../tools/integration/confirmNewsSelection.js";
import type * as tools_integration_confirmPersonSelection from "../tools/integration/confirmPersonSelection.js";
import type * as tools_integration_dataAccessTools from "../tools/integration/dataAccessTools.js";
import type * as tools_integration_digestTools from "../tools/integration/digestTools.js";
import type * as tools_integration_humanInputTools from "../tools/integration/humanInputTools.js";
import type * as tools_integration_newsletterTools from "../tools/integration/newsletterTools.js";
import type * as tools_integration_notificationTools from "../tools/integration/notificationTools.js";
import type * as tools_integration_orchestrationTools from "../tools/integration/orchestrationTools.js";
import type * as tools_integration_peopleProfileSearch from "../tools/integration/peopleProfileSearch.js";
import type * as tools_knowledge_clusteringTools from "../tools/knowledge/clusteringTools.js";
import type * as tools_knowledge_entityInsightTools from "../tools/knowledge/entityInsightTools.js";
import type * as tools_knowledge_knowledgeGraphTools from "../tools/knowledge/knowledgeGraphTools.js";
import type * as tools_knowledge_unifiedMemoryTools from "../tools/knowledge/unifiedMemoryTools.js";
import type * as tools_media_linkupFetch from "../tools/media/linkupFetch.js";
import type * as tools_media_linkupSearch from "../tools/media/linkupSearch.js";
import type * as tools_media_linkupStructuredSearch from "../tools/media/linkupStructuredSearch.js";
import type * as tools_media_mediaTools from "../tools/media/mediaTools.js";
import type * as tools_media_recentNewsSearch from "../tools/media/recentNewsSearch.js";
import type * as tools_media_youtubeSearch from "../tools/media/youtubeSearch.js";
import type * as tools_meta_hybridSearch from "../tools/meta/hybridSearch.js";
import type * as tools_meta_hybridSearchQueries from "../tools/meta/hybridSearchQueries.js";
import type * as tools_meta_hybridSearchTest from "../tools/meta/hybridSearchTest.js";
import type * as tools_meta_index from "../tools/meta/index.js";
import type * as tools_meta_seedSkillRegistry from "../tools/meta/seedSkillRegistry.js";
import type * as tools_meta_seedSkillRegistryQueries from "../tools/meta/seedSkillRegistryQueries.js";
import type * as tools_meta_seedToolRegistry from "../tools/meta/seedToolRegistry.js";
import type * as tools_meta_seedToolRegistryQueries from "../tools/meta/seedToolRegistryQueries.js";
import type * as tools_meta_skillDiscovery from "../tools/meta/skillDiscovery.js";
import type * as tools_meta_skillDiscoveryQueries from "../tools/meta/skillDiscoveryQueries.js";
import type * as tools_meta_toolDiscoveryV2 from "../tools/meta/toolDiscoveryV2.js";
import type * as tools_meta_toolRegistry from "../tools/meta/toolRegistry.js";
import type * as tools_search_fusionSearchTool from "../tools/search/fusionSearchTool.js";
import type * as tools_search_index from "../tools/search/index.js";
import type * as tools_sec_secCompanySearch from "../tools/sec/secCompanySearch.js";
import type * as tools_sec_secFilingTools from "../tools/sec/secFilingTools.js";
import type * as tools_security_promptInjectionProtection from "../tools/security/promptInjectionProtection.js";
import type * as tools_sendEmail from "../tools/sendEmail.js";
import type * as tools_sendEmailMutations from "../tools/sendEmailMutations.js";
import type * as tools_sendNotification from "../tools/sendNotification.js";
import type * as tools_sendSms from "../tools/sendSms.js";
import type * as tools_social_instagramTools from "../tools/social/instagramTools.js";
import type * as tools_spreadsheet_spreadsheetCrudTools from "../tools/spreadsheet/spreadsheetCrudTools.js";
import type * as tools_teachability_index from "../tools/teachability/index.js";
import type * as tools_teachability_learnUserSkill from "../tools/teachability/learnUserSkill.js";
import type * as tools_teachability_teachingAnalyzer from "../tools/teachability/teachingAnalyzer.js";
import type * as tools_teachability_userMemoryQueries from "../tools/teachability/userMemoryQueries.js";
import type * as tools_teachability_userMemoryTools from "../tools/teachability/userMemoryTools.js";
import type * as tools_wrappers_coreAgentTools from "../tools/wrappers/coreAgentTools.js";
import type * as workflows_dailyMorningBrief from "../workflows/dailyMorningBrief.js";
import type * as workflows_emailResearchOrchestrator from "../workflows/emailResearchOrchestrator.js";
import type * as workflows_enhancedMorningBrief from "../workflows/enhancedMorningBrief.js";
import type * as workflows_index from "../workflows/index.js";
import type * as workflows_prdComposerWorkflow from "../workflows/prdComposerWorkflow.js";
import type * as workflows_sendMockBankerDigest from "../workflows/sendMockBankerDigest.js";
import type * as workflows_testDailyBrief from "../workflows/testDailyBrief.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/coordinatorWorkflowActions": typeof actions_coordinatorWorkflowActions;
  "actions/externalOrchestrator": typeof actions_externalOrchestrator;
  "actions/openbbActions": typeof actions_openbbActions;
  "actions/parallelDelegation": typeof actions_parallelDelegation;
  "actions/researchMcpActions": typeof actions_researchMcpActions;
  "actions/spreadsheetActions": typeof actions_spreadsheetActions;
  agentsPrefs: typeof agentsPrefs;
  auth: typeof auth;
  crons: typeof crons;
  "crons/dailyDossierCron": typeof crons_dailyDossierCron;
  "crons/emailIntelligenceCron": typeof crons_emailIntelligenceCron;
  "domains/agents/adapters/anthropic/anthropicReasoningAdapter": typeof domains_agents_adapters_anthropic_anthropicReasoningAdapter;
  "domains/agents/adapters/convex/convexAgentAdapter": typeof domains_agents_adapters_convex_convexAgentAdapter;
  "domains/agents/adapters/handoffBridge": typeof domains_agents_adapters_handoffBridge;
  "domains/agents/adapters/index": typeof domains_agents_adapters_index;
  "domains/agents/adapters/langgraph/langgraphAdapter": typeof domains_agents_adapters_langgraph_langgraphAdapter;
  "domains/agents/adapters/multiSdkDelegation": typeof domains_agents_adapters_multiSdkDelegation;
  "domains/agents/adapters/openai/openaiAgentsAdapter": typeof domains_agents_adapters_openai_openaiAgentsAdapter;
  "domains/agents/adapters/registerDefaultAdapters": typeof domains_agents_adapters_registerDefaultAdapters;
  "domains/agents/adapters/registry": typeof domains_agents_adapters_registry;
  "domains/agents/adapters/routing/personaRouter": typeof domains_agents_adapters_routing_personaRouter;
  "domains/agents/adapters/types": typeof domains_agents_adapters_types;
  "domains/agents/adapters/vercel/vercelAiSdkAdapter": typeof domains_agents_adapters_vercel_vercelAiSdkAdapter;
  "domains/agents/agentChat": typeof domains_agents_agentChat;
  "domains/agents/agentChatActions": typeof domains_agents_agentChatActions;
  "domains/agents/agentDelegations": typeof domains_agents_agentDelegations;
  "domains/agents/agentInitializer": typeof domains_agents_agentInitializer;
  "domains/agents/agentMemory": typeof domains_agents_agentMemory;
  "domains/agents/agentPlanning": typeof domains_agents_agentPlanning;
  "domains/agents/agentRouter": typeof domains_agents_agentRouter;
  "domains/agents/agentScratchpads": typeof domains_agents_agentScratchpads;
  "domains/agents/agentTimelines": typeof domains_agents_agentTimelines;
  "domains/agents/arbitrage/agent": typeof domains_agents_arbitrage_agent;
  "domains/agents/arbitrage/config": typeof domains_agents_arbitrage_config;
  "domains/agents/arbitrage/index": typeof domains_agents_arbitrage_index;
  "domains/agents/arbitrage/tools/contradictionDetection": typeof domains_agents_arbitrage_tools_contradictionDetection;
  "domains/agents/arbitrage/tools/deltaDetection": typeof domains_agents_arbitrage_tools_deltaDetection;
  "domains/agents/arbitrage/tools/index": typeof domains_agents_arbitrage_tools_index;
  "domains/agents/arbitrage/tools/sourceHealthCheck": typeof domains_agents_arbitrage_tools_sourceHealthCheck;
  "domains/agents/arbitrage/tools/sourceQualityRanking": typeof domains_agents_arbitrage_tools_sourceQualityRanking;
  "domains/agents/chatThreads": typeof domains_agents_chatThreads;
  "domains/agents/coordinator/agent": typeof domains_agents_coordinator_agent;
  "domains/agents/coordinator/config": typeof domains_agents_coordinator_config;
  "domains/agents/coordinator/contextPack": typeof domains_agents_coordinator_contextPack;
  "domains/agents/coordinator/contextPackMutations": typeof domains_agents_coordinator_contextPackMutations;
  "domains/agents/coordinator/contextPackQueries": typeof domains_agents_coordinator_contextPackQueries;
  "domains/agents/coordinator/index": typeof domains_agents_coordinator_index;
  "domains/agents/coordinator/tools/delegationTools": typeof domains_agents_coordinator_tools_delegationTools;
  "domains/agents/coordinator/tools/index": typeof domains_agents_coordinator_tools_index;
  "domains/agents/core/coordinatorAgent": typeof domains_agents_core_coordinatorAgent;
  "domains/agents/core/delegation/delegationHelpers": typeof domains_agents_core_delegation_delegationHelpers;
  "domains/agents/core/delegation/delegationTools": typeof domains_agents_core_delegation_delegationTools;
  "domains/agents/core/delegation/temporalContext": typeof domains_agents_core_delegation_temporalContext;
  "domains/agents/core/multiAgentWorkflow": typeof domains_agents_core_multiAgentWorkflow;
  "domains/agents/core/prompts": typeof domains_agents_core_prompts;
  "domains/agents/core/subagents/document_subagent/documentAgent": typeof domains_agents_core_subagents_document_subagent_documentAgent;
  "domains/agents/core/subagents/document_subagent/documentAgentWithMetaTools": typeof domains_agents_core_subagents_document_subagent_documentAgentWithMetaTools;
  "domains/agents/core/subagents/document_subagent/tools/deepAgentEditTools": typeof domains_agents_core_subagents_document_subagent_tools_deepAgentEditTools;
  "domains/agents/core/subagents/document_subagent/tools/documentTools": typeof domains_agents_core_subagents_document_subagent_tools_documentTools;
  "domains/agents/core/subagents/document_subagent/tools/geminiFileSearch": typeof domains_agents_core_subagents_document_subagent_tools_geminiFileSearch;
  "domains/agents/core/subagents/document_subagent/tools/hashtagSearchTools": typeof domains_agents_core_subagents_document_subagent_tools_hashtagSearchTools;
  "domains/agents/core/subagents/document_subagent/tools/index": typeof domains_agents_core_subagents_document_subagent_tools_index;
  "domains/agents/core/subagents/dossier_subagent/dossierAgent": typeof domains_agents_core_subagents_dossier_subagent_dossierAgent;
  "domains/agents/core/subagents/dossier_subagent/tools/enrichDataPoint": typeof domains_agents_core_subagents_dossier_subagent_tools_enrichDataPoint;
  "domains/agents/core/subagents/dossier_subagent/tools/generateAnnotation": typeof domains_agents_core_subagents_dossier_subagent_tools_generateAnnotation;
  "domains/agents/core/subagents/dossier_subagent/tools/getChartContext": typeof domains_agents_core_subagents_dossier_subagent_tools_getChartContext;
  "domains/agents/core/subagents/dossier_subagent/tools/index": typeof domains_agents_core_subagents_dossier_subagent_tools_index;
  "domains/agents/core/subagents/dossier_subagent/tools/updateFocusState": typeof domains_agents_core_subagents_dossier_subagent_tools_updateFocusState;
  "domains/agents/core/subagents/dossier_subagent/tools/updateNarrativeSection": typeof domains_agents_core_subagents_dossier_subagent_tools_updateNarrativeSection;
  "domains/agents/core/subagents/entity_subagent/entityResearchAgent": typeof domains_agents_core_subagents_entity_subagent_entityResearchAgent;
  "domains/agents/core/subagents/media_subagent/mediaAgent": typeof domains_agents_core_subagents_media_subagent_mediaAgent;
  "domains/agents/core/subagents/media_subagent/tools/index": typeof domains_agents_core_subagents_media_subagent_tools_index;
  "domains/agents/core/subagents/media_subagent/tools/linkupSearch": typeof domains_agents_core_subagents_media_subagent_tools_linkupSearch;
  "domains/agents/core/subagents/media_subagent/tools/mediaTools": typeof domains_agents_core_subagents_media_subagent_tools_mediaTools;
  "domains/agents/core/subagents/media_subagent/tools/youtubeSearch": typeof domains_agents_core_subagents_media_subagent_tools_youtubeSearch;
  "domains/agents/core/subagents/openbb_subagent/openbbAgent": typeof domains_agents_core_subagents_openbb_subagent_openbbAgent;
  "domains/agents/core/subagents/openbb_subagent/tools/adminTools": typeof domains_agents_core_subagents_openbb_subagent_tools_adminTools;
  "domains/agents/core/subagents/openbb_subagent/tools/cryptoTools": typeof domains_agents_core_subagents_openbb_subagent_tools_cryptoTools;
  "domains/agents/core/subagents/openbb_subagent/tools/economyTools": typeof domains_agents_core_subagents_openbb_subagent_tools_economyTools;
  "domains/agents/core/subagents/openbb_subagent/tools/equityTools": typeof domains_agents_core_subagents_openbb_subagent_tools_equityTools;
  "domains/agents/core/subagents/openbb_subagent/tools/index": typeof domains_agents_core_subagents_openbb_subagent_tools_index;
  "domains/agents/core/subagents/openbb_subagent/tools/newsTools": typeof domains_agents_core_subagents_openbb_subagent_tools_newsTools;
  "domains/agents/core/subagents/research_subagent/multiSourceResearchAgent": typeof domains_agents_core_subagents_research_subagent_multiSourceResearchAgent;
  "domains/agents/core/subagents/sec_subagent/secAgent": typeof domains_agents_core_subagents_sec_subagent_secAgent;
  "domains/agents/core/subagents/sec_subagent/tools/index": typeof domains_agents_core_subagents_sec_subagent_tools_index;
  "domains/agents/core/subagents/sec_subagent/tools/secCompanySearch": typeof domains_agents_core_subagents_sec_subagent_tools_secCompanySearch;
  "domains/agents/core/subagents/sec_subagent/tools/secFilingTools": typeof domains_agents_core_subagents_sec_subagent_tools_secFilingTools;
  "domains/agents/core/tools/externalOrchestratorTools": typeof domains_agents_core_tools_externalOrchestratorTools;
  "domains/agents/dataAccess/agent": typeof domains_agents_dataAccess_agent;
  "domains/agents/dataAccess/config": typeof domains_agents_dataAccess_config;
  "domains/agents/dataAccess/index": typeof domains_agents_dataAccess_index;
  "domains/agents/dataAccess/tools/calendarTools": typeof domains_agents_dataAccess_tools_calendarTools;
  "domains/agents/dataAccess/tools/index": typeof domains_agents_dataAccess_tools_index;
  "domains/agents/dataAccess/tools/taskTools": typeof domains_agents_dataAccess_tools_taskTools;
  "domains/agents/digestAgent": typeof domains_agents_digestAgent;
  "domains/agents/fastAgentChat": typeof domains_agents_fastAgentChat;
  "domains/agents/fastAgentChatHelpers": typeof domains_agents_fastAgentChatHelpers;
  "domains/agents/fastAgentDocumentCreation": typeof domains_agents_fastAgentDocumentCreation;
  "domains/agents/fastAgentPanelStreaming": typeof domains_agents_fastAgentPanelStreaming;
  "domains/agents/hitl/config": typeof domains_agents_hitl_config;
  "domains/agents/hitl/index": typeof domains_agents_hitl_index;
  "domains/agents/hitl/interruptManager": typeof domains_agents_hitl_interruptManager;
  "domains/agents/hitl/tools/askHuman": typeof domains_agents_hitl_tools_askHuman;
  "domains/agents/hitl/tools/index": typeof domains_agents_hitl_tools_index;
  "domains/agents/humanInTheLoop": typeof domains_agents_humanInTheLoop;
  "domains/agents/index": typeof domains_agents_index;
  "domains/agents/mcp_tools/context/contextInitializerTool": typeof domains_agents_mcp_tools_context_contextInitializerTool;
  "domains/agents/mcp_tools/context/index": typeof domains_agents_mcp_tools_context_index;
  "domains/agents/mcp_tools/index": typeof domains_agents_mcp_tools_index;
  "domains/agents/mcp_tools/models/healthcheck": typeof domains_agents_mcp_tools_models_healthcheck;
  "domains/agents/mcp_tools/models/index": typeof domains_agents_mcp_tools_models_index;
  "domains/agents/mcp_tools/models/migration": typeof domains_agents_mcp_tools_models_migration;
  "domains/agents/mcp_tools/models/modelResolver": typeof domains_agents_mcp_tools_models_modelResolver;
  "domains/agents/mcp_tools/tracking/index": typeof domains_agents_mcp_tools_tracking_index;
  "domains/agents/mcp_tools/tracking/taskTrackerTool": typeof domains_agents_mcp_tools_tracking_taskTrackerTool;
  "domains/agents/orchestrator/geminiVideoWrapper": typeof domains_agents_orchestrator_geminiVideoWrapper;
  "domains/agents/orchestrator/queueProtocol": typeof domains_agents_orchestrator_queueProtocol;
  "domains/agents/orchestrator/secEdgarWrapper": typeof domains_agents_orchestrator_secEdgarWrapper;
  "domains/agents/orchestrator/toolHealth": typeof domains_agents_orchestrator_toolHealth;
  "domains/agents/orchestrator/toolRouter": typeof domains_agents_orchestrator_toolRouter;
  "domains/agents/orchestrator/worker": typeof domains_agents_orchestrator_worker;
  "domains/agents/parallelTaskOrchestrator": typeof domains_agents_parallelTaskOrchestrator;
  "domains/agents/parallelTaskTree": typeof domains_agents_parallelTaskTree;
  "domains/agents/researchJobs": typeof domains_agents_researchJobs;
  "domains/agents/types": typeof domains_agents_types;
  "domains/ai/ai": typeof domains_ai_ai;
  "domains/ai/genai": typeof domains_ai_genai;
  "domains/ai/metadataAnalyzer": typeof domains_ai_metadataAnalyzer;
  "domains/ai/morningDigest": typeof domains_ai_morningDigest;
  "domains/ai/morningDigestQueries": typeof domains_ai_morningDigestQueries;
  "domains/analytics/analytics": typeof domains_analytics_analytics;
  "domains/analytics/ossStats": typeof domains_analytics_ossStats;
  "domains/artifacts/sourceArtifacts": typeof domains_artifacts_sourceArtifacts;
  "domains/auth/account": typeof domains_auth_account;
  "domains/auth/apiKeys": typeof domains_auth_apiKeys;
  "domains/auth/apiKeysActions": typeof domains_auth_apiKeysActions;
  "domains/auth/auth": typeof domains_auth_auth;
  "domains/auth/index": typeof domains_auth_index;
  "domains/auth/onboarding": typeof domains_auth_onboarding;
  "domains/auth/presence": typeof domains_auth_presence;
  "domains/auth/usage": typeof domains_auth_usage;
  "domains/auth/userPreferences": typeof domains_auth_userPreferences;
  "domains/auth/userStats": typeof domains_auth_userStats;
  "domains/auth/users": typeof domains_auth_users;
  "domains/billing/apiUsageTracking": typeof domains_billing_apiUsageTracking;
  "domains/billing/billing": typeof domains_billing_billing;
  "domains/billing/index": typeof domains_billing_index;
  "domains/billing/rateLimiting": typeof domains_billing_rateLimiting;
  "domains/calendar/calendar": typeof domains_calendar_calendar;
  "domains/calendar/events": typeof domains_calendar_events;
  "domains/calendar/holidays": typeof domains_calendar_holidays;
  "domains/calendar/holidaysActions": typeof domains_calendar_holidaysActions;
  "domains/calendar/index": typeof domains_calendar_index;
  "domains/documents/chunks": typeof domains_documents_chunks;
  "domains/documents/citationValidator": typeof domains_documents_citationValidator;
  "domains/documents/citations": typeof domains_documents_citations;
  "domains/documents/documentEvents": typeof domains_documents_documentEvents;
  "domains/documents/documentMetadataParser": typeof domains_documents_documentMetadataParser;
  "domains/documents/documentTasks": typeof domains_documents_documentTasks;
  "domains/documents/documentVersions": typeof domains_documents_documentVersions;
  "domains/documents/documents": typeof domains_documents_documents;
  "domains/documents/fileAnalysis": typeof domains_documents_fileAnalysis;
  "domains/documents/fileDocuments": typeof domains_documents_fileDocuments;
  "domains/documents/fileQueries": typeof domains_documents_fileQueries;
  "domains/documents/fileSearch": typeof domains_documents_fileSearch;
  "domains/documents/fileSearchData": typeof domains_documents_fileSearchData;
  "domains/documents/files": typeof domains_documents_files;
  "domains/documents/folders": typeof domains_documents_folders;
  "domains/documents/gridProjects": typeof domains_documents_gridProjects;
  "domains/documents/index": typeof domains_documents_index;
  "domains/documents/pendingEdits": typeof domains_documents_pendingEdits;
  "domains/documents/prosemirror": typeof domains_documents_prosemirror;
  "domains/documents/search": typeof domains_documents_search;
  "domains/documents/smartDateExtraction": typeof domains_documents_smartDateExtraction;
  "domains/documents/sync": typeof domains_documents_sync;
  "domains/documents/syncMutations": typeof domains_documents_syncMutations;
  "domains/dossier/annotations": typeof domains_dossier_annotations;
  "domains/dossier/enrichment": typeof domains_dossier_enrichment;
  "domains/dossier/focusState": typeof domains_dossier_focusState;
  "domains/dossier/index": typeof domains_dossier_index;
  "domains/enrichment/documentStore": typeof domains_enrichment_documentStore;
  "domains/enrichment/enrichmentQueue": typeof domains_enrichment_enrichmentQueue;
  "domains/enrichment/enrichmentWorker": typeof domains_enrichment_enrichmentWorker;
  "domains/enrichment/entityPromotion": typeof domains_enrichment_entityPromotion;
  "domains/enrichment/fundingDetection": typeof domains_enrichment_fundingDetection;
  "domains/enrichment/fundingMutations": typeof domains_enrichment_fundingMutations;
  "domains/enrichment/fundingQueries": typeof domains_enrichment_fundingQueries;
  "domains/enrichment/fundingVerification": typeof domains_enrichment_fundingVerification;
  "domains/enrichment/testQueries": typeof domains_enrichment_testQueries;
  "domains/enrichment/workpools": typeof domains_enrichment_workpools;
  "domains/eval/evalHelpers": typeof domains_eval_evalHelpers;
  "domains/eval/evalMutations": typeof domains_eval_evalMutations;
  "domains/eval/evalStorage": typeof domains_eval_evalStorage;
  "domains/eval/productionTestCases": typeof domains_eval_productionTestCases;
  "domains/eval/runBatch": typeof domains_eval_runBatch;
  "domains/eval/runBatchNative": typeof domains_eval_runBatchNative;
  "domains/evaluation/benchmarkHarness": typeof domains_evaluation_benchmarkHarness;
  "domains/evaluation/booleanEvaluator": typeof domains_evaluation_booleanEvaluator;
  "domains/evaluation/evalHarness": typeof domains_evaluation_evalHarness;
  "domains/evaluation/evalRunTracking": typeof domains_evaluation_evalRunTracking;
  "domains/evaluation/evaluationPrompts": typeof domains_evaluation_evaluationPrompts;
  "domains/evaluation/evidencePlanner": typeof domains_evaluation_evidencePlanner;
  "domains/evaluation/groundTruth": typeof domains_evaluation_groundTruth;
  "domains/evaluation/index": typeof domains_evaluation_index;
  "domains/evaluation/liveApiSmoke": typeof domains_evaluation_liveApiSmoke;
  "domains/evaluation/liveEval": typeof domains_evaluation_liveEval;
  "domains/evaluation/personaEpisodeEval": typeof domains_evaluation_personaEpisodeEval;
  "domains/evaluation/personaLiveEval": typeof domains_evaluation_personaLiveEval;
  "domains/evaluation/systemE2E": typeof domains_evaluation_systemE2E;
  "domains/evaluation/testAgentDirect": typeof domains_evaluation_testAgentDirect;
  "domains/evaluation/testAgentQueries": typeof domains_evaluation_testAgentQueries;
  "domains/evaluation/testAnthropicApi": typeof domains_evaluation_testAnthropicApi;
  "domains/evaluation/testDirectApi": typeof domains_evaluation_testDirectApi;
  "domains/integrations/email": typeof domains_integrations_email;
  "domains/integrations/email/dossierEmailExample": typeof domains_integrations_email_dossierEmailExample;
  "domains/integrations/email/dossierEmailTemplate": typeof domains_integrations_email_dossierEmailTemplate;
  "domains/integrations/email/morningDigestEmailTemplate": typeof domains_integrations_email_morningDigestEmailTemplate;
  "domains/integrations/gcal": typeof domains_integrations_gcal;
  "domains/integrations/gmail": typeof domains_integrations_gmail;
  "domains/integrations/gmail/types": typeof domains_integrations_gmail_types;
  "domains/integrations/index": typeof domains_integrations_index;
  "domains/integrations/integrations": typeof domains_integrations_integrations;
  "domains/integrations/ntfy": typeof domains_integrations_ntfy;
  "domains/integrations/polar": typeof domains_integrations_polar;
  "domains/integrations/resend": typeof domains_integrations_resend;
  "domains/integrations/sms": typeof domains_integrations_sms;
  "domains/integrations/spreadsheets": typeof domains_integrations_spreadsheets;
  "domains/integrations/voice/voiceActions": typeof domains_integrations_voice_voiceActions;
  "domains/integrations/voice/voiceAgent": typeof domains_integrations_voice_voiceAgent;
  "domains/integrations/voice/voiceMutations": typeof domains_integrations_voice_voiceMutations;
  "domains/knowledge/entityContexts": typeof domains_knowledge_entityContexts;
  "domains/knowledge/entityInsights": typeof domains_knowledge_entityInsights;
  "domains/knowledge/knowledgeGraph": typeof domains_knowledge_knowledgeGraph;
  "domains/knowledge/nodes": typeof domains_knowledge_nodes;
  "domains/knowledge/relationTypes": typeof domains_knowledge_relationTypes;
  "domains/knowledge/relations": typeof domains_knowledge_relations;
  "domains/knowledge/tags": typeof domains_knowledge_tags;
  "domains/landing/landingPageLog": typeof domains_landing_landingPageLog;
  "domains/mcp/mcp": typeof domains_mcp_mcp;
  "domains/mcp/mcpClient": typeof domains_mcp_mcpClient;
  "domains/mcp/mcpHttpAuth": typeof domains_mcp_mcpHttpAuth;
  "domains/mcp/mcpLearning": typeof domains_mcp_mcpLearning;
  "domains/mcp/mcpMemory": typeof domains_mcp_mcpMemory;
  "domains/mcp/mcpMemoryHttp": typeof domains_mcp_mcpMemoryHttp;
  "domains/mcp/mcpPlans": typeof domains_mcp_mcpPlans;
  "domains/mcp/mcpPlansHttp": typeof domains_mcp_mcpPlansHttp;
  "domains/quickCapture/index": typeof domains_quickCapture_index;
  "domains/quickCapture/quickCapture": typeof domains_quickCapture_quickCapture;
  "domains/quickCapture/voiceMemos": typeof domains_quickCapture_voiceMemos;
  "domains/recommendations/behaviorTracking": typeof domains_recommendations_behaviorTracking;
  "domains/recommendations/index": typeof domains_recommendations_index;
  "domains/recommendations/recommendationEngine": typeof domains_recommendations_recommendationEngine;
  "domains/research/briefGenerator": typeof domains_research_briefGenerator;
  "domains/research/dailyBriefInitializer": typeof domains_research_dailyBriefInitializer;
  "domains/research/dailyBriefMemoryMutations": typeof domains_research_dailyBriefMemoryMutations;
  "domains/research/dailyBriefMemoryQueries": typeof domains_research_dailyBriefMemoryQueries;
  "domains/research/dailyBriefPersonalOverlay": typeof domains_research_dailyBriefPersonalOverlay;
  "domains/research/dailyBriefPersonalOverlayMutations": typeof domains_research_dailyBriefPersonalOverlayMutations;
  "domains/research/dailyBriefPersonalOverlayQueries": typeof domains_research_dailyBriefPersonalOverlayQueries;
  "domains/research/dailyBriefWorker": typeof domains_research_dailyBriefWorker;
  "domains/research/dashboardMetrics": typeof domains_research_dashboardMetrics;
  "domains/research/dashboardMutations": typeof domains_research_dashboardMutations;
  "domains/research/dashboardQueries": typeof domains_research_dashboardQueries;
  "domains/research/dealFlow": typeof domains_research_dealFlow;
  "domains/research/dealFlowQueries": typeof domains_research_dealFlowQueries;
  "domains/research/executiveBrief": typeof domains_research_executiveBrief;
  "domains/research/modelComparison": typeof domains_research_modelComparison;
  "domains/research/modelComparisonQueries": typeof domains_research_modelComparisonQueries;
  "domains/research/paperDetails": typeof domains_research_paperDetails;
  "domains/research/paperDetailsQueries": typeof domains_research_paperDetailsQueries;
  "domains/research/publicDossier": typeof domains_research_publicDossier;
  "domains/research/publicDossierQueries": typeof domains_research_publicDossierQueries;
  "domains/research/readerContent": typeof domains_research_readerContent;
  "domains/research/repoScout": typeof domains_research_repoScout;
  "domains/research/repoScoutQueries": typeof domains_research_repoScoutQueries;
  "domains/research/repoStats": typeof domains_research_repoStats;
  "domains/research/repoStatsQueries": typeof domains_research_repoStatsQueries;
  "domains/research/signalTimeseries": typeof domains_research_signalTimeseries;
  "domains/research/stackImpact": typeof domains_research_stackImpact;
  "domains/research/stackImpactQueries": typeof domains_research_stackImpactQueries;
  "domains/research/strategyMetrics": typeof domains_research_strategyMetrics;
  "domains/research/strategyMetricsQueries": typeof domains_research_strategyMetricsQueries;
  "domains/search/fusion/actions": typeof domains_search_fusion_actions;
  "domains/search/fusion/adapters/arxivAdapter": typeof domains_search_fusion_adapters_arxivAdapter;
  "domains/search/fusion/adapters/documentAdapter": typeof domains_search_fusion_adapters_documentAdapter;
  "domains/search/fusion/adapters/index": typeof domains_search_fusion_adapters_index;
  "domains/search/fusion/adapters/linkupAdapter": typeof domains_search_fusion_adapters_linkupAdapter;
  "domains/search/fusion/adapters/newsAdapter": typeof domains_search_fusion_adapters_newsAdapter;
  "domains/search/fusion/adapters/ragAdapter": typeof domains_search_fusion_adapters_ragAdapter;
  "domains/search/fusion/adapters/secAdapter": typeof domains_search_fusion_adapters_secAdapter;
  "domains/search/fusion/adapters/youtubeAdapter": typeof domains_search_fusion_adapters_youtubeAdapter;
  "domains/search/fusion/advanced": typeof domains_search_fusion_advanced;
  "domains/search/fusion/benchmark": typeof domains_search_fusion_benchmark;
  "domains/search/fusion/cache": typeof domains_search_fusion_cache;
  "domains/search/fusion/index": typeof domains_search_fusion_index;
  "domains/search/fusion/observability": typeof domains_search_fusion_observability;
  "domains/search/fusion/orchestrator": typeof domains_search_fusion_orchestrator;
  "domains/search/fusion/rateLimiter": typeof domains_search_fusion_rateLimiter;
  "domains/search/fusion/reranker": typeof domains_search_fusion_reranker;
  "domains/search/fusion/types": typeof domains_search_fusion_types;
  "domains/search/hashtagDossiers": typeof domains_search_hashtagDossiers;
  "domains/search/index": typeof domains_search_index;
  "domains/search/rag": typeof domains_search_rag;
  "domains/search/ragEnhanced": typeof domains_search_ragEnhanced;
  "domains/search/ragEnhancedBatchIndex": typeof domains_search_ragEnhancedBatchIndex;
  "domains/search/ragQueries": typeof domains_search_ragQueries;
  "domains/search/searchCache": typeof domains_search_searchCache;
  "domains/social/instagramIngestion": typeof domains_social_instagramIngestion;
  "domains/tasks/dailyNotes": typeof domains_tasks_dailyNotes;
  "domains/tasks/eventTaskDocuments": typeof domains_tasks_eventTaskDocuments;
  "domains/tasks/index": typeof domains_tasks_index;
  "domains/tasks/userEvents": typeof domains_tasks_userEvents;
  "domains/tasks/work": typeof domains_tasks_work;
  "domains/tasks/workflows/bankingMemoWorkflow": typeof domains_tasks_workflows_bankingMemoWorkflow;
  "domains/tasks/workflows/coordinatorWorkflow": typeof domains_tasks_workflows_coordinatorWorkflow;
  "domains/tasks/workflows/index": typeof domains_tasks_workflows_index;
  "domains/teachability/index": typeof domains_teachability_index;
  "domains/utilities/migrations": typeof domains_utilities_migrations;
  "domains/utilities/seedGoldenDataset": typeof domains_utilities_seedGoldenDataset;
  "domains/utilities/snapshotMigrations": typeof domains_utilities_snapshotMigrations;
  "domains/verification/claimVerificationAction": typeof domains_verification_claimVerificationAction;
  "domains/verification/claimVerificationQueries": typeof domains_verification_claimVerificationQueries;
  "domains/verification/claimVerifications": typeof domains_verification_claimVerifications;
  "domains/verification/facts": typeof domains_verification_facts;
  "domains/verification/index": typeof domains_verification_index;
  feed: typeof feed;
  "globalResearch/artifacts": typeof globalResearch_artifacts;
  "globalResearch/cacheSimple": typeof globalResearch_cacheSimple;
  "globalResearch/compaction": typeof globalResearch_compaction;
  "globalResearch/index": typeof globalResearch_index;
  "globalResearch/locks": typeof globalResearch_locks;
  "globalResearch/mentions": typeof globalResearch_mentions;
  "globalResearch/queries": typeof globalResearch_queries;
  "globalResearch/runs": typeof globalResearch_runs;
  http: typeof http;
  "http/mcpMemory": typeof http_mcpMemory;
  "http/mcpPlans": typeof http_mcpPlans;
  "lib/actionItemsGenerator": typeof lib_actionItemsGenerator;
  "lib/agentCache": typeof lib_agentCache;
  "lib/artifactModels": typeof lib_artifactModels;
  "lib/artifactPersistence": typeof lib_artifactPersistence;
  "lib/artifactQueries": typeof lib_artifactQueries;
  "lib/artifactValidators": typeof lib_artifactValidators;
  "lib/crypto": typeof lib_crypto;
  "lib/dossierGenerator": typeof lib_dossierGenerator;
  "lib/dossierHelpers": typeof lib_dossierHelpers;
  "lib/entityResolution": typeof lib_entityResolution;
  "lib/factValidation": typeof lib_factValidation;
  "lib/featureFlags": typeof lib_featureFlags;
  "lib/index": typeof lib_index;
  "lib/markdown": typeof lib_markdown;
  "lib/markdownToTipTap": typeof lib_markdownToTipTap;
  "lib/mcpTransport": typeof lib_mcpTransport;
  "lib/memoryLimits": typeof lib_memoryLimits;
  "lib/memoryQuality": typeof lib_memoryQuality;
  "lib/parallelDelegation": typeof lib_parallelDelegation;
  "lib/predictivePrefetch": typeof lib_predictivePrefetch;
  "lib/streamingDelegation": typeof lib_streamingDelegation;
  "lib/withArtifactPersistence": typeof lib_withArtifactPersistence;
  presence: typeof presence;
  prosemirror: typeof prosemirror;
  router: typeof router;
  "schema/apiUsage": typeof schema_apiUsage;
  "schema/toolSearchSchema": typeof schema_toolSearchSchema;
  tags: typeof tags;
  tags_actions: typeof tags_actions;
  "tests/fastAgentPanelStreamingTests": typeof tests_fastAgentPanelStreamingTests;
  "tests/fusionSearchContractTests": typeof tests_fusionSearchContractTests;
  "tools/arbitrage/analyzeWithArbitrage": typeof tools_arbitrage_analyzeWithArbitrage;
  "tools/arbitrage/index": typeof tools_arbitrage_index;
  "tools/calendarIcs": typeof tools_calendarIcs;
  "tools/calendarIcsMutations": typeof tools_calendarIcsMutations;
  "tools/calendar/calendarCrudTools": typeof tools_calendar_calendarCrudTools;
  "tools/calendar/confirmEventSelection": typeof tools_calendar_confirmEventSelection;
  "tools/calendar/emailEventExtractor": typeof tools_calendar_emailEventExtractor;
  "tools/calendar/recentEventSearch": typeof tools_calendar_recentEventSearch;
  "tools/context/nodebenchContextTools": typeof tools_context_nodebenchContextTools;
  "tools/document/contextTools": typeof tools_document_contextTools;
  "tools/document/deepAgentEditTools": typeof tools_document_deepAgentEditTools;
  "tools/document/documentEditingLiveTest": typeof tools_document_documentEditingLiveTest;
  "tools/document/documentTools": typeof tools_document_documentTools;
  "tools/document/geminiFileSearch": typeof tools_document_geminiFileSearch;
  "tools/document/hashtagSearchTools": typeof tools_document_hashtagSearchTools;
  "tools/dossier/dossierCrudTools": typeof tools_dossier_dossierCrudTools;
  "tools/editDocument": typeof tools_editDocument;
  "tools/editDocumentMutations": typeof tools_editDocumentMutations;
  "tools/editSpreadsheet": typeof tools_editSpreadsheet;
  "tools/editSpreadsheetMutations": typeof tools_editSpreadsheetMutations;
  "tools/email/emailIntelligenceParser": typeof tools_email_emailIntelligenceParser;
  "tools/evaluation/comprehensiveTest": typeof tools_evaluation_comprehensiveTest;
  "tools/evaluation/evaluator": typeof tools_evaluation_evaluator;
  "tools/evaluation/groundTruthLookup": typeof tools_evaluation_groundTruthLookup;
  "tools/evaluation/groundTruthLookupTool": typeof tools_evaluation_groundTruthLookupTool;
  "tools/evaluation/helpers": typeof tools_evaluation_helpers;
  "tools/evaluation/multiSdkLiveValidation": typeof tools_evaluation_multiSdkLiveValidation;
  "tools/evaluation/quickTest": typeof tools_evaluation_quickTest;
  "tools/evaluation/testCases": typeof tools_evaluation_testCases;
  "tools/evaluation/testOptimizations": typeof tools_evaluation_testOptimizations;
  "tools/evaluation/testPersonas": typeof tools_evaluation_testPersonas;
  "tools/financial/enhancedFundingTools": typeof tools_financial_enhancedFundingTools;
  "tools/financial/fundingDetectionTools": typeof tools_financial_fundingDetectionTools;
  "tools/financial/fundingResearchTools": typeof tools_financial_fundingResearchTools;
  "tools/integration/confirmCompanySelection": typeof tools_integration_confirmCompanySelection;
  "tools/integration/confirmNewsSelection": typeof tools_integration_confirmNewsSelection;
  "tools/integration/confirmPersonSelection": typeof tools_integration_confirmPersonSelection;
  "tools/integration/dataAccessTools": typeof tools_integration_dataAccessTools;
  "tools/integration/digestTools": typeof tools_integration_digestTools;
  "tools/integration/humanInputTools": typeof tools_integration_humanInputTools;
  "tools/integration/newsletterTools": typeof tools_integration_newsletterTools;
  "tools/integration/notificationTools": typeof tools_integration_notificationTools;
  "tools/integration/orchestrationTools": typeof tools_integration_orchestrationTools;
  "tools/integration/peopleProfileSearch": typeof tools_integration_peopleProfileSearch;
  "tools/knowledge/clusteringTools": typeof tools_knowledge_clusteringTools;
  "tools/knowledge/entityInsightTools": typeof tools_knowledge_entityInsightTools;
  "tools/knowledge/knowledgeGraphTools": typeof tools_knowledge_knowledgeGraphTools;
  "tools/knowledge/unifiedMemoryTools": typeof tools_knowledge_unifiedMemoryTools;
  "tools/media/linkupFetch": typeof tools_media_linkupFetch;
  "tools/media/linkupSearch": typeof tools_media_linkupSearch;
  "tools/media/linkupStructuredSearch": typeof tools_media_linkupStructuredSearch;
  "tools/media/mediaTools": typeof tools_media_mediaTools;
  "tools/media/recentNewsSearch": typeof tools_media_recentNewsSearch;
  "tools/media/youtubeSearch": typeof tools_media_youtubeSearch;
  "tools/meta/hybridSearch": typeof tools_meta_hybridSearch;
  "tools/meta/hybridSearchQueries": typeof tools_meta_hybridSearchQueries;
  "tools/meta/hybridSearchTest": typeof tools_meta_hybridSearchTest;
  "tools/meta/index": typeof tools_meta_index;
  "tools/meta/seedSkillRegistry": typeof tools_meta_seedSkillRegistry;
  "tools/meta/seedSkillRegistryQueries": typeof tools_meta_seedSkillRegistryQueries;
  "tools/meta/seedToolRegistry": typeof tools_meta_seedToolRegistry;
  "tools/meta/seedToolRegistryQueries": typeof tools_meta_seedToolRegistryQueries;
  "tools/meta/skillDiscovery": typeof tools_meta_skillDiscovery;
  "tools/meta/skillDiscoveryQueries": typeof tools_meta_skillDiscoveryQueries;
  "tools/meta/toolDiscoveryV2": typeof tools_meta_toolDiscoveryV2;
  "tools/meta/toolRegistry": typeof tools_meta_toolRegistry;
  "tools/search/fusionSearchTool": typeof tools_search_fusionSearchTool;
  "tools/search/index": typeof tools_search_index;
  "tools/sec/secCompanySearch": typeof tools_sec_secCompanySearch;
  "tools/sec/secFilingTools": typeof tools_sec_secFilingTools;
  "tools/security/promptInjectionProtection": typeof tools_security_promptInjectionProtection;
  "tools/sendEmail": typeof tools_sendEmail;
  "tools/sendEmailMutations": typeof tools_sendEmailMutations;
  "tools/sendNotification": typeof tools_sendNotification;
  "tools/sendSms": typeof tools_sendSms;
  "tools/social/instagramTools": typeof tools_social_instagramTools;
  "tools/spreadsheet/spreadsheetCrudTools": typeof tools_spreadsheet_spreadsheetCrudTools;
  "tools/teachability/index": typeof tools_teachability_index;
  "tools/teachability/learnUserSkill": typeof tools_teachability_learnUserSkill;
  "tools/teachability/teachingAnalyzer": typeof tools_teachability_teachingAnalyzer;
  "tools/teachability/userMemoryQueries": typeof tools_teachability_userMemoryQueries;
  "tools/teachability/userMemoryTools": typeof tools_teachability_userMemoryTools;
  "tools/wrappers/coreAgentTools": typeof tools_wrappers_coreAgentTools;
  "workflows/dailyMorningBrief": typeof workflows_dailyMorningBrief;
  "workflows/emailResearchOrchestrator": typeof workflows_emailResearchOrchestrator;
  "workflows/enhancedMorningBrief": typeof workflows_enhancedMorningBrief;
  "workflows/index": typeof workflows_index;
  "workflows/prdComposerWorkflow": typeof workflows_prdComposerWorkflow;
  "workflows/sendMockBankerDigest": typeof workflows_sendMockBankerDigest;
  "workflows/testDailyBrief": typeof workflows_testDailyBrief;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  prosemirrorSync: {
    lib: {
      deleteDocument: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        null
      >;
      deleteSnapshots: FunctionReference<
        "mutation",
        "internal",
        { afterVersion?: number; beforeVersion?: number; id: string },
        null
      >;
      deleteSteps: FunctionReference<
        "mutation",
        "internal",
        {
          afterVersion?: number;
          beforeTs: number;
          deleteNewerThanLatestSnapshot?: boolean;
          id: string;
        },
        null
      >;
      getSnapshot: FunctionReference<
        "query",
        "internal",
        { id: string; version?: number },
        { content: null } | { content: string; version: number }
      >;
      getSteps: FunctionReference<
        "query",
        "internal",
        { id: string; version: number },
        {
          clientIds: Array<string | number>;
          steps: Array<string>;
          version: number;
        }
      >;
      latestVersion: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | number
      >;
      submitSnapshot: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          id: string;
          pruneSnapshots?: boolean;
          version: number;
        },
        null
      >;
      submitSteps: FunctionReference<
        "mutation",
        "internal",
        {
          clientId: string | number;
          id: string;
          steps: Array<string>;
          version: number;
        },
        | {
            clientIds: Array<string | number>;
            status: "needs-rebase";
            steps: Array<string>;
          }
        | { status: "synced" }
      >;
    };
  };
  presence: {
    public: {
      disconnect: FunctionReference<
        "mutation",
        "internal",
        { sessionToken: string },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        {
          interval?: number;
          roomId: string;
          sessionId: string;
          userId: string;
        },
        { roomToken: string; sessionToken: string }
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomToken: string },
        Array<{ lastDisconnected: number; online: boolean; userId: string }>
      >;
      listRoom: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; roomId: string },
        Array<{ lastDisconnected: number; online: boolean; userId: string }>
      >;
      listUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; userId: string },
        Array<{ lastDisconnected: number; online: boolean; roomId: string }>
      >;
      removeRoom: FunctionReference<
        "mutation",
        "internal",
        { roomId: string },
        null
      >;
      removeRoomUser: FunctionReference<
        "mutation",
        "internal",
        { roomId: string; userId: string },
        null
      >;
    };
  };
  agent: {
    apiKeys: {
      destroy: FunctionReference<
        "mutation",
        "internal",
        { apiKey?: string; name?: string },
        | "missing"
        | "deleted"
        | "name mismatch"
        | "must provide either apiKey or name"
      >;
      issue: FunctionReference<
        "mutation",
        "internal",
        { name?: string },
        string
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { apiKey: string },
        boolean
      >;
    };
    files: {
      addFile: FunctionReference<
        "mutation",
        "internal",
        {
          filename?: string;
          hash: string;
          mimeType: string;
          storageId: string;
        },
        { fileId: string; storageId: string }
      >;
      copyFile: FunctionReference<
        "mutation",
        "internal",
        { fileId: string },
        null
      >;
      deleteFiles: FunctionReference<
        "mutation",
        "internal",
        { fileIds: Array<string>; force?: boolean },
        Array<string>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { fileId: string },
        null | {
          _creationTime: number;
          _id: string;
          filename?: string;
          hash: string;
          lastTouchedAt: number;
          mimeType: string;
          refcount: number;
          storageId: string;
        }
      >;
      getFilesToDelete: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            filename?: string;
            hash: string;
            lastTouchedAt: number;
            mimeType: string;
            refcount: number;
            storageId: string;
          }>;
        }
      >;
      useExistingFile: FunctionReference<
        "mutation",
        "internal",
        { filename?: string; hash: string },
        null | { fileId: string; storageId: string }
      >;
    };
    messages: {
      addMessages: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          embeddings?: {
            dimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            model: string;
            vectors: Array<Array<number> | null>;
          };
          failPendingSteps?: boolean;
          messages: Array<{
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status?: "pending" | "success" | "failed";
            text?: string;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pendingMessageId?: string;
          promptMessageId?: string;
          threadId: string;
          userId?: string;
        },
        {
          messages: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
        }
      >;
      deleteByIds: FunctionReference<
        "mutation",
        "internal",
        { messageIds: Array<string> },
        Array<string>
      >;
      deleteByOrder: FunctionReference<
        "mutation",
        "internal",
        {
          endOrder: number;
          endStepOrder?: number;
          startOrder: number;
          startStepOrder?: number;
          threadId: string;
        },
        { isDone: boolean; lastOrder?: number; lastStepOrder?: number }
      >;
      finalizeMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          result: { status: "success" } | { error: string; status: "failed" };
        },
        null
      >;
      getMessagesByIds: FunctionReference<
        "query",
        "internal",
        { messageIds: Array<string> },
        Array<null | {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      getMessageSearchFields: FunctionReference<
        "query",
        "internal",
        { messageId: string },
        { embedding?: Array<number>; embeddingModel?: string; text?: string }
      >;
      listMessagesByThreadId: FunctionReference<
        "query",
        "internal",
        {
          excludeToolMessages?: boolean;
          order: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          statuses?: Array<"pending" | "success" | "failed">;
          threadId: string;
          upToAndIncludingMessageId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchMessages: FunctionReference<
        "action",
        "internal",
        {
          embedding?: Array<number>;
          embeddingModel?: string;
          limit: number;
          messageRange?: { after: number; before: number };
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          textSearch?: boolean;
          threadId?: string;
          vectorScoreThreshold?: number;
          vectorSearch?: boolean;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      textSearch: FunctionReference<
        "query",
        "internal",
        {
          limit: number;
          searchAllMessagesForUserId?: string;
          targetMessageId?: string;
          text?: string;
          threadId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>
      >;
      updateMessage: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          patch: {
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerOptions?: Record<string, Record<string, any>>;
            status?: "pending" | "success" | "failed";
          };
        },
        {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }
      >;
    };
    streams: {
      abort: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          reason: string;
          streamId: string;
        },
        boolean
      >;
      abortByOrder: FunctionReference<
        "mutation",
        "internal",
        { order: number; reason: string; threadId: string },
        boolean
      >;
      addDelta: FunctionReference<
        "mutation",
        "internal",
        { end: number; parts: Array<any>; start: number; streamId: string },
        boolean
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          stepOrder: number;
          threadId: string;
          userId?: string;
        },
        string
      >;
      deleteAllStreamsForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        { deltaCursor?: string; streamOrder?: number; threadId: string },
        { deltaCursor?: string; isDone: boolean; streamOrder?: number }
      >;
      deleteAllStreamsForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { threadId: string },
        null
      >;
      deleteStreamAsync: FunctionReference<
        "mutation",
        "internal",
        { cursor?: string; streamId: string },
        null
      >;
      deleteStreamSync: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      finish: FunctionReference<
        "mutation",
        "internal",
        {
          finalDelta?: {
            end: number;
            parts: Array<any>;
            start: number;
            streamId: string;
          };
          streamId: string;
        },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        { streamId: string },
        null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          startOrder?: number;
          statuses?: Array<"streaming" | "finished" | "aborted">;
          threadId: string;
        },
        Array<{
          agentName?: string;
          format?: "UIMessageChunk" | "TextStreamPart";
          model?: string;
          order: number;
          provider?: string;
          providerOptions?: Record<string, Record<string, any>>;
          status: "streaming" | "finished" | "aborted";
          stepOrder: number;
          streamId: string;
          userId?: string;
        }>
      >;
      listDeltas: FunctionReference<
        "query",
        "internal",
        {
          cursors: Array<{ cursor: number; streamId: string }>;
          threadId: string;
        },
        Array<{
          end: number;
          parts: Array<any>;
          start: number;
          streamId: string;
        }>
      >;
    };
    threads: {
      createThread: FunctionReference<
        "mutation",
        "internal",
        {
          defaultSystemPrompt?: string;
          parentThreadIds?: Array<string>;
          summary?: string;
          title?: string;
          userId?: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
      deleteAllForThreadIdAsync: FunctionReference<
        "mutation",
        "internal",
        {
          cursor?: string;
          deltaCursor?: string;
          limit?: number;
          messagesDone?: boolean;
          streamOrder?: number;
          streamsDone?: boolean;
          threadId: string;
        },
        { isDone: boolean }
      >;
      deleteAllForThreadIdSync: FunctionReference<
        "action",
        "internal",
        { limit?: number; threadId: string },
        null
      >;
      getThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        } | null
      >;
      listThreadsByUserId: FunctionReference<
        "query",
        "internal",
        {
          order?: "asc" | "desc";
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          userId?: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            status: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      searchThreadTitles: FunctionReference<
        "query",
        "internal",
        { limit: number; query: string; userId?: string | null },
        Array<{
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }>
      >;
      updateThread: FunctionReference<
        "mutation",
        "internal",
        {
          patch: {
            status?: "active" | "archived";
            summary?: string;
            title?: string;
            userId?: string;
          };
          threadId: string;
        },
        {
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }
      >;
    };
    users: {
      deleteAllForUserId: FunctionReference<
        "action",
        "internal",
        { userId: string },
        null
      >;
      deleteAllForUserIdAsync: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        boolean
      >;
      listUsersWithThreads: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<string>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
    vector: {
      index: {
        deleteBatch: FunctionReference<
          "mutation",
          "internal",
          {
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
          },
          null
        >;
        deleteBatchForThread: FunctionReference<
          "mutation",
          "internal",
          {
            cursor?: string;
            limit: number;
            model: string;
            threadId: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          { continueCursor: string; isDone: boolean }
        >;
        insertBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            vectors: Array<{
              messageId?: string;
              model: string;
              table: string;
              threadId?: string;
              userId?: string;
              vector: Array<number>;
            }>;
          },
          Array<
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
          >
        >;
        paginate: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            limit: number;
            table?: string;
            targetModel: string;
            vectorDimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
          },
          {
            continueCursor: string;
            ids: Array<
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
            >;
            isDone: boolean;
          }
        >;
        updateBatch: FunctionReference<
          "mutation",
          "internal",
          {
            vectors: Array<{
              id:
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string
                | string;
              model: string;
              vector: Array<number>;
            }>;
          },
          null
        >;
      };
    };
  };
  workpool: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        {
          before?: number;
          limit?: number;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism: number;
          };
          fnArgs: any;
          fnHandle: string;
          fnName: string;
          fnType: "action" | "mutation" | "query";
          onComplete?: { context?: any; fnHandle: string };
          retryBehavior?: {
            base: number;
            initialBackoffMs: number;
            maxAttempts: number;
          };
          runAt: number;
        },
        string
      >;
      enqueueBatch: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism: number;
          };
          items: Array<{
            fnArgs: any;
            fnHandle: string;
            fnName: string;
            fnType: "action" | "mutation" | "query";
            onComplete?: { context?: any; fnHandle: string };
            retryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            runAt: number;
          }>;
        },
        Array<string>
      >;
      status: FunctionReference<
        "query",
        "internal",
        { id: string },
        | { previousAttempts: number; state: "pending" }
        | { previousAttempts: number; state: "running" }
        | { state: "finished" }
      >;
      statusBatch: FunctionReference<
        "query",
        "internal",
        { ids: Array<string> },
        Array<
          | { previousAttempts: number; state: "pending" }
          | { previousAttempts: number; state: "running" }
          | { state: "finished" }
        >
      >;
    };
  };
  workflow: {
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startSteps: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          steps: Array<{
            retry?:
              | boolean
              | { base: number; initialBackoffMs: number; maxAttempts: number };
            schedulerOptions?: { runAt?: number } | { runAfter?: number };
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
          }>;
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        Array<{
          _creationTime: number;
          _id: string;
          step: {
            args: any;
            argsSize: number;
            completedAt?: number;
            functionType: "query" | "mutation" | "action";
            handle: string;
            inProgress: boolean;
            name: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            workId?: string;
          };
          stepNumber: number;
          workflowId: string;
        }>
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          startAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
    };
  };
  rag: {
    chunks: {
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          chunks: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entryId: string;
          startOrder: number;
        },
        { status: "pending" | "ready" | "replaced" }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          entryId: string;
          order: "desc" | "asc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            metadata?: Record<string, any>;
            order: number;
            state: "pending" | "ready" | "replaced";
            text: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      replaceChunksPage: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        { nextStartOrder: number; status: "pending" | "ready" | "replaced" }
      >;
    };
    entries: {
      add: FunctionReference<
        "mutation",
        "internal",
        {
          allChunks?: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        {
          created: boolean;
          entryId: string;
          status: "pending" | "ready" | "replaced";
        }
      >;
      addAsync: FunctionReference<
        "mutation",
        "internal",
        {
          chunker: string;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        { created: boolean; entryId: string; status: "pending" | "ready" }
      >;
      deleteAsync: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        null
      >;
      deleteByKeyAsync: FunctionReference<
        "mutation",
        "internal",
        { beforeVersion?: number; key: string; namespaceId: string },
        null
      >;
      deleteByKeySync: FunctionReference<
        "action",
        "internal",
        { key: string; namespaceId: string },
        null
      >;
      deleteSync: FunctionReference<
        "action",
        "internal",
        { entryId: string },
        null
      >;
      findByContentHash: FunctionReference<
        "query",
        "internal",
        {
          contentHash: string;
          dimension: number;
          filterNames: Array<string>;
          key: string;
          modelId: string;
          namespace: string;
        },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      get: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          namespaceId?: string;
          order?: "desc" | "asc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        {
          replacedEntry: {
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          } | null;
        }
      >;
    };
    namespaces: {
      deleteNamespace: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          deletedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
      deleteNamespaceSync: FunctionReference<
        "action",
        "internal",
        { namespaceId: string },
        null
      >;
      get: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | {
          createdAt: number;
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          namespaceId: string;
          status: "pending" | "ready" | "replaced";
          version: number;
        }
      >;
      getOrCreate: FunctionReference<
        "mutation",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          onComplete?: string;
          status: "pending" | "ready";
        },
        { namespaceId: string; status: "pending" | "ready" }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listNamespaceVersions: FunctionReference<
        "query",
        "internal",
        {
          namespace: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      lookup: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | string
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          replacedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
    };
    search: {
      search: FunctionReference<
        "action",
        "internal",
        {
          chunkContext?: { after: number; before: number };
          embedding: Array<number>;
          filters: Array<{ name: string; value: any }>;
          limit: number;
          modelId: string;
          namespace: string;
          vectorScoreThreshold?: number;
        },
        {
          entries: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          results: Array<{
            content: Array<{ metadata?: Record<string, any>; text: string }>;
            entryId: string;
            order: number;
            score: number;
            startOrder: number;
          }>;
        }
      >;
    };
  };
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
  twilio: {
    messages: {
      create: FunctionReference<
        "action",
        "internal",
        {
          account_sid: string;
          auth_token: string;
          body: string;
          callback?: string;
          from: string;
          status_callback: string;
          to: string;
        },
        {
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }
      >;
      getByCounterparty: FunctionReference<
        "query",
        "internal",
        { account_sid: string; counterparty: string; limit?: number },
        Array<{
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }>
      >;
      getBySid: FunctionReference<
        "query",
        "internal",
        { account_sid: string; sid: string },
        {
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        } | null
      >;
      getFrom: FunctionReference<
        "query",
        "internal",
        { account_sid: string; from: string; limit?: number },
        Array<{
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }>
      >;
      getFromTwilioBySidAndInsert: FunctionReference<
        "action",
        "internal",
        {
          account_sid: string;
          auth_token: string;
          incomingMessageCallback?: string;
          sid: string;
        },
        {
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }
      >;
      getTo: FunctionReference<
        "query",
        "internal",
        { account_sid: string; limit?: number; to: string },
        Array<{
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }>
      >;
      list: FunctionReference<
        "query",
        "internal",
        { account_sid: string; limit?: number },
        Array<{
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }>
      >;
      listIncoming: FunctionReference<
        "query",
        "internal",
        { account_sid: string; limit?: number },
        Array<{
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }>
      >;
      listOutgoing: FunctionReference<
        "query",
        "internal",
        { account_sid: string; limit?: number },
        Array<{
          account_sid: string;
          api_version: string;
          body: string;
          counterparty?: string;
          date_created: string;
          date_sent: string | null;
          date_updated: string | null;
          direction: string;
          error_code: number | null;
          error_message: string | null;
          from: string;
          messaging_service_sid: string | null;
          num_media: string;
          num_segments: string;
          price: string | null;
          price_unit: string | null;
          rest?: any;
          sid: string;
          status: string;
          subresource_uris: { feedback?: string; media: string } | null;
          to: string;
          uri: string;
        }>
      >;
      updateStatus: FunctionReference<
        "mutation",
        "internal",
        { account_sid: string; sid: string; status: string },
        null
      >;
    };
    phone_numbers: {
      create: FunctionReference<
        "action",
        "internal",
        { account_sid: string; auth_token: string; number: string },
        any
      >;
      updateSmsUrl: FunctionReference<
        "action",
        "internal",
        {
          account_sid: string;
          auth_token: string;
          sid: string;
          sms_url: string;
        },
        any
      >;
    };
  };
  polar: {
    lib: {
      createProduct: FunctionReference<
        "mutation",
        "internal",
        {
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              modifiedAt: string | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "month" | "year" | null;
          };
        },
        any
      >;
      createSubscription: FunctionReference<
        "mutation",
        "internal",
        {
          subscription: {
            amount: number | null;
            cancelAtPeriodEnd: boolean;
            checkoutId: string | null;
            createdAt: string;
            currency: string | null;
            currentPeriodEnd: string | null;
            currentPeriodStart: string;
            customerCancellationComment?: string | null;
            customerCancellationReason?: string | null;
            customerId: string;
            endedAt: string | null;
            id: string;
            metadata: Record<string, any>;
            modifiedAt: string | null;
            priceId?: string;
            productId: string;
            recurringInterval: "month" | "year" | null;
            startedAt: string | null;
            status: string;
          };
        },
        any
      >;
      getCurrentSubscription: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              modifiedAt: string | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "month" | "year" | null;
          };
          productId: string;
          recurringInterval: "month" | "year" | null;
          startedAt: string | null;
          status: string;
        } | null
      >;
      getCustomerByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        { id: string; metadata?: Record<string, any>; userId: string } | null
      >;
      getProduct: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          createdAt: string;
          description: string | null;
          id: string;
          isArchived: boolean;
          isRecurring: boolean;
          medias: Array<{
            checksumEtag: string | null;
            checksumSha256Base64: string | null;
            checksumSha256Hex: string | null;
            createdAt: string;
            id: string;
            isUploaded: boolean;
            lastModifiedAt: string | null;
            mimeType: string;
            name: string;
            organizationId: string;
            path: string;
            publicUrl: string;
            service?: string;
            size: number;
            sizeReadable: string;
            storageVersion: string | null;
            version: string | null;
          }>;
          metadata?: Record<string, any>;
          modifiedAt: string | null;
          name: string;
          organizationId: string;
          prices: Array<{
            amountType?: string;
            createdAt: string;
            id: string;
            isArchived: boolean;
            modifiedAt: string | null;
            priceAmount?: number;
            priceCurrency?: string;
            productId: string;
            recurringInterval?: "month" | "year" | null;
            type?: string;
          }>;
          recurringInterval?: "month" | "year" | null;
        } | null
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          productId: string;
          recurringInterval: "month" | "year" | null;
          startedAt: string | null;
          status: string;
        } | null
      >;
      insertCustomer: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: Record<string, any>; userId: string },
        string
      >;
      listCustomerSubscriptions: FunctionReference<
        "query",
        "internal",
        { customerId: string },
        Array<{
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          productId: string;
          recurringInterval: "month" | "year" | null;
          startedAt: string | null;
          status: string;
        }>
      >;
      listProducts: FunctionReference<
        "query",
        "internal",
        { includeArchived?: boolean },
        Array<{
          createdAt: string;
          description: string | null;
          id: string;
          isArchived: boolean;
          isRecurring: boolean;
          medias: Array<{
            checksumEtag: string | null;
            checksumSha256Base64: string | null;
            checksumSha256Hex: string | null;
            createdAt: string;
            id: string;
            isUploaded: boolean;
            lastModifiedAt: string | null;
            mimeType: string;
            name: string;
            organizationId: string;
            path: string;
            publicUrl: string;
            service?: string;
            size: number;
            sizeReadable: string;
            storageVersion: string | null;
            version: string | null;
          }>;
          metadata?: Record<string, any>;
          modifiedAt: string | null;
          name: string;
          organizationId: string;
          priceAmount?: number;
          prices: Array<{
            amountType?: string;
            createdAt: string;
            id: string;
            isArchived: boolean;
            modifiedAt: string | null;
            priceAmount?: number;
            priceCurrency?: string;
            productId: string;
            recurringInterval?: "month" | "year" | null;
            type?: string;
          }>;
          recurringInterval?: "month" | "year" | null;
        }>
      >;
      listUserSubscriptions: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amount: number | null;
          cancelAtPeriodEnd: boolean;
          checkoutId: string | null;
          createdAt: string;
          currency: string | null;
          currentPeriodEnd: string | null;
          currentPeriodStart: string;
          customerCancellationComment?: string | null;
          customerCancellationReason?: string | null;
          customerId: string;
          endedAt: string | null;
          id: string;
          metadata: Record<string, any>;
          modifiedAt: string | null;
          priceId?: string;
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              modifiedAt: string | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "month" | "year" | null;
          } | null;
          productId: string;
          recurringInterval: "month" | "year" | null;
          startedAt: string | null;
          status: string;
        }>
      >;
      syncProducts: FunctionReference<
        "action",
        "internal",
        { polarAccessToken: string; server: "sandbox" | "production" },
        any
      >;
      updateProduct: FunctionReference<
        "mutation",
        "internal",
        {
          product: {
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              modifiedAt: string | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "month" | "year" | null;
          };
        },
        any
      >;
      updateProducts: FunctionReference<
        "mutation",
        "internal",
        {
          polarAccessToken: string;
          products: Array<{
            createdAt: string;
            description: string | null;
            id: string;
            isArchived: boolean;
            isRecurring: boolean;
            medias: Array<{
              checksumEtag: string | null;
              checksumSha256Base64: string | null;
              checksumSha256Hex: string | null;
              createdAt: string;
              id: string;
              isUploaded: boolean;
              lastModifiedAt: string | null;
              mimeType: string;
              name: string;
              organizationId: string;
              path: string;
              publicUrl: string;
              service?: string;
              size: number;
              sizeReadable: string;
              storageVersion: string | null;
              version: string | null;
            }>;
            metadata?: Record<string, any>;
            modifiedAt: string | null;
            name: string;
            organizationId: string;
            prices: Array<{
              amountType?: string;
              createdAt: string;
              id: string;
              isArchived: boolean;
              modifiedAt: string | null;
              priceAmount?: number;
              priceCurrency?: string;
              productId: string;
              recurringInterval?: "month" | "year" | null;
              type?: string;
            }>;
            recurringInterval?: "month" | "year" | null;
          }>;
        },
        any
      >;
      updateSubscription: FunctionReference<
        "mutation",
        "internal",
        {
          subscription: {
            amount: number | null;
            cancelAtPeriodEnd: boolean;
            checkoutId: string | null;
            createdAt: string;
            currency: string | null;
            currentPeriodEnd: string | null;
            currentPeriodStart: string;
            customerCancellationComment?: string | null;
            customerCancellationReason?: string | null;
            customerId: string;
            endedAt: string | null;
            id: string;
            metadata: Record<string, any>;
            modifiedAt: string | null;
            priceId?: string;
            productId: string;
            recurringInterval: "month" | "year" | null;
            startedAt: string | null;
            status: string;
          };
        },
        any
      >;
      upsertCustomer: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: Record<string, any>; userId: string },
        string
      >;
    };
  };
  ossStats: {
    github: {
      getGithubOwners: FunctionReference<
        "query",
        "internal",
        { owners: Array<string> },
        Array<null | {
          contributorCount: number;
          dependentCount: number;
          dependentCountPrevious?: { count: number; updatedAt: number };
          dependentCountUpdatedAt?: number;
          name: string;
          nameNormalized: string;
          starCount: number;
          updatedAt: number;
        }>
      >;
      getGithubRepo: FunctionReference<
        "query",
        "internal",
        { name: string },
        null | {
          contributorCount: number;
          dependentCount: number;
          dependentCountPrevious?: { count: number; updatedAt: number };
          dependentCountUpdatedAt?: number;
          name: string;
          nameNormalized: string;
          owner: string;
          ownerNormalized: string;
          starCount: number;
          updatedAt: number;
        }
      >;
      getGithubRepos: FunctionReference<
        "query",
        "internal",
        { names: Array<string> },
        Array<null | {
          contributorCount: number;
          dependentCount: number;
          dependentCountPrevious?: { count: number; updatedAt: number };
          dependentCountUpdatedAt?: number;
          name: string;
          nameNormalized: string;
          owner: string;
          ownerNormalized: string;
          starCount: number;
          updatedAt: number;
        }>
      >;
      updateGithubOwner: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        any
      >;
      updateGithubOwnerStats: FunctionReference<
        "action",
        "internal",
        { githubAccessToken: string; owner: string; page?: number },
        any
      >;
      updateGithubRepos: FunctionReference<
        "mutation",
        "internal",
        {
          repos: Array<{
            contributorCount: number;
            dependentCount: number;
            name: string;
            owner: string;
            starCount: number;
          }>;
        },
        any
      >;
      updateGithubRepoStars: FunctionReference<
        "mutation",
        "internal",
        { name: string; owner: string; starCount: number },
        any
      >;
      updateGithubRepoStats: FunctionReference<
        "action",
        "internal",
        { githubAccessToken: string; repo: string },
        any
      >;
    };
    lib: {
      clearAndSync: FunctionReference<
        "action",
        "internal",
        {
          githubAccessToken: string;
          githubOwners?: Array<string>;
          githubRepos?: Array<string>;
          minStars?: number;
          npmOrgs?: Array<string>;
          npmPackages?: Array<string>;
        },
        any
      >;
      clearPage: FunctionReference<
        "mutation",
        "internal",
        { tableName: "githubRepos" | "npmPackages" },
        { isDone: boolean }
      >;
      clearTable: FunctionReference<
        "action",
        "internal",
        { tableName: "githubRepos" | "npmPackages" },
        null
      >;
      sync: FunctionReference<
        "action",
        "internal",
        {
          githubAccessToken: string;
          githubOwners?: Array<string>;
          githubRepos?: Array<string>;
          minStars?: number;
          npmOrgs?: Array<string>;
          npmPackages?: Array<string>;
        },
        null
      >;
    };
    npm: {
      getNpmOrgs: FunctionReference<
        "query",
        "internal",
        { names: Array<string> },
        Array<null | {
          dayOfWeekAverages: Array<number>;
          downloadCount: number;
          downloadCountUpdatedAt: number;
          name: string;
          updatedAt: number;
        }>
      >;
      getNpmPackage: FunctionReference<
        "query",
        "internal",
        { name: string },
        null | {
          dayOfWeekAverages: Array<number>;
          downloadCount: number;
          downloadCountUpdatedAt?: number;
          name: string;
          org?: string;
          updatedAt: number;
        }
      >;
      getNpmPackages: FunctionReference<
        "query",
        "internal",
        { names: Array<string> },
        {
          dayOfWeekAverages: Array<number>;
          downloadCount: number;
          downloadCountUpdatedAt: number;
          updatedAt: number;
        }
      >;
      updateNpmOrg: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        any
      >;
      updateNpmOrgStats: FunctionReference<
        "action",
        "internal",
        { org: string; page?: number },
        any
      >;
      updateNpmPackage: FunctionReference<
        "mutation",
        "internal",
        {
          dayOfWeekAverages: Array<number>;
          downloadCount: number;
          name: string;
        },
        any
      >;
      updateNpmPackagesForOrg: FunctionReference<
        "mutation",
        "internal",
        {
          org: string;
          packages: Array<{
            dayOfWeekAverages: Array<number>;
            downloadCount: number;
            isNotFound?: boolean;
            name: string;
          }>;
        },
        any
      >;
      updateNpmPackageStats: FunctionReference<
        "action",
        "internal",
        { name: string },
        any
      >;
    };
  };
};
