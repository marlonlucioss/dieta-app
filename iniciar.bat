@echo off
cd /d "C:\Users\marlo\Documents\dieta-app\server"
start /min "Dieta - Servidor" cmd /k "npm run dev"

cd /d "C:\Users\marlo\Documents\dieta-app\client"
start /min "Dieta - Cliente" cmd /k "npm run dev"

timeout /t 4 /nobreak > nul
start "" "http://localhost:5173"
