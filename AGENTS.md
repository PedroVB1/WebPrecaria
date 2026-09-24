# 🤖 Instrucciones para Agentes de IA (Codex, Antigravity, Claude, Cursor)

Este proyecto es una aplicación web colaborativa desarrollada por estudiantes de Ingeniería del Software. Combina un **Bingo multijugador con chat en tiempo real** y un **Portal de Noticias satíricas/cómicas de clase**.

Si eres un asistente o agente de IA trabajando en este repositorio, **sigue estrictamente esta guía** para redactar y publicar nuevas noticias.

---

## 📂 Estructura de la carpeta `noticias/`

```text
noticias/
├── principal.html                 <-- Portada principal donde se listan todas las noticias
├── css/
│   └── style.css                  <-- Estilos globales del periódico
├── _plantilla/
│   └── noticia-plantilla.html    <-- Plantilla base obligatoria para nuevos artículos
├── cabene05/                      <-- Ejemplo de sección existente
├── mason(feria)/                  <-- Ejemplo de sección existente
└── <tu-nueva-noticia>/            <-- Carpeta para la nueva noticia que crees
    ├── index.html (o noticia.html)
    └── foto.jpg
```

---

## 🛠️ Procedimiento para crear una nueva noticia (Paso a paso)

Cuando el usuario te pida crear una nueva noticia cómica:

### 1. Crear una subcarpeta
Crea una nueva carpeta dentro de `noticias/` con un nombre descriptivo en minúsculas (ejemplo: `noticias/examen-sorpresa/`).

### 2. Generar el archivo HTML del artículo
Copia la estructura de `noticias/_plantilla/noticia-plantilla.html` y colócala en tu nueva carpeta como `index.html`.
- Rellena el `<title>`, los titulares `<h1>`, los subtítulos y los párrafos con el contenido cómico.
- Asegúrate de que el enlace al CSS apunte a `../css/style.css`.
- Añade la imagen de la noticia en la misma carpeta y referénciala como `<img src="nombre_foto.jpg">`.
- El botón de vuelta debe apuntar a `../principal.html`.

### 3. Registrar la noticia en la Portada (`noticias/principal.html`)
Abre `noticias/principal.html` y añade una nueva tarjeta dentro del contenedor `<div class="news-grid">` con la siguiente estructura:

```html
<!-- Nueva Noticia Añadida -->
<article class="news-card">
  <a href="<carpeta>/index.html" class="news-image-wrapper">
    <span class="news-badge badge-youtube">🔴 CATEGORÍA</span>
    <img src="<carpeta>/nombre_foto.jpg" alt="Título descriptivo" loading="lazy">
  </a>
  <div class="news-body">
    <p class="news-title">Titular de la noticia aquí</p>
    <div class="news-footer">
      <span class="news-read-time">⏱️ 2 min de lectura</span>
      <a href="<carpeta>/index.html" class="btn-read-more">Leer reportaje <span>&rarr;</span></a>
    </div>
  </div>
</article>
```

---

## 🎨 Normas de Estilo y Diseño
- Mantén la coherencia visual con `noticias/css/style.css`.
- No deformes imágenes: usa `object-fit: cover` en los contenedores.
- Asegúrate de que todas las rutas relativas funcionen tanto desde `principal.html` como desde el subdirectorio.
- No borres ni modifiques las noticias previas de otros compañeros.
