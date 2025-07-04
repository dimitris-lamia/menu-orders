@echo off
REM Check for Node.js
where node >nul 2>nul || (
  echo Node.js is not installed. Please install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b
)
REM Check for npm
where npm >nul 2>nul || (
  echo npm is not installed. Please install Node.js (which includes npm) from https://nodejs.org/ and try again.
  pause
  exit /b
)

REM Install dependencies
npm install

REM Inform user
if %ERRORLEVEL%==0 (
  echo.
  echo Installation complete. You can now run the server with run_server.bat
) else (
  echo.
  echo There was a problem installing dependencies.
)
pause
