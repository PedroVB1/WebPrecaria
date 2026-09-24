@echo off
title Bingo del Profe - Enlace Seguro Cloudflare (Sin IP visible)
echo ========================================================
echo   BINGO DEL PROFE - MULTIJUGADOR CON CLOUDFLARE
echo ========================================================
echo   Tu IP real NO se mostrara a nadie.
echo.
echo   1. Arrancando servidor del juego...
start /b node server.js
echo.
echo   2. Conectando tunel seguro de Cloudflare...
echo   (En unos segundos aparecera abajo tu enlace https://....trycloudflare.com)
echo   Copia ese enlace y mandalo por WhatsApp a tus amigos.
echo ========================================================
echo.
npx --yes cloudflared tunnel --url http://localhost:3000
pause
