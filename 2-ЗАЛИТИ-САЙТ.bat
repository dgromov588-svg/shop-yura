@echo off
REM ==================================================================
REM  КРОК 2 · ЗАЛИТИ САЙТ (кожного разу після змін)
REM  Подвійний клік — сайт збереться і оновиться на хостингу.
REM ==================================================================
chcp 65001 >nul
cd /d "%~dp0"
title Крок 2 · Заливка сайту
call :node || exit /b 1
node deploy.mjs %*
echo.
pause
exit /b

:node
where node >nul 2>nul && exit /b 0
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%" & exit /b 0
echo.
echo [!] Спочатку запустіть 1-ВСТАНОВИТИ.bat
echo.
pause
exit /b 1
