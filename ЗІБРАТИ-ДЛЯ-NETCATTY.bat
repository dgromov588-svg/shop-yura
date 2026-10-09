@echo off
REM ==================================================================
REM  ЗАЛИВКА ЧЕРЕЗ NETCATTY
REM
REM  Подвійний клік. Програма:
REM    1. перевірить програми (поставить Node.js, якщо немає)
REM    2. збере сайт
REM    3. покладе в папку ДЛЯ-NETCATTY два файли і відкриє її
REM
REM  Далі в Netcatty: перетягнути обидва файли в домашню папку
REM  сервера і виконати в терміналі:  bash ~/antikvar.sh unpack
REM ==================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Збірка для Netcatty

where node >nul 2>nul && goto :havenode
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
  goto :havenode
)
echo ^> Встановлюю Node.js (програма для збірки сайту)...
where winget >nul 2>nul || goto :nonode
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul || goto :nonode

:havenode
node deploy.mjs --pack %*
echo.
pause
exit /b

:nonode
echo.
echo [!] Не вдалося встановити Node.js автоматично.
echo     Завантажте версію LTS з https://nodejs.org, встановіть
echo     і запустіть ЗІБРАТИ-ДЛЯ-NETCATTY.bat ще раз.
start "" https://nodejs.org/uk/download
echo.
pause
exit /b 1
