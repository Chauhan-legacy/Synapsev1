@echo off
TITLE SYNAPSE - Universal Signal Intelligence Workbench
cd /d "%~dp0"
SET PYTHONPATH=%CD%
SET PYTHON_EXE=C:\Users\Priyansh\miniconda3\envs\synapse\python.exe

echo ===============================================================================
echo   Launching SYNAPSE Signal Intelligence Workbench
echo ===============================================================================

echo [1/2] Starting SYNAPSE API Gateway (port 8000)...
start "SYNAPSE API" "%PYTHON_EXE%" -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000

echo [2/2] Starting Vite Web Frontend...
cd apps\web
start "SYNAPSE Web" cmd /k "npm.cmd run dev"
cd ..

echo Opening browser...
timeout /t 3 >nul
start http://localhost:5173

