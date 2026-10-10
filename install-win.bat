@echo off
REM Installs the Figma Bridge panel for After Effects and Illustrator (Windows)
set DEST=%APPDATA%\Adobe\CEP\extensions\com.figmabridge.panel
if exist "%DEST%" rmdir /s /q "%DEST%"
xcopy /E /I /Y "%~dp0bridge-panel" "%DEST%" >nul

REM Allow unsigned panels
for %%v in (9 10 11 12 13) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

echo Installed.
echo Restart After Effects / Illustrator, then open Window ^> Extensions ^> Figma Bridge.
pause
