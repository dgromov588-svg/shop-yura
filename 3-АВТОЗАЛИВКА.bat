@echo off
REM ==================================================================
REM  КРОК 3 · АВТОЗАЛИВКА (за бажанням)
REM  Поки це вікно відкрите, кожне збереження файлу в src\ чи public\
REM  за кілька секунд зʼявляється на сайті. Зупинити — закрити вікно.
REM ==================================================================
chcp 65001 >nul
cd /d "%~dp0"
title Крок 3 · Автозаливка (не закривайте вікно)
call :node || exit /b 1
node deploy.mjs --watch %*
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
