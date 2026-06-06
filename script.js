const CONFIG_FIJA = {
  cloudName:    "dmtiwxvw5",
  uploadPreset: "preset_fotos_evento",
  galleryTag:   "evento-gaby",
  folder:       "15_Years_Gaby"
};

const uploadForm = document.getElementById("upload-form");
const statusNode  = document.getElementById("status");
const galleryNode = document.getElementById("gallery");

// Estado local en memoria
let currentResources = [];

// ─────────────────────────────────────────────
// URLs de Cloudinary
// ─────────────────────────────────────────────

/**
 * Thumbnail optimizado: 300×300, formato auto (convierte HEIC→WebP/JPEG),
 * calidad baja para carga rápida.
 */
function buildThumbnailUrl(cloudName, resource) {
  const cn  = encodeURIComponent(cloudName);
  const pid = resource.public_id;
  if (resource.resource_type === "video") {
    return `https://res.cloudinary.com/${cn}/video/upload/w_300,h_300,c_fill,f_jpg,q_auto:low,so_0/${pid}.jpg`;
  }
  return `https://res.cloudinary.com/${cn}/image/upload/w_300,h_300,c_fill,f_auto,q_auto:low/${pid}`;
}

/** URL de descarga del archivo original. */
function buildDownloadUrl(cloudName, resource) {
  const ext = resource.format ? `.${resource.format}` : "";
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resource.resource_type}/upload/fl_attachment/${resource.public_id}${ext}`;
}

// ─────────────────────────────────────────────
// Render de galería
// ─────────────────────────────────────────────

function renderGallery(resources, cloudName) {
  galleryNode.innerHTML = "";
  if (!resources || !resources.length) {
    galleryNode.innerHTML =
      "<p style='grid-column:1/-1;text-align:center;color:var(--muted);padding:30px;'>No hay archivos en la galería todavía.</p>";
    return;
  }

  [...resources]
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .forEach((resource) => {
      const isVideo = resource.resource_type === "video";

      const card = document.createElement("article");
      card.className = "card";

      const mediaContainer = document.createElement("div");
      mediaContainer.className = "media-container";

      if (isVideo) {
        const poster = document.createElement("img");
        poster.src    = buildThumbnailUrl(cloudName, resource);
        poster.alt    = resource.public_id;
        poster.loading = "lazy";
        poster.style.cursor = "pointer";
        poster.title  = "Ver video";
        poster.addEventListener("load",  () => poster.classList.add("loaded"));
        poster.addEventListener("error", () => { poster.style.opacity = "1"; });
        poster.addEventListener("click", () => window.open(resource.secure_url, "_blank"));

        const playIcon = document.createElement("div");
        playIcon.className = "play-icon";
        playIcon.innerHTML = "▶";

        mediaContainer.appendChild(poster);
        mediaContainer.appendChild(playIcon);
      } else {
        const img = document.createElement("img");
        img.src    = buildThumbnailUrl(cloudName, resource);
        img.alt    = resource.public_id;
        img.loading = "lazy";
        img.style.cursor = "pointer";
        img.title  = "Ver imagen completa";
        img.addEventListener("load",  () => img.classList.add("loaded"));
        img.addEventListener("error", () => { img.style.opacity = "1"; });
        img.addEventListener("click", () => window.open(resource.secure_url, "_blank"));
        mediaContainer.appendChild(img);
      }

      const footer = document.createElement("div");
      footer.className = "card-footer";

      const name = document.createElement("small");
      const shortName = resource.public_id.split("/").pop() || resource.public_id;
      name.textContent = shortName.length > 15 ? shortName.substring(0, 12) + "…" : shortName;

      const download = document.createElement("a");
      download.className   = "download-link";
      download.href        = buildDownloadUrl(cloudName, resource);
      download.textContent = "Descargar";
      download.target      = "_blank";
      download.rel         = "noopener noreferrer";

      footer.append(name, download);
      card.append(mediaContainer, footer);
      galleryNode.appendChild(card);
    });
}

// ─────────────────────────────────────────────
// Carga desde Cloudinary
// Estrategia de 3 capas para máxima compatibilidad:
//   1) /list/<tag>.json   → rápido, requiere "Resource list" habilitado en Cloudinary
//   2) /list/<folder>.json → alternativa por carpeta (también requiere habilitarlo)
//   3) Fallback visual con instrucciones si ambos fallan
// ─────────────────────────────────────────────

/**
 * Intenta obtener recursos desde el endpoint de listing por TAG.
 * Devuelve array de recursos o [] si falla / está deshabilitado.
 */
async function fetchByTag(cloudName, tag, resourceType) {
  try {
    const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resourceType}/list/${encodeURIComponent(tag)}.json?t=${Date.now()}`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.resources) ? data.resources : [];
    // Aseguramos que cada recurso tenga resource_type (no siempre lo incluye este endpoint)
    return items.map(r => ({ ...r, resource_type: resourceType }));
  } catch {
    return [];
  }
}

/**
 * Intenta obtener recursos desde el endpoint de listing por CARPETA.
 * Cloudinary expone /image/list/<folder>.json si "Resource list" está activo.
 * La carpeta se pasa como path, e.g. "15_Years_Gaby".
 */
async function fetchByFolder(cloudName, folder, resourceType) {
  try {
    // El endpoint de lista por carpeta usa el path con slashes codificados
    const encodedFolder = folder.split("/").map(encodeURIComponent).join("/");
    const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resourceType}/list/${encodedFolder}.json?t=${Date.now()}`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.resources) ? data.resources : [];
    return items.map(r => ({ ...r, resource_type: resourceType }));
  } catch {
    return [];
  }
}

/**
 * Deduplica recursos por public_id (por si ambas estrategias devuelven los mismos).
 */
function dedup(resources) {
  const seen = new Set();
  return resources.filter(r => {
    if (seen.has(r.public_id)) return false;
    seen.add(r.public_id);
    return true;
  });
}

/**
 * Muestra un mensaje de ayuda cuando Cloudinary no devuelve nada,
 * explicando qué configuración falta.
 */
function showConfigHelp() {
  galleryNode.innerHTML = `
    <div style="grid-column:1/-1; background:rgba(139,125,255,0.1); border:1px solid rgba(139,125,255,0.4);
                border-radius:12px; padding:20px; color:var(--text); font-size:0.88rem; line-height:1.6;">
      <strong style="color:var(--accent); font-size:1rem;">⚙️ Configuración requerida en Cloudinary</strong>
      <p style="margin:10px 0 6px; color:var(--muted);">
        La galería no puede cargar porque el <em>Resource list</em> no está habilitado en tu cuenta.
        Sigue estos pasos (solo se hace una vez):
      </p>
      <ol style="margin:0; padding-left:1.2rem; color:var(--muted);">
        <li>Ve a <strong style="color:var(--text);">cloudinary.com → Settings → Security</strong></li>
        <li>Busca la sección <strong style="color:var(--text);">"Restricted image types"</strong></li>
        <li>Desmarca la opción <strong style="color:var(--text);">"Resource list"</strong> (o activa "Enable resource list")</li>
        <li>Guarda los cambios y recarga esta página</li>
      </ol>
      <p style="margin:10px 0 0; color:var(--muted); font-size:0.82rem;">
        Alternativa: sube una imagen ahora y aparecerá automáticamente aunque el listing esté deshabilitado.
      </p>
    </div>`;
}

async function refreshGallery(silent = false) {
  const { cloudName, galleryTag, folder } = CONFIG_FIJA;
  if (!silent) setStatus("Cargando galería…");

  try {
    // ── Capa 1: listing por TAG (imagen + video) ──
    const [imgByTag, vidByTag] = await Promise.all([
      fetchByTag(cloudName, galleryTag, "image"),
      fetchByTag(cloudName, galleryTag, "video"),
    ]);
    let fetched = dedup([...imgByTag, ...vidByTag]);

    // ── Capa 2: si el tag no devolvió nada, intentamos por CARPETA ──
    if (fetched.length === 0 && folder) {
      const [imgByFolder, vidByFolder] = await Promise.all([
        fetchByFolder(cloudName, folder, "image"),
        fetchByFolder(cloudName, folder, "video"),
      ]);
      fetched = dedup([...imgByFolder, ...vidByFolder]);
    }

    if (fetched.length > 0) {
      currentResources = fetched;
      renderGallery(currentResources, cloudName);
      if (!silent) setStatus(`Galería al día · ${fetched.length} archivo${fetched.length !== 1 ? "s" : ""}`);
    } else if (currentResources.length > 0) {
      // Tenemos recursos en memoria (recién subidos): los mantenemos
      renderGallery(currentResources, cloudName);
      if (!silent) setStatus("Galería al día.");
    } else {
      // ── Capa 3: nada de nada → mostrar ayuda de configuración ──
      showConfigHelp();
      if (!silent) setStatus("Revisa la configuración de Cloudinary.", true);
    }
  } catch (error) {
    if (!silent) setStatus(`Error al cargar galería: ${error.message}`, true);
  }
}

// ─────────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────────

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#ff8b8b" : "#9fffc0";
}

function getConfig() { return CONFIG_FIJA; }

// ─────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const config = getConfig();
  const files  = document.getElementById("media-files").files;

  if (!files.length) {
    setStatus("Selecciona al menos un archivo.", true);
    return;
  }

  const total    = files.length;
  let   uploaded = 0;

  setStatus(`Subiendo archivos… 0 / ${total}`);

  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file",          file);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("tags",          config.galleryTag);
      if (config.folder) formData.append("folder", config.folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/auto/upload`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(`${file.name}: ${payload.error?.message || "Error en subida"}`);
      }

      // La respuesta del upload trae todos los metadatos → galería inmediata
      const uploadedResource = await response.json();

      uploaded++;
      setStatus(`Subiendo archivos… ${uploaded} / ${total}`);

      currentResources = [uploadedResource, ...currentResources];
      renderGallery(currentResources, config.cloudName);
    }

    uploadForm.reset();
    setStatus(`¡${total === 1 ? "1 archivo subido" : `${total} archivos subidos`} con éxito! ✓`);

    // Sincronización silenciosa 4 s después (el CDN suele tardar ese tiempo)
    setTimeout(() => refreshGallery(true), 4000);

  } catch (error) {
    setStatus(`Error al subir: ${error.message}`, true);
  }
});

// ─────────────────────────────────────────────
// Carga inicial
// ─────────────────────────────────────────────
refreshGallery();