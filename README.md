# MDA · Mesa de Ayuda

Consola interna de la Mesa de Ayuda: una sola página estática (HTML + CSS + JS, sin build).
Diseñada por **Engineer M.** · Diseño basado en el skill [impeccable](https://github.com/pbakaus/impeccable).

## Secciones

| Sección | Qué hace |
|---|---|
| **Plantillas** (prioridad) | Generador de textos de seguimiento: *Del día*, *Reprogramación*, *Rechazo y cierre*. Valida campos, autocompleta desde el texto de TOA (FUERA DE TOA) y copia con un clic. |
| **Medidor** | Evaluadores separados: **HFC / coaxial** (estabilidad SNR + sparkline, U/S SNR > 28 dB, Upstream 36.1–52.9 dBmV) y **FTTH / fibra** (rango -6.1 a -24.9 dBm con margen de advertencia). |
| **Tabla temporal** | Tabla editable (agregar/quitar filas y columnas) + bloc de notas. Se guarda sola en el navegador (`localStorage`) y se exporta a JSON. |
| **TEPJ** | *Transferencia de Excel a JSON*: copia celdas en Excel y pégalas. Detecta tabulador / `;` / `,`, usa la primera fila como encabezado y muestra el JSON listo para copiar. No necesita subir archivos. |
| **Accesos** | Enlaces rápidos de la mesa (SIOP, TOA, Laraigo, 360, ODN, etc.). |

Se quitó del original: el login de 2 pasos, el candado de “Realizado por”, la pantalla de “sistema cerrado” y toda la integración con Google Sheets.

## Estructura

```
public/          ← lo que publica Netlify
  index.html
  styles.css
  app.js
  robots.txt
netlify.toml     ← publish = "public", cabeceras noindex / anti-iframe
.agents/skills/impeccable   ← skill de diseño (no se publica)
```

## Despliegue en Netlify

1. Netlify → *Add new site* → *Import from Git* → este repo.
2. Netlify lee `netlify.toml` solo (sin comando de build; carpeta `public`).

## Clave de acceso (temporal)

La app abre con una puerta de acceso. Clave por defecto: **`mda2026`**.
Para cambiarla, edita `APP_PASSWORD` al inicio de `public/app.js`.

> ⚠️ Esa puerta funciona en el navegador: sirve para pruebas con pocos usuarios, pero
> quien abra el código fuente puede ver la clave. Para proteger el sitio de verdad, activa
> **Site configuration → Access & security → Password protection** en Netlify
> (pide la clave antes de entregar cualquier archivo).

## Datos

Todo queda en el navegador de cada usuario (`localStorage` / `sessionStorage`). No se envía nada a ningún servidor.
