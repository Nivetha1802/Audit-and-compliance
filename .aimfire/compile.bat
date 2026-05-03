@echo off
setlocal EnableExtensions EnableDelayedExpansion
set ROOT=%~dp0..
echo [AIMFIRE_COMPILE] Running auto-generated compile script (default)
echo [AIMFIRE_COMPILE] npm run build (cwd=frontend)
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 (
  popd
  exit /b 1
)
popd
exit /b 0