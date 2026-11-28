# MDA · Mesa de Ayuda — v2

Consola estática (HTML + CSS + JS, sin dependencias) para agentes de seguimiento A365.
Se despliega en Netlify desde la carpeta `public/`. Autor: **Engineer M.**

## Qué hace

| Sección | Para qué sirve |
|---|---|
| **Plantillas** | Formulario a la izquierda (Contenido) y texto a la derecha (Generador). El texto se arma **al instante** con cada tecla, sin botones. |
| **Coaxial (HFC)** | Medidor compacto y libre, sin pedir SOT. Pegas lecturas SNR y da estable/inestable (umbral 4 dB), más chequeo de U/S SNR (>28 dB) y Upstream (36.1–52.9 dBmV). |
| **FTTH** | Botón en la barra superior que abre los rangos de potencia Rx (−6.1 a −24.9 dBm). |
| **Tablas rápidas** | Tablas editables (columnas y filas libres), búsqueda, marca de “revisado”, copia rápida y notas rápidas. Sirven para guardar SOTs que revisarás después. |
| **Enlaces** | Laraigo, AICC, TOA, Incógnito y ACS a un clic. **Todos los enlaces** abre el listado completo. |
| **Speechs** | Solo perfil especial. Ver más abajo. |

### Generador

- Los datos que faltan se marcan en amarillo dentro del texto y se listan en **Falta:**. Al copiar se eliminan las marcas y, si falta algo, pide confirmar con **Copiar igual**.
- **Tabulado / Horizontal**: el modo horizontal junta todo el texto en una sola línea, con los campos separados por ` | `. Sirve para sistemas que no aceptan saltos de línea ni tabulaciones.
- `Ctrl/⌘ + Enter` copia. **Nuevo caso** limpia el formulario y se puede deshacer desde el aviso.
- SOT, contactabilidad y demás campos comunes se mantienen al cambiar de plantilla.
- En las plantillas con TOA puedes pegar el texto de TOA y se rellenan SOT, distrito, fecha y franja.
- Categorías: **Seguimiento** (antes “Del día”), **Reprogramación** y **Rechazo y cierre**.

## Perfiles

| Perfil | Incluye |
|---|---|
| Agente estándar | Plantillas, coaxial, FTTH, tablas y notas, enlaces |
| Agente especial | Todo lo anterior, más **Speechs** y el nombre por defecto “CAPILLO HIDALGO MOISÉS A. - A365” |
| Entrenamiento | Base estándar más la pestaña *Entrenamiento* (reservada para herramientas futuras) |
| Senior | Base estándar más la pestaña *Senior* (reservada para herramientas futuras) |

Las claves **no** están en el repositorio. Están en `private/ACCESOS.md`, una carpeta ignorada por git, junto con el comando para generar un hash nuevo si cambias una clave. En `public/app.js` solo hay hashes PBKDF2.

> ⚠️ Esta pantalla de acceso es del lado del cliente: ordena perfiles, pero **no es seguridad real**. Para proteger el sitio de verdad, usa *Netlify → Site configuration → Access control → Password protection* y mantén el repositorio **privado**.

### Sesión

- La sesión dura mientras haya al menos una pestaña abierta del sitio. Al recargar se mantiene.
- Si abres el sitio en **otra pestaña**, esa pestaña toma la sesión y el perfil de la que ya está abierta. No se rompe.
- Cuando cierras todas las pestañas, la próxima vez se vuelve a pedir la clave.
- **Salir** cierra la sesión en todas las pestañas.

### Persistencia

Todo se guarda en `localStorage` por perfil (`mda.<perfil>.*`): formulario, plantilla activa, modo de salida, medidor, tablas, notas y la capa de speechs. Si cambias de pestaña o de ventana, los datos siguen ahí.

## Speechs (perfil especial)

- La **capa base** está en `public/data/speeches.json`, con el formato `{ version, items:[{id, titulo, tag, texto}] }`.
- Variables disponibles: `{saludo}` (Buenos días/tardes/noches según la hora), `{agente}`, `{sot}` y `{cliente}`.
- CRUD desde el panel: **+ Nuevo**, **Editar** y **Eliminar**. Los cambios **no tocan** el JSON base. Se guardan en una **capa local** que se superpone por `id`:
  - Si editas el speech `01`, sigue apareciendo como `01` con el contenido nuevo.
  - Eliminar un speech base solo lo oculta (`_hidden`).
  - La capa local se guarda ofuscada en el navegador.
- **Capa JSON** sirve para exportar o importar esa capa y llevarla a otro equipo copiando y pegando, sin subir archivos.
- Para cambios permanentes, edita `public/data/speeches.json` y vuelve a desplegar.

## Estructura

```
public/
  index.html        estructura y vistas
  styles.css        estilo AMOLED + neón, esquinas rectas
  templates.js      campos, plantillas, categorías y enlaces (editar aquí)
  app.js            lógica: sesión, generador, coaxial, tablas, speechs
  data/speeches.json
  fonts/            Martian Mono, Epilogue y JetBrains Mono (OFL, locales)
netlify.toml        publish = "public" + cabeceras
private/            ignorado por git (claves)
```

### Agregar o editar una plantilla

En `public/templates.js`, añade un objeto en `TEMPLATES`:

```js
{ id:'mi_plantilla', cat:'seg', title:'Título', note:'subtítulo',
  fields:['contacto', {id:'idllamada', when:v=>v.contacto==='SI'}, 'obs'],
  render:(v,c)=>[`FECHA: ${c.fecha}`, `SOT: ${c.sot}`, `OBS: ${v.obs}`, `POR: ${c.u}`] }
```

Los campos se definen una sola vez en `FIELDS` y se reutilizan.

## Desarrollo local

```bash
cd public && python3 -m http.server 8080
```

## Notas de despliegue

- Netlify añade un comentario HTML y la cabecera `netlify-hosting`. **No se pueden quitar** desde la configuración. Con un dominio propio se reduce la huella.
- `robots.txt` y las cabeceras `X-Robots-Tag` evitan que el sitio se indexe.

---
MDA · Engineer M.
