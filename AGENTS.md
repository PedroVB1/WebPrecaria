# Instrucciones para agentes de IA (Codex, Antigravity, Claude, Cursor)

Este proyecto es una aplicación web colaborativa desarrollada por estudiantes de Ingeniería del Software. Combina un **Bingo multijugador con chat en tiempo real** y un **portal de noticias satíricas de clase**.

Si eres un asistente o agente de IA trabajando en este repositorio, sigue estrictamente esta guía.

---

## Estructura del proyecto

```text
/
├── index.html                 <-- Aplicación del Bingo
├── style.css                  <-- Estilos del Bingo
├── app.js                     <-- Lógica del juego, chat y multijugador
├── server.js                  <-- Servidor Express + Socket.io + túnel Cloudflare
├── sw.js                      <-- Service worker (PWA offline)
├── manifest.webmanifest       <-- Manifest de la PWA
├── icons/                     <-- Iconos de la app instalable
├── favicon.svg                <-- Icono del sitio (compartido por todas las páginas)
└── Noticias/
    ├── principal.html         <-- Portada del periódico (listado de noticias)
    ├── css/
    │   └── style.css          <-- Estilos globales del periódico y de artículos
    ├── _plantilla/
    │   └── noticia-plantilla.html  <-- Plantilla base OBLIGATORIA para nuevos artículos
    ├── cabene05/              <-- Sección existente (identidad propia: css/cabene05.css)
    │   ├── index.html
    │   ├── incidentes.html
    │   └── css/cabene05.css
    └── mason-feria/           <-- Sección existente (identidad propia: css/mason.css)
        ├── elite-masonica.html
        └── css/mason.css
```

---

## Reglas de diseño (obligatorias)

1. **Prohibido usar emojis** en HTML, CSS, JS, mensajes de consola o documentación. Para iconos se usan **SVG en línea** (trazo, `stroke="currentColor"`, `aria-hidden="true"`), como los de `index.html` o `Noticias/_plantilla/noticia-plantilla.html`.
2. **Sin estilos en línea nuevos**: usa las clases existentes de `style.css` (Bingo) o de `Noticias/css/style.css` (periódico). Si falta una clase, añádela al CSS que corresponda.
3. **Tipografía y color**: se definen con variables CSS en `:root`. No introduzcas colores ni fuentes sueltas.
4. **Accesibilidad mínima**: `alt` en imágenes, un solo `<h1>` por página, `label` para campos, elementos nativos (`button`, `a`) y foco visible.
5. **Nada de nombres tipo** `prueba.html`, `final.html`, `nuevo.css` ni carpetas `cosas/`. Nombres en minúsculas y descriptivos.

---

## Procedimiento para crear una nueva noticia (paso a paso)

### 1. Crear una subcarpeta
Crea una carpeta dentro de `Noticias/` con un nombre descriptivo en minúsculas (ejemplo: `Noticias/examen-sorpresa/`).

### 2. Generar el archivo HTML del artículo
Copia la estructura de `Noticias/_plantilla/noticia-plantilla.html` y colócala en tu carpeta como `index.html`.
- Rellena `<title>`, `<meta name="description">`, el titular `<h1 class="article-title">`, el resumen `.article-lead` y el cuerpo `.article-body`.
- El enlace al CSS debe apuntar a `../css/style.css` y el favicon a `../../favicon.svg`.
- Guarda la foto en la misma carpeta y referénciala como `<img src="foto.jpg" ...>`.
- Si la sección va a tener varias noticias y una identidad visual propia, crea `css/<seccion>.css` siguiendo el ejemplo de `cabene05` o `mason-feria`.
- El botón de vuelta debe apuntar a `../principal.html`.

### 3. Registrar la noticia en la portada (`Noticias/principal.html`)
Añade una tarjeta dentro de `<div class="news-grid">`. La primera tarjeta es el reportaje principal (`.news-card.featured`, ocupa todo el ancho) y las demás son secundarias:

```html
<article class="news-card">
  <a href="<carpeta>/index.html" class="news-image-wrapper" aria-label="Leer la noticia sobre ...">
    <span class="news-badge badge-generic">Categoría</span>
    <img src="<carpeta>/foto.jpg" alt="Descripción de la imagen" loading="lazy">
  </a>
  <div class="news-body">
    <span class="news-kicker">Sección</span>
    <p class="news-title">Titular de la noticia</p>
    <p class="news-excerpt">Resumen breve de una o dos frases.</p>
    <div class="news-footer">
      <span class="news-read-time">
        <svg class="icon" ... reloj ...></svg>
        2 min de lectura
      </span>
      <a href="<carpeta>/index.html" class="btn-read-more">Leer reportaje</a>
    </div>
  </div>
</article>
```

### 4. Validar antes de dar por terminado
- Arranca el servidor: `npm start` y abre `http://localhost:3000/Noticias/principal.html`.
- Comprueba que la tarjeta aparece, la imagen carga y el artículo se lee bien en móvil (vista responsive del navegador).
- No dejes errores en la consola del navegador.

---

## Reglas que NO se deben romper

- No borres ni modifiques las noticias previas de otros compañeros.
- No cambies `server.js`, `app.js` ni el esquema de salas sin motivo.
- No añadas dependencias nuevas sin justificarlo; el proyecto solo usa `express` y `socket.io`.
- No rompas las rutas relativas: todas las páginas deben funcionar abriéndolas desde el servidor.
- No rompas la PWA: `manifest.webmanifest`, `sw.js` e `icons/` son parte de la app instalable. Si añades un archivo estático importante, añádelo a `PRECACHE_URLS` en `sw.js` y sube `CACHE_NAME`.
- No sustituyas los `<dialog>` nativos por divs ni re-introduzcas emojis en la interfaz.
