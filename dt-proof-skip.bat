@echo off
set CONVEX_DEPLOY_KEY=prod:agile-caribou-964|eyJ2MiI6Ijg5YmUwZDM4ZjFmNDQ4OWJiMzExZTU2YTU1MDUzZDQ2In0=
echo --- PATH 1: skip ---
npx.cmd convex run workflows/deepTrace:runEntityIntelligenceMission "{\"entityKey\":\"test-entity-001\",\"entityName\":\"TestCorp\",\"researchCell\":false}"
