# Herramientas Web

Sitio de herramientas online gratuitas en español e inglés, hecho con [Astro](https://astro.build) y
componentes interactivos en Preact. Todo se procesa en el navegador: no hay servidor, base de datos
ni subida de archivos, así que en producción alcanza con servir la carpeta `dist/`.

## Uso local

```bash
npm install
npm run dev
```

Abre en http://localhost:4321 (español) y http://localhost:4321/en/ (inglés).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Genera el sitio estático en `dist/` |
| `npm run preview` | Sirve `dist/` para revisar el build final |
| `npm run check` | Chequeo de tipos de TypeScript y Astro |
| `npm run empaquetar` | Build + `herramientas-web.zip` listo para subir al VPS |

## Herramientas

| Categoría | Herramientas |
|---|---|
| Para vendedores | Calculadora de costos de Mercado Libre · Generador de SKU · Etiquetas de envío |
| Generadores | Códigos QR · Contraseñas · UUID |
| Calculadoras | Porcentajes · IVA · Conversor de unidades |
| Imágenes | Convertir a WebP · Comprimir · Redimensionar |
| PDF | Unir · Dividir · Imágenes a PDF |
| Texto y desarrollo | JSON · Base64 · Contador de palabras · Mayúsculas/minúsculas |

**Calculadora de Mercado Libre:** la API de comisiones de ML pide autenticación, así que las tarifas
(comisión Clásica/Premium y tramos del cargo fijo) son valores de referencia de agosto de 2026 que la
persona puede editar en «Tarifas de Mercado Libre». Los valores por defecto están en `DEFAULTS` dentro
de `src/tools/MlCalculator.tsx`: actualizarlos cuando ML cambie sus costos.

## Estructura

```
src/
  config.ts              Nombre del sitio e idiomas
  data/tools.ts          Registro de categorías y herramientas (nombres, slugs, textos SEO)
  i18n/ui.ts             Textos generales de la interfaz y helpers de rutas
  layouts/Base.astro     <head>, cabecera (buscador, idioma, tema) y pie
  views/                 Portada y página de herramienta (compartidas por ES y EN)
  pages/                 Rutas: /, /[herramienta]/, /en/, /en/[tool]/, 404
  components/            Tarjetas, buscador (Ctrl+K), íconos, ToolRenderer
  tools/                 Una isla Preact por herramienta (con sus textos ES/EN)
  tools/shared/          Campos, números en formato argentino, copiar, descargar, zip
  styles/global.css      Tokens de diseño (claro/oscuro) y componentes base
```

### Agregar una herramienta

1. Crear `src/tools/MiHerramienta.tsx` con `export default function MiHerramienta({ lang })`.
2. Registrarla en `src/data/tools.ts` (id, categoría, ícono, slug/nombre/descripción en ES y EN, pasos).
3. Sumarla en `src/components/ToolRenderer.astro` con `client:load`.
4. Si usa un ícono nuevo de `lucide-preact`, agregarlo en `src/components/icons.ts`.

## Publicar en el VPS (DonWeb / Ferozo)

El build es HTML/CSS/JS estático: convive con Reservalo y MELImetrics sin procesos ni puertos nuevos.

1. Dar de alta el dominio en el panel de Ferozo (idealmente como cuenta propia, como `melimet`) y
   esperar a que emita el certificado de Let's Encrypt.
2. Generar el paquete con el dominio real, para que las URL canónicas, el sitemap y los hreflang
   salgan bien:
   ```powershell
   $env:SITE_URL = "https://tudominio.com"; npm run empaquetar
   ```
3. Subir `herramientas-web.zip` por el panel (Mi Sitio Web → Subir mi sitio) y extraerlo en
   `public_html/`. El zip se arma con `tar.exe` para que las rutas usen `/`: el extractor del panel
   rechaza los zips de `Compress-Archive`.
4. Con HTTPS andando, descomentar la redirección a HTTPS en `public/.htaccess` y volver a publicar.

No conviene usar un subdominio de `reservalo.com.ar`: en ese VPS todos comparten
`/home/reserva/public_html` como docroot.
