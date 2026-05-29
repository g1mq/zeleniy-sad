@echo off
chcp 65001 >nul
cd /d "%~dp0app"
if not exist node_modules (
  echo Установка зависимостей...
  call npm install
)
if not exist "..\.env" (
  echo.
  echo [!] Создайте файл .env в корне проекта из .env.example
  echo     и укажите пароль PostgreSQL.
  echo.
)
echo.
echo Убедитесь, что PostgreSQL запущен и база green_garden создана.
echo Откройте: http://localhost:3847
echo.
start http://localhost:3847
node server.js
pause
