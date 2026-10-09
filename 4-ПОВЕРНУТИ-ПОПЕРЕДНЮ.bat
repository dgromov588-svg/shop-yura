@echo off
REM ==================================================================
REM  КРОК 4 · ПОВЕРНУТИ ПОПЕРЕДНЮ ВЕРСІЮ (якщо щось зламалось)
REM  Повертає сайт до стану перед останньою заливкою.
REM  Запустити ще раз — ще на одну заливку назад.
REM ==================================================================
chcp 65001 >nul
cd /d "%~dp0"
title Крок 4 · Повернення попередньої версії
call :node || exit /b 1
node deploy.mjs --rollback %*
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
