const CONFIG_FIJA = {
  cloudName:    "dmtiwxvw5",
  uploadPreset: "preset_fotos_evento",
  galleryTag:   "evento-gaby",
  folder:       "15_Years_Gaby"
};

const uploadForm = document.getElementById("upload-form");
const statusNode  = document.getElementById("status");
const galleryNode = document.getElementById("gallery");

let currentResources = [];

// ─────────────────────────────────────────────
// URLs de Cloudinary
// ─────────────────────────────────────────────

function buildThumbnailUrl(cloudName, resource) {
  const cn  = encodeURIComponent(cloudName);
  const pid = resource.public_id;
  if (resource.resource_type === "video") {
    return `https://res.cloudinary.com/${cn}/video/upload/w_300,h_300,c_fill,f_jpg,q_auto:low,so_0/${pid}.jpg`;
  }
  return `https://res.cloudinary.com/${cn}/image/upload/w_300,h_300,c_fill,f_auto,q_auto:low/${pid}`;
}

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
        poster.src     = buildThumbnailUrl(cloudName, resource);
        poster.alt     = resource.public_id;
        poster.loading = "lazy";
        poster.style.cursor = "pointer";
        poster.title   = "Ver video";
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
        img.src     = buildThumbnailUrl(cloudName, resource);
        img.alt     = resource.public_id;
        img.loading = "lazy";
        img.style.cursor = "pointer";
        img.title   = "Ver imagen completa";
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
// ─────────────────────────────────────────────

async function fetchByTag(cloudName, tag, resourceType) {
  try {
    // SIN ?t=Date.now() — ese parámetro rompe el caché de CDN y puede
    // triggerar verificaciones de allowlist en cada request único.
    const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resourceType}/list/${encodeURIComponent(tag)}.json`;
    const res  = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[Cloudinary] fetchByTag ${resourceType}/${tag}: HTTP ${res.status}`);
      return { resources: [], error: res.status };
    }
    const data = await res.json();
    const items = Array.isArray(data.resources) ? data.resources : [];
    return { resources: items.map(r => ({ ...r, resource_type: resourceType })), error: null };
  } catch (e) {
    console.warn(`[Cloudinary] fetchByTag error:`, e);
    return { resources: [], error: e.message };
  }
}

async function fetchByFolder(cloudName, folder, resourceType) {
  try {
    const encodedFolder = folder.split("/").map(encodeURIComponent).join("/");
    const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resourceType}/list/${encodedFolder}.json`;
    const res  = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[Cloudinary] fetchByFolder ${resourceType}/${folder}: HTTP ${res.status}`);
      return { resources: [], error: res.status };
    }
    const data = await res.json();
    const items = Array.isArray(data.resources) ? data.resources : [];
    return { resources: items.map(r => ({ ...r, resource_type: resourceType })), error: null };
  } catch (e) {
    console.warn(`[Cloudinary] fetchByFolder error:`, e);
    return { resources: [], error: e.message };
  }
}

function dedup(resources) {
  const seen = new Set();
  return resources.filter(r => {
    if (seen.has(r.public_id)) return false;
    seen.add(r.public_id);
    return true;
  });
}

// Registra el error técnico en consola (solo visible para desarrolladores)
// y muestra un mensaje discreto y amigable al usuario final.
function showErrorPanel(httpStatus) {
  const errorMap = {
    401: "Tag no encontrado o sin recursos públicos (401) — asignar tag a los recursos existentes en Cloudinary Media Library.",
    403: "Petición bloqueada por allowlist (403) — limpiar 'Allowed strict referral domains' en Cloudinary Settings > Security.",
    404: "Endpoint de lista no existe (404) — habilitar 'Resource list' en Cloudinary Settings > Security > Restricted image types.",
  };
  console.error(
    `[Upload Gallery] Error al cargar la galería: ${errorMap[httpStatus] || `HTTP ${httpStatus} inesperado.`}`
  );

  galleryNode.innerHTML = `
    <div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--muted);">
      <p style="font-size:2rem; margin:0 0 12px;">📷</p>
      <p style="margin:0 0 6px; color:var(--text); font-size:0.95rem;">
        La galería no está disponible en este momento.
      </p>
      <p style="margin:0; font-size:0.85rem;">
        Puedes seguir subiendo fotos — aparecerán aquí de inmediato.
      </p>
    </div>`;
}

async function refreshGallery(silent = false) {
  const { cloudName, galleryTag, folder } = CONFIG_FIJA;
  if (!silent) setStatus("Cargando galería…");

  // Capa 1: por TAG
  const [imgTag, vidTag] = await Promise.all([
    fetchByTag(cloudName, galleryTag, "image"),
    fetchByTag(cloudName, galleryTag, "video"),
  ]);

  let fetched = dedup([...imgTag.resources, ...vidTag.resources]);

  // Elige el error más informativo: 401 > 403 > 404 > otros
  const errorPriority = (e) => ({ 401: 4, 403: 3, 404: 2 }[e] || 1);
  const pickBestError = (...codes) =>
    codes.filter(Boolean).sort((a, b) => errorPriority(b) - errorPriority(a))[0] || null;

  let lastError = pickBestError(imgTag.error, vidTag.error);

  // Capa 2: por CARPETA (solo si la capa 1 no trajo nada)
  if (fetched.length === 0 && folder) {
    const [imgFolder, vidFolder] = await Promise.all([
      fetchByFolder(cloudName, folder, "image"),
      fetchByFolder(cloudName, folder, "video"),
    ]);
    fetched = dedup([...imgFolder.resources, ...vidFolder.resources]);
    lastError = pickBestError(lastError, imgFolder.error, vidFolder.error);
  }

  if (fetched.length > 0) {
    currentResources = fetched;
    renderGallery(currentResources, cloudName);
    if (!silent) setStatus(`Galería al día · ${fetched.length} archivo${fetched.length !== 1 ? "s" : ""}`);
  } else if (currentResources.length > 0) {
    // Hay recursos en memoria (recién subidos en esta sesión): los conservamos
    renderGallery(currentResources, cloudName);
    if (!silent) setStatus("Galería al día.");
  } else {
    // Sin recursos y con error: mostrar panel de diagnóstico específico
    showErrorPanel(lastError);
    if (!silent) setStatus("No se pudo cargar la galería.", true);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#ff8b8b" : "#9fffc0";
}

// ─────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────

// Límite de Cloudinary según plan:
// Free: 100 MB por archivo | Paid: hasta 5 GB
const MAX_FILE_MB  = 100;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const progressWrap  = document.getElementById("progress-wrap");
const progressBar   = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");

function setProgress(percent) {
  progressBar.style.width  = `${percent}%`;
  progressLabel.textContent = `${Math.round(percent)}%`;
}

function showProgress(visible) {
  progressWrap.hidden = !visible;
  if (!visible) setProgress(0);
}

/**
 * Sube un archivo a Cloudinary usando XMLHttpRequest para poder
 * reportar el progreso real de transferencia byte a byte.
 * Devuelve una Promise con el recurso creado o lanza un Error.
 */
function uploadWithProgress(file, formData, cloudName, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Respuesta inválida de Cloudinary"));
        }
      } else {
        let msg = `Error ${xhr.status}`;
        if (xhr.status === 413) {
          msg = `El archivo supera el límite de ${MAX_FILE_MB} MB permitido por Cloudinary.`;
        } else {
          try {
            const payload = JSON.parse(xhr.responseText);
            msg = payload.error?.message || msg;
          } catch { /* sin JSON */ }
        }
        reject(new Error(msg));
      }
    });

    xhr.addEventListener("error",  () => reject(new Error("Error de red al subir el archivo.")));
    xhr.addEventListener("abort",  () => reject(new Error("Subida cancelada.")));
    xhr.addEventListener("timeout",() => reject(new Error("Tiempo de espera agotado.")));

    xhr.send(formData);
  });
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { cloudName, uploadPreset, galleryTag, folder } = CONFIG_FIJA;
  const files = document.getElementById("media-files").files;

  if (!files.length) {
    setStatus("Selecciona al menos un archivo.", true);
    return;
  }

  // Validar tamaño antes de intentar subir
  const oversized = [...files].filter(f => f.size > MAX_FILE_BYTES);
  if (oversized.length) {
    const names = oversized.map(f => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(0)} MB)`).join("\n");
    setStatus(
      `${oversized.length === 1 ? "Este archivo supera" : "Estos archivos superan"} el límite de ${MAX_FILE_MB} MB:\n${names}`,
      true
    );
    return;
  }

  const total    = files.length;
  let   uploaded = 0;

  showProgress(true);
  setProgress(0);
  setStatus(`Subiendo archivo 1 de ${total}…`);

  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file",          file);
      formData.append("upload_preset", uploadPreset);
      formData.append("tags",          galleryTag);
      if (folder) formData.append("folder", folder);

      // El progreso total = progreso de archivos ya subidos + progreso del archivo actual
      const uploadedResource = await uploadWithProgress(
        file,
        formData,
        cloudName,
        (fileProgress) => {
          // Progreso global: fracción de archivos completos + fracción actual
          const globalPercent = ((uploaded + fileProgress) / total) * 100;
          setProgress(globalPercent);
          const mb = (file.size / 1024 / 1024).toFixed(0);
          setStatus(`Subiendo ${uploaded + 1} de ${total} · ${file.name.substring(0, 20)}${file.name.length > 20 ? "…" : ""} (${mb} MB)`);
        }
      );

      uploaded++;
      setProgress((uploaded / total) * 100);
      currentResources = [uploadedResource, ...currentResources];
      renderGallery(currentResources, cloudName);
    }

    showProgress(false);
    uploadForm.reset();
    setStatus(`¡${total === 1 ? "1 archivo subido" : `${total} archivos subidos`} con éxito! ✓`);

    setTimeout(() => refreshGallery(true), 4000);
  } catch (error) {
    showProgress(false);
    console.error("[Upload Gallery] Error en upload:", error);
    setStatus(`Error al subir: ${error.message}`, true);
  }
});

// ─────────────────────────────────────────────
// Carga inicial
// ─────────────────────────────────────────────
refreshGallery();