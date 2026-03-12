@echo off
REM DCF E2E Test Runner for Windows
REM This script starts all required services and runs the E2E test

echo.
echo ========================================
echo   DCF E2E Test Runner
echo ========================================
echo.
echo This will:
echo 1. Check prerequisites
echo 2. Guide you to start services
echo 3. Run the E2E test
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo ERROR: node_modules not found!
    echo Please run: npm install
    echo.
    pause
    exit /b 1
)

REM Check prerequisites
echo Step 1: Checking prerequisites...
echo.
call npm run test:e2e:check

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   Services Not Running
    echo ========================================
    echo.
    echo You need to start these services first:
    echo.
    echo Terminal 1: npx convex dev
    echo Terminal 2: npm run dev
    echo.
    echo Then run this script again.
    echo.
    echo Or manually run: npm run test:dcf
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   All Prerequisites Met!
echo ========================================
echo.
echo Starting E2E test in 3 seconds...
timeout /t 3 /nobreak > nul

echo.
echo Running test...
echo.
call npm run test:dcf

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   TEST PASSED!
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo   TEST FAILED
    echo ========================================
    echo.
    echo Check screenshots in: e2e-screenshots/
    echo Check video in: test-results/
    echo.
)

pause
