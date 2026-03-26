@echo off
REM startedge.bat - Open the Supermarket Item Locator in Microsoft Edge
setlocal
set "PROJECT_PATH=%~dp0index.html"
start msedge "%PROJECT_PATH%"
endlocal
