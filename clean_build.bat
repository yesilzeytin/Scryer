@echo off
echo Cleaning Scryer build artifacts...

echo Cleaning frontend artifacts...
if exist "frontend\out" rmdir /s /q "frontend\out"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
if exist "frontend\.vite" rmdir /s /q "frontend\.vite"
if exist "frontend\build" rmdir /s /q "frontend\build"

echo Cleaning python cache...
if exist "backend\__pycache__" rmdir /s /q "backend\__pycache__"
if exist "backend\.pytest_cache" rmdir /s /q "backend\.pytest_cache"

:: Optionally remove node_modules or venv by passing "all"
if "%1"=="all" (
    echo Wiping dependencies...
    if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
    if exist "backend\venv" rmdir /s /q "backend\venv"
    if exist "backend\.venv" rmdir /s /q "backend\.venv"
)

echo Clean complete.
