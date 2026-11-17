@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0capture_incident.ps1" -Action Start
pause
