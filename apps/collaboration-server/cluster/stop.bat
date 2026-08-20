@echo off
echo Stopping all VerveDocs instances...
taskkill /fi "WINDOWTITLE eq VerveDocs-*" /f >nul 2>&1
if errorlevel 1 (
    echo No running instances found.
) else (
    echo All instances stopped.
)
pause