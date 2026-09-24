# 📖 Guía de Contribución para Compañeros de Clase

¡Bienvenido al proyecto colaborativo del **Bingo del Profe y Periódico de Clase**!

Aquí tienes el flujo de trabajo para añadir tus propias noticias usando Git y tu editor con IA (Antigravity, Codex, Cursor o Claude Code).

---

## 🚀 Flujo de Trabajo en 4 Pasos

### 1. Clona el repositorio y actualiza
```bash
git pull origin main
```

### 2. Pídele a tu IA que cree la noticia
Dile a tu asistente de IA (en Antigravity, Cursor, Codex o Claude):
> *"Revisa el archivo AGENTS.md y créame una nueva noticia cómica sobre [tema que quieras] usando la plantilla de noticias/_plantilla/. Recuerda registrarla también en noticias/principal.html."*

Tu IA creará la carpeta con el HTML, la foto y añadirá la tarjeta en la portada automáticamente sin que tengas que programar nada a mano.

### 3. Prueba que se vea bien
Abre `noticias/principal.html` en tu navegador para comprobar que tu noticia aparece en la portada y se puede leer correctamente.

### 4. Haz commit y súbelo a GitHub
```bash
git add .
git commit -m "feat: añadida noticia sobre [tu tema]"
git push origin main
```

---

## 🔄 ¿Cómo se actualiza la web del servidor en directo?
En la web del Bingo y en la portada de Noticias hay un botón que dice **`🔄 Sincronizar Noticias (Git Pull)`**.
Al pulsarlo, el servidor descarga automáticamente los cambios que hayas subido a GitHub sin necesidad de reiniciar la web ni tocar la consola.
