@echo off
setlocal

cd /d "%~dp0"

start "LRU SHOP Backend" cmd /k "cd /d backend && npm start"
start "LRU SHOP Frontend" cmd /k "cd /d frontend && npm start"

endlocal
