# upload-gallery

Aplicación web estática (HTML, CSS y JavaScript) para:

- Subir imágenes y videos a Cloudinary con **unsigned upload preset**
- Visualizar el contenido en modo galería
- Descargar cada archivo
- Sin opción de eliminación

## Configuración de Cloudinary

1. Crea o usa una cuenta de Cloudinary.
2. Crea un **Upload Preset** sin firma (**Unsigned**).
3. Define una etiqueta común para esta app (por ejemplo `upload-gallery`).
4. Habilita **Resource list** en Cloudinary para poder listar recursos por tag desde frontend.

## Uso

1. Abre `index.html` (o la URL de GitHub Pages).
2. Completa:
   - Cloud Name
   - Upload Preset (unsigned)
   - Gallery Tag
   - Folder (opcional)
3. Guarda configuración.
4. Selecciona archivos (imágenes/videos) y súbelos.
5. Usa **Actualizar galería** para recargar contenido desde Cloudinary.

## Deploy en GitHub Pages

1. Sube estos archivos al repositorio.
2. En GitHub: **Settings → Pages**.
3. En *Build and deployment* selecciona:
   - Source: **Deploy from a branch**
   - Branch: `main` (root)
4. Guarda y espera la URL pública.