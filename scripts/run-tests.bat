@echo off
REM scripts/run-tests.bat
REM Comprehensive test runner for Windows

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo FastAgentPanel Test Suite
echo ==========================================
echo.

REM Check if CONVEX_DEPLOYMENT_URL is set
if "%CONVEX_DEPLOYMENT_URL%"=="" (
  echo Warning: CONVEX_DEPLOYMENT_URL not set
  echo Using default: http://localhost:3210
  set CONVEX_DEPLOYMENT_URL=http://localhost:3210
)

set FAILED_TESTS=0

REM Function to run tests
:run_tests
set test_type=%1
set pattern=%2

echo.
echo Running %test_type% tests...
echo Pattern: %pattern%
echo.

call npx vitest run --include "%pattern%" --reporter=verbose
if errorlevel 1 (
  echo X %test_type% tests failed
  set /a FAILED_TESTS=!FAILED_TESTS!+1
  goto :continue_tests
) else (
  echo + %test_type% tests passed
)

:continue_tests
exit /b 0

REM ===== UNIT TESTS =====
echo.
echo === UNIT TESTS ===
echo.

echo Running Media Extractor tests...
call npx vitest run --include "**/__tests__/mediaExtractor.test.ts" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

REM ===== COMPONENT TESTS =====
echo.
echo === COMPONENT TESTS ===
echo.

echo Running VideoCard tests...
call npx vitest run --include "**/__tests__/VideoCard.test.tsx" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

echo Running SourceCard tests...
call npx vitest run --include "**/__tests__/SourceCard.test.tsx" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

echo Running ProfileCard tests...
call npx vitest run --include "**/__tests__/ProfileCard.test.tsx" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

REM ===== INTEGRATION TESTS =====
echo.
echo === INTEGRATION TESTS ===
echo.

echo Running Message Rendering tests...
call npx vitest run --include "**/__tests__/message-rendering.test.tsx" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

echo Running Presentation Layer tests...
call npx vitest run --include "**/__tests__/presentation-layer.test.tsx" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

REM ===== E2E TESTS =====
echo.
echo === END-TO-END TESTS ===
echo.

echo Running Coordinator Agent E2E tests...
call npx vitest run --include "convex/agents/__tests__/e2e-coordinator-agent.test.ts" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

echo Running Streaming Agent E2E tests...
call npx vitest run --include "convex/agents/__tests__/e2e-streaming.test.ts" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

echo Running Agent UI Integration E2E tests...
call npx vitest run --include "src/components/FastAgentPanel/__tests__/e2e-agent-ui.test.tsx" --reporter=verbose
if errorlevel 1 set /a FAILED_TESTS=!FAILED_TESTS!+1

REM ===== COVERAGE REPORT =====
echo.
echo === COVERAGE REPORT ===
echo.

call npx vitest run --coverage --reporter=verbose

REM ===== SUMMARY =====
echo.
echo ==========================================
echo Test Summary
echo ==========================================
echo.

if %FAILED_TESTS% equ 0 (
  echo + All tests passed!
  exit /b 0
) else (
  echo X %FAILED_TESTS% test suites failed
  exit /b 1
)

