@echo off
REM Start the Node.js server in a new window
start "Order Server" cmd /k "node server.js"
REM Wait a few seconds for the server to start
ping 127.0.0.1 -n 4 > nul
REM Open the default browser to the landing page
start "" http://localhost:3000/landing.html
