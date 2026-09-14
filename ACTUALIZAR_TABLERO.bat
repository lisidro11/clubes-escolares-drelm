@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Actualizar Tablero - Clubes Escolares 2026
cd /d "%~dp0"

echo ============================================================
echo CLUBES ESCOLARES 2026 - ACTUALIZACION DEL TABLERO
echo ============================================================
echo.

if not exist "config" mkdir "config"
for /f %%D in ('powershell -NoProfile -Command "Get-Date -Format dd/MM/yyyy"') do set "HOY=%%D"
set "CORTE_ANT=!HOY!"
if exist "config\fecha_corte.txt" set /p CORTE_ANT=<"config\fecha_corte.txt"

set "CORTE="
set /p "CORTE=Fecha de corte [!CORTE_ANT!]: "
if "!CORTE!"=="" set "CORTE=!CORTE_ANT!"
>"config\fecha_corte.txt" echo !CORTE!

set "EXCEL="
for /f "delims=" %%F in ('dir /b /a-d /o-d "input\*.xlsx" 2^>nul') do (
  echo %%F | findstr /I /C:"Redes Educativas" >nul
  if errorlevel 1 if not defined EXCEL set "EXCEL=input\%%F"
)
if not defined EXCEL (
 echo [ERROR] No se encontro el Excel principal dentro de input.
 goto :error
)

set "REI="
if exist "input\Redes Educativas.xlsx" set "REI=input\Redes Educativas.xlsx"

echo.
echo Excel principal: "!EXCEL!"
if defined REI (echo Redes Educativas: "!REI!") else (echo Redes Educativas: NO ENCONTRADO - se publicara sin filtro REI)
echo Fecha de corte: !CORTE!
echo.
choice /C SN /N /M "Continuar? [S/N]: "
if errorlevel 2 goto :cancel

echo.
echo [1/4] Generando datos...
if defined REI (
 python "scripts\build_data.py" "!EXCEL!" --rei "!REI!" --corte "!CORTE!"
) else (
 python "scripts\build_data.py" "!EXCEL!" --corte "!CORTE!"
)
if errorlevel 1 goto :error

echo.
echo [2/4] Verificando que no se publique ningun Excel...
git status --short > "%TEMP%\clubes_git_status.txt"
findstr /I /R "\.xlsx$ \.xls$" "%TEMP%\clubes_git_status.txt" >nul
if not errorlevel 1 (
 echo [BLOQUEADO] Git detecta un Excel pendiente de publicacion:
 findstr /I /R "\.xlsx$ \.xls$" "%TEMP%\clubes_git_status.txt"
 goto :error
)
echo Seguridad OK.

echo.
echo [3/4] Creando actualizacion...
git add "data\clubes.json" "public\data\clubes.json" "config\fecha_corte.txt"
git diff --cached --quiet
if not errorlevel 1 (
 echo No existen cambios respecto al corte publicado.
 goto :success
)
git commit -m "Actualiza Clubes Escolares 2026 - corte !CORTE!"
if errorlevel 1 goto :error

echo.
echo [4/4] Publicando en GitHub...
git push origin main
if errorlevel 1 goto :error

:success
echo.
echo ============================================================
echo ACTUALIZACION COMPLETADA
echo ============================================================
echo Fecha de corte: !CORTE!
echo https://lisidro11.github.io/clubes-escolares-drelm/
echo Espere 1-2 minutos y presione Ctrl+F5.
pause
exit /b 0

:cancel
echo Actualizacion cancelada.
pause
exit /b 0

:error
echo.
echo PROCESO DETENIDO. Revise el mensaje anterior.
pause
exit /b 1
