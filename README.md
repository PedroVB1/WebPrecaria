# Bingo del Profe + El Diario de Investigación

Aplicación web colaborativa de clase con dos partes:

1. **Bingo del Profe**: cartón de bingo con expresiones latinas y coloquiales del profesor, modo multijugador por salas, chat en tiempo real, sonidos, confeti y un modo camuflaje para disimular si el profesor se acerca.
2. **El Diario de Investigación**: portal de noticias satíricas donde cada compañero publica sus reportajes.

## Stack

- Node.js + Express (servidor estático y API)
- Socket.io (salas, chat y avisos en vivo)
- HTML, CSS y JavaScript vanilla (sin frameworks ni build)
- Túnel de Cloudflare opcional para compartir la partida con amigos

## Tecnologías del navegador que usa la app

- **PWA**: manifest + service worker con caché, instalable y jugable sin conexión
- **`<dialog>` nativo** para los modales (foco y tecla Escape gestionados por el navegador)
- **View Transitions API**: transición suave del cartón al barajar o cambiar de tamaño
- **Web Animations API**: reparto escalonado de las casillas al abrir
- **Web Audio API**: sonidos de sello y fanfarria sintetizados, sin archivos
- **Speech Synthesis**: el móvil canta "¡Bingo!" al ganar
- **Vibration API**: respuesta háptica al sellar y al cantar bingo
- **Web Share API**: compartir resultado con el panel nativo (fallback al portapapeles)
- **CSS moderno**: `:has()`, container queries, `@starting-style`, `color-mix()`, `prefers-reduced-motion`

## Requisitos

- Node.js 18 o superior
- npm

## Instalación y arranque

```bash
npm install
npm start
```

Abre `http://localhost:3000` para el Bingo y `http://localhost:3000/Noticias/principal.html` para el periódico.

En Windows también puedes hacer doble clic en `iniciar.bat`.

## Multijugador

1. Pulsa **"Unirse a sala / Conectar"**, elige apodo y un código de sala acordado en clase.
2. Todos los compañeros con el mismo código comparten chat y avisos de BINGO.
3. Para jugar con amigos fuera de tu red, pulsa **"Abrir enlace para amigos"**: el servidor levanta un túnel de Cloudflare y copias el enlace generado.

## Instalar como aplicación (PWA)

En Chrome o Edge aparece un botón **"Instalar app"** en la cabecera. Al instalarla se abre a pantalla completa y funciona sin conexión (el multijugador y el botón de sincronizar con GitHub siguen necesitando internet). También puedes probar el huevo de pascua: escribe `bingo` o haz doble toque en el título.

## Estructura

```text
/
├── index.html          Aplicación del Bingo
├── style.css           Estilos del Bingo
├── app.js              Lógica del juego, chat y multijugador
├── sw.js               Service worker (juego sin conexión)
├── manifest.webmanifest  Manifest de la PWA
├── icons/              Iconos de la app instalable
├── server.js           Servidor Express + Socket.io + túnel
├── favicon.svg         Icono compartido
└── Noticias/
    ├── principal.html  Portada del periódico
    ├── css/style.css   Estilos del periódico
    ├── _plantilla/     Plantilla obligatoria para nuevos artículos
    ├── cabene05/       Sección con identidad propia
    └── mason-feria/    Sección con identidad propia
```

## Crear una noticia nueva

Consulta `AGENTS.md` (guía para agentes de IA) o `CONTRIBUTING.md` (flujo para compañeros). Resumen: copiar `Noticias/_plantilla/noticia-plantilla.html` a una carpeta nueva como `index.html`, rellenar contenido y registrar la tarjeta en `Noticias/principal.html`.

## Reglas de estilo

- Sin emojis: los iconos son SVG en línea con `stroke="currentColor"`.
- Colores y tipografías siempre mediante variables CSS de `:root`.
- Sin estilos en línea nuevos ni dependencias adicionales.

## Licencia

Proyecto académico y de humor de clase. Úsalo con cariño y sin romper las noticias de tus compañeros.
