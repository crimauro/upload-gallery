# Upload Gallery

Aplicación web estática (HTML + CSS + JS puro) para subir, visualizar y descargar imágenes y videos desde Cloudinary, sin backend propio.

---

## Funcionalidad

- **Subida de archivos** con barra de progreso por archivo. Soporta múltiples archivos simultáneos.
- **Galería paginada** que carga los recursos desde Cloudinary al abrir la página.
- **Modo selección**: activa checkboxes centrados sobre cada imagen. En ese modo, hacer clic en cualquier parte de la imagen la selecciona/deselecciona (sin abrirla). Fuera del modo selección, el clic abre el archivo en otra pestaña.
- **Descarga individual o en ZIP**: si hay un ítem seleccionado descarga directo; si hay más de uno, empaqueta en ZIP usando JSZip.
- **Botón flotante de descarga**: aparece solo cuando hay al menos un ítem seleccionado y se oculta al cancelar la selección o deseleccionar el último ítem.
- **Validación de tamaño** en cliente antes de intentar subir.

---

## Arquitectura

```
upload-gallery/
├── index.html    # Estructura HTML y referencias a scripts/estilos
├── styles.css    # Estilos visuales (dark theme, grid, componentes)
└── script.js     # Toda la lógica: configuración, UI, Cloudinary fetch/upload
```

No hay framework, bundler ni servidor. Puede servirse directamente desde GitHub Pages, Netlify, o cualquier hosting estático.

---

## Propiedades de configuración en script.js

Todas las propiedades configurables están al inicio del archivo.

### `CONFIG_FIJA`

| Propiedad      | Descripción                                                       |
|----------------|-------------------------------------------------------------------|
| `cloudName`    | Nombre del cloud en Cloudinary (aparece en el dashboard).         |
| `uploadPreset` | Nombre del Upload Preset sin firma (unsigned) creado en Cloudinary.|
| `galleryTag`   | Etiqueta usada para listar los recursos en la galería.            |
| `folder`       | Carpeta de Cloudinary. Usada como fallback si el tag no retorna resultados. |

### Constantes independientes

| Constante        | Descripción                                                          |
|------------------|----------------------------------------------------------------------|
| `ALLOW_VIDEOS`   | `true` acepta fotos y videos; `false` solo acepta imágenes.          |
| `MAX_FILE_MB`    | Límite de tamaño por archivo en MB. Se valida en cliente.            |
| `ITEMS_POR_PAGINA` | Cantidad de tarjetas mostradas por página en la galería.           |

---

## Integración con Cloudinary

La app se conecta a Cloudinary de dos formas:

**1. Subida (upload)**  
Usa la API pública de upload de Cloudinary vía `XMLHttpRequest`:
```
POST https://api.cloudinary.com/v1_1/<cloudName>/auto/upload
```
Se envía el archivo junto con `upload_preset`, `tags` y `folder`. No requiere API key ni firma porque usa un preset unsigned.

**2. Listado (galería)**  
Consulta el endpoint público de listado por tag:
```
GET https://res.cloudinary.com/<cloudName>/<resourceType>/list/<tag>.json
```
Si el tag no retorna resultados, hace un segundo intento listando por carpeta:
```
GET https://res.cloudinary.com/<cloudName>/<resourceType>/list/<folder>.json
```

---

## Parámetros de Cloudinary requeridos

Para que la aplicación funcione correctamente se deben configurar los siguientes puntos en el dashboard de Cloudinary:

**Upload Preset (unsigned)**  
En *Settings → Upload → Upload presets*, crear un preset con:
- Signing mode: **Unsigned**
- Puede definirse la carpeta destino dentro del preset o dejarse libre.

**Resource list habilitado**  
En *Settings → Security*, activar **Resource list** (permite listar recursos por tag o carpeta desde el frontend sin autenticación).

**Sin restricciones de referrer**  
En *Settings → Security → Allowed strict referral domains*, dejar vacío o agregar el dominio desde donde se sirve la app. Si está configurado con dominios incorrectos la galería retorna HTTP 403.

**Tag asignado a los recursos**  
Los recursos subidos con esta app reciben el tag configurado en `galleryTag` automáticamente. Para mostrar en la galería recursos subidos por otros medios, asignarles el mismo tag desde la Cloudinary Media Library.

---

## Deploy en GitHub Pages

1. Subir los archivos al repositorio.
2. En GitHub: *Settings → Pages*.
3. Source: **Deploy from a branch** → branch `main` (root).
4. La URL pública queda disponible en pocos minutos.
