@echo off
REM ==================================================================
REM  КРОК 1 · ВСТАНОВЛЕННЯ (один раз)
REM
REM  Подвійний клік. Програма сама:
REM    • встановить Node.js, якщо його немає
REM    • збере сайт і залле його на хостинг
REM    • налаштує базу даних і покаже код входу в адмінку
REM    • створить ярлик «Залити сайт АнтикварЪ» на робочому столі
REM ==================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Крок 1 · Встановлення

echo.
echo ==================================================
echo   КРОК 1 · ВСТАНОВЛЕННЯ
echo ==================================================
echo.

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
node deploy.mjs --setup %*
set "RESULT=%ERRORLEVEL%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dir = '%~dp0'; $desk = [Environment]::GetFolderPath('Desktop'); $sh = New-Object -ComObject WScript.Shell;" ^
  "$l = $sh.CreateShortcut((Join-Path $desk 'Залити сайт АнтикварЪ.lnk')); $l.TargetPath = (Join-Path $dir '2-ЗАЛИТИ-САЙТ.bat'); $l.WorkingDirectory = $dir; $l.Save()" ^
  && echo   На робочому столі зʼявився ярлик «Залити сайт АнтикварЪ»

echo.
if "%RESULT%"=="0" (
  echo ==================================================
  echo   ВСТАНОВЛЕННЯ ЗАВЕРШЕНО
  echo   Далі: змінили сайт — запустіть 2-ЗАЛИТИ-САЙТ.bat
  echo ==================================================
) else (
  echo [!] Щось пішло не так — прочитайте повідомлення вище,
  echo     виправте і запустіть 1-ВСТАНОВИТИ.bat ще раз.
)
goto :end

:nonode
echo.
echo [!] Не вдалося встановити Node.js автоматично.
echo     1. Відкриється сайт nodejs.org — завантажте версію LTS
echo     2. Встановіть її (Далі - Далі - Готово)
echo     3. Запустіть 1-ВСТАНОВИТИ.bat ще раз
start "" https://nodejs.org/uk/download

:end
echo.
pause
