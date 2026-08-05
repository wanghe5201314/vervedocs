@echo off
setlocal enabledelayedexpansion

set "INSTANCE_COUNT=%~1"
if "%INSTANCE_COUNT%"=="" set "INSTANCE_COUNT=2"

set "BASE_PORT=1235"
set "MONITOR_URL=http://localhost:9090"
set "MONGO_URI=mongodb://localhost:27017/docuflow"
set "MONGO_COLLECTION=docuFlow-document"
set "REDIS_URI=redis://localhost:6379"
set "INTERNAL_TOKEN=vervedocs-internal"

set "PROJECT_DIR=%~dp0.."
set "DIST_DIR=%PROJECT_DIR%\dist"
set "NM_DIR=%PROJECT_DIR%\node_modules"

echo ============================================
echo  VerveDocs Collaboration Server Cluster
echo  Instances: %INSTANCE_COUNT%
echo  Base Port : %BASE_PORT%
echo ============================================
echo.

echo Step 1/3: Building...
cd /d "%PROJECT_DIR%"
call npm run build 2>nul
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build done.
echo.

echo Step 2/3: Preparing instance dirs...
for /l %%i in (1,1,%INSTANCE_COUNT%) do (
    set "SDIR=%~dp0server%%i"
    if not exist "!SDIR!\dist" mkdir "!SDIR!\dist"
    xcopy /e /y /q "%DIST_DIR%\*" "!SDIR!\dist\" >nul
    copy /y "%PROJECT_DIR%\package.json" "!SDIR%\" >nul 2>&1
    if not exist "!SDIR!\node_modules" (
        mklink /D "!SDIR!\node_modules" "%NM_DIR%" >nul 2>&1
    )
    set /a "PORT=BASE_PORT+%%i-1"
    echo PORT=!PORT!> "!SDIR!\.env"
    echo MONGO_URI=%MONGO_URI%>> "!SDIR!\.env"
    echo MONGO_COLLECTION=%MONGO_COLLECTION%>> "!SDIR!\.env"
    echo REDIS_URI=%REDIS_URI%>> "!SDIR!\.env"
    echo MONITOR_URL=%MONITOR_URL%>> "!SDIR!\.env"
    echo INSTANCE_URL=http://localhost:!PORT!>> "!SDIR!\.env"
    echo INTERNAL_TOKEN=%INTERNAL_TOKEN%>> "!SDIR!\.env"
    echo   server%%i port=!PORT!
)
echo.

echo Step 3/3: Starting instances...
for /l %%i in (1,1,%INSTANCE_COUNT%) do (
    set "SDIR=%~dp0server%%i"
    set /a "PORT=BASE_PORT+%%i-1"
    start "VerveDocs-%%i" /d "!SDIR!" node dist/index.js
    echo   started server%%i on port !PORT!
)
echo.

set /a "END_PORT=BASE_PORT+INSTANCE_COUNT-1"
echo ============================================
echo  All instances started!
echo  Ports: %BASE_PORT% - %END_PORT%
echo  Stop:  cluster\stop.bat
echo ============================================
pause
