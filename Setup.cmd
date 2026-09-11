@echo off
title Internship Tracker - Setup
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js needs to be installed first.
  echo.
  echo   1. Go to https://nodejs.org
  echo   2. Click the big download button and run the installer
  echo   3. Double-click this Setup file again
  echo.
  pause
  exit /b 1
)

node "scripts\setup.mjs"
