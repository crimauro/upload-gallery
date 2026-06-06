const CONFIG_FIJA = {
  cloudName:    "dmtiwxvw5",
  uploadPreset: "preset_fotos_evento",
  galleryTag:   "evento-gaby",
  folder:       "15_Years_Gaby"
};

const uploadForm = document.getElementById("upload-form");
const statusNode  = document.getElementById("status");
const galleryNode = document.getElementById("gallery");

let currentResources  = [];
let recursosPaginados = [];
let selectedIds       = new Set();
let selectMode        = false;   // true = checkboxes visibles

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

function buildViewUrl(cloudName, resource) {
  const cn  = encodeURIComponent(cloudName);
  const pid = resource.public_id;
  if (resource.resource_type === "video") return resource.secure_url;
  return `https://res.cloudinary.com/${cn}/image/upload/w_2000,c_limit,f_auto,q_auto:good/${pid}`;
}

// ─────────────────────────────────────────────
// Paginación
// Cambia ITEMS_POR_PAGINA para ajustar cuántas tarjetas muestra cada página.
// ─────────────────────────────────────────────
const ITEMS_POR_PAGINA = 50;
let paginaActual = 1;

// ─────────────────────────────────────────────
// Modo selección
// ─────────────────────────────────────────────

function toggleSelectMode() {
  // Activa / desactiva modo selección sin seleccionar nada
  selectMode = !selectMode;
  if (!selectMode) {
    // Al desactivar, limpiamos la selección
    selectedIds.clear();
    updateDownloadBar();
  }
  updateSelectButtons();
  refreshCardCheckboxes();
}

function toggleSelectAll() {
  if (selectedIds.size === recursosPaginados.length) {
    // Ya estaban todos → deseleccionar y desactivar modo
    selectedIds.clear();
    selectMode = false;
  } else {
    // Seleccionar todos y activar modo
    selectMode = true;
    recursosPaginados.forEach(r => selectedIds.add(r.public_id));
  }
  updateSelectButtons();
  refreshCardCheckboxes();
  updateDownloadBar();
}

function clearSelection() {
  selectedIds.clear();
  selectMode = false;
  updateSelectButtons();
  refreshCardCheckboxes();
  updateDownloadBar();
}

function updateSelectButtons() {
  const btnSel    = document.getElementById("btn-select");
  const btnSelAll = document.getElementById("btn-select-all");
  if (!btnSel) return;

  // Clase en body para que CSS refleje el modo de selección
  document.body.classList.toggle("select-mode", selectMode);

  // "Seleccionar" se marca como activo cuando el modo está encendido
  btnSel.classList.toggle("ctrl-btn--active", selectMode);
  btnSel.textContent = selectMode ? "Cancelar selección" : "Seleccionar";

  // "Seleccionar todo" se marca cuando todos están seleccionados
  const allSelected = recursosPaginados.length > 0
    && selectedIds.size === recursosPaginados.length;
  btnSelAll.classList.toggle("ctrl-btn--active", allSelected);
  btnSelAll.textContent = allSelected ? "Deseleccionar todo" : "Seleccionar todo";
}

/** Actualiza el estado visual de los checkboxes en las tarjetas existentes en el DOM,
 *  sin re-renderizar todo el grid (más eficiente). */
function refreshCardCheckboxes() {
  document.querySelectorAll(".card").forEach(card => {
    const pid = card.dataset.pid;
    const cb  = card.querySelector(".card-checkbox");
    if (!cb) return;

    cb.classList.toggle("visible",  selectMode || selectedIds.has(pid));
    cb.classList.toggle("checked",  selectedIds.has(pid));
    cb.innerHTML = selectedIds.has(pid) ? "✓" : "";
    card.classList.toggle("selected", selectedIds.has(pid));
  });
}

function updateDownloadBar() {
  const bar   = document.getElementById("download-bar");
  const count = selectedIds.size;
  bar.style.display = count === 0 ? "none" : "flex";
  if (count > 0) {
    document.getElementById("dl-count").textContent =
      `${count} archivo${count !== 1 ? "s" : ""} seleccionado${count !== 1 ? "s" : ""}`;
  }
}

// ─────────────────────────────────────────────
// Tarjeta de galería
// ─────────────────────────────────────────────

function buildCard(resource, cloudName) {
  const isVideo = resource.resource_type === "video";
  const pid     = resource.public_id;
  const checked = selectedIds.has(pid);

  const card = document.createElement("article");
  card.className = "card" + (checked ? " selected" : "");
  card.dataset.pid = pid;

  // Función centralizada para toggle de selección de esta tarjeta
  function toggleCardSelection() {
    if (selectedIds.has(pid)) {
      selectedIds.delete(pid);
      card.classList.remove("selected");
      checkbox.classList.remove("checked");
      checkbox.innerHTML = "";
      if (!selectMode) checkbox.classList.remove("visible");
    } else {
      selectedIds.add(pid);
      card.classList.add("selected");
      checkbox.classList.add("checked");
      checkbox.innerHTML = "✓";
    }
    updateSelectButtons();
    updateDownloadBar();
  }

  // Checkbox — oculto por defecto, visible solo en modo selección
  const checkbox = document.createElement("div");
  checkbox.className = "card-checkbox"
    + (checked                        ? " checked" : "")
    + (selectMode || checked          ? " visible" : "");
  checkbox.innerHTML = checked ? "✓" : "";
  checkbox.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCardSelection();
  });

  const mediaContainer = document.createElement("div");
  mediaContainer.className = "media-container";

  if (isVideo) {
    const poster = document.createElement("img");
    poster.src     = buildThumbnailUrl(cloudName, resource);
    poster.alt     = pid;
    poster.loading = "lazy";
    poster.addEventListener("load",  () => poster.classList.add("loaded"));
    poster.addEventListener("error", () => { poster.style.opacity = "1"; });

    const playIcon = document.createElement("div");
    playIcon.className = "play-icon";
    playIcon.innerHTML = "▶";
    mediaContainer.append(poster, playIcon);
  } else {
    const img = document.createElement("img");
    img.src     = buildThumbnailUrl(cloudName, resource);
    img.alt     = pid;
    img.loading = "lazy";
    img.addEventListener("load",  () => img.classList.add("loaded"));
    img.addEventListener("error", () => { img.style.opacity = "1"; });
    mediaContainer.appendChild(img);
  }

  // Click en el área de media: seleccionar/deseleccionar en modo selección,
  // abrir en otra pestaña fuera de ese modo.
  mediaContainer.addEventListener("click", (e) => {
    if (selectMode) {
      e.preventDefault();
      toggleCardSelection();
    } else {
      if (resource.resource_type === "video") {
        window.open(resource.secure_url, "_blank");
      } else {
        window.open(buildViewUrl(cloudName, resource), "_blank");
      }
    }
  });

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const name = document.createElement("small");
  const shortName = pid.split("/").pop() || pid;
  name.textContent = shortName.length > 15 ? shortName.substring(0, 12) + "…" : shortName;

  const download = document.createElement("a");
  download.className   = "download-link";
  download.href        = buildDownloadUrl(cloudName, resource);
  download.textContent = "Descargar";
  download.target      = "_blank";
  download.rel         = "noopener noreferrer";

  footer.append(name, download);
  card.append(checkbox, mediaContainer, footer);
  return card;
}

// ─────────────────────────────────────────────
// Descarga en ZIP (múltiple) o directa (individual)
// ─────────────────────────────────────────────

async function downloadSelected() {
  const { cloudName } = CONFIG_FIJA;
  const resources = recursosPaginados.filter(r => selectedIds.has(r.public_id));
  if (!resources.length) return;

  const btn = document.getElementById("dl-btn");
  btn.disabled = true;

  if (resources.length === 1) {
    // Un solo archivo: descarga directa
    btn.textContent = "Descargando…";
    const resource = resources[0];
    const link = document.createElement("a");
    link.href     = buildDownloadUrl(cloudName, resource);
    link.target   = "_blank";
    link.download = (resource.public_id.split("/").pop() || "archivo")
                    + (resource.format ? `.${resource.format}` : "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Múltiples archivos: empaquetar en ZIP
    const zip = new JSZip();
    const folder = zip.folder("galeria-gaby");

    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      btn.textContent = `Preparando ${i + 1} / ${resources.length}…`;
      const url = buildDownloadUrl(cloudName, resource);
      const ext = resource.format ? `.${resource.format}` : "";
      const filename = (resource.public_id.split("/").pop() || `archivo_${i + 1}`) + ext;
      try {
        const response = await fetch(url);
        const blob     = await response.blob();
        folder.file(filename, blob);
      } catch {
        console.warn(`[Upload Gallery] No se pudo incluir en ZIP: ${filename}`);
      }
    }

    btn.textContent = "Generando ZIP…";
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(zipBlob);
    link.download = "galeria-gaby.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  }

  btn.disabled = false;
  btn.textContent = "⬇ Descargar";
}

// ─────────────────────────────────────────────
// Paginación y render
// ─────────────────────────────────────────────

function renderPagination(totalItems, cloudName) {
  const old = document.getElementById("pagination");
  if (old) old.remove();
  const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
  if (totalPaginas <= 1) return;

  const nav = document.createElement("nav");
  nav.id = "pagination";
  nav.className = "pagination";
  nav.setAttribute("aria-label", "Paginación de galería");

  const btnPrev = document.createElement("button");
  btnPrev.textContent = "← Anterior";
  btnPrev.className   = "page-btn";
  btnPrev.disabled    = paginaActual === 1;
  btnPrev.addEventListener("click", () => {
    if (paginaActual > 1) { paginaActual--; renderPageItems(cloudName); }
  });

  const info = document.createElement("span");
  info.className   = "page-info";
  info.textContent = `Página ${paginaActual} de ${totalPaginas}`;

  const btnNext = document.createElement("button");
  btnNext.textContent = "Siguiente →";
  btnNext.className   = "page-btn";
  btnNext.disabled    = paginaActual === totalPaginas;
  btnNext.addEventListener("click", () => {
    if (paginaActual < totalPaginas) { paginaActual++; renderPageItems(cloudName); }
  });

  nav.append(btnPrev, info, btnNext);
  galleryNode.insertAdjacentElement("afterend", nav);
}

function renderPageItems(cloudName) {
  galleryNode.innerHTML = "";
  const inicio  = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const pagina  = recursosPaginados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  pagina.forEach(resource => galleryNode.appendChild(buildCard(resource, cloudName)));
  renderPagination(recursosPaginados.length, cloudName);
  galleryNode.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderGallery(resources, cloudName) {
  galleryNode.innerHTML = "";
  const old = document.getElementById("pagination");
  if (old) old.remove();

  const controls = document.getElementById("gallery-controls");

  if (!resources || !resources.length) {
    showEmptyGallery();
    if (controls) controls.hidden = true;
    return;
  }

  recursosPaginados = [...resources].sort(
    (a, b) => (b.created_at || "").localeCompare(a.created_at || "")
  );
  paginaActual = 1;
  if (controls) controls.hidden = false;
  renderPageItems(cloudName);
}

// ─────────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────────

function showEmptyGallery() {
  galleryNode.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--muted);">
      <p style="font-size:2rem;margin:0 0 12px;">📷</p>
      <p style="margin:0;color:var(--text);font-size:0.95rem;">No hay elementos a mostrar en la galería.</p>
    </div>`;
}

function showErrorPanel(httpStatus) {
  const errorMap = {
    401: "Tag no encontrado o sin recursos públicos (401) — asignar tag a recursos existentes en Cloudinary Media Library.",
    403: "Petición bloqueada (403) — limpiar 'Allowed strict referral domains' en Cloudinary Settings > Security.",
    404: "Endpoint no existe (404) — habilitar 'Resource list' en Cloudinary Settings > Security.",
  };
  console.error(`[Upload Gallery] ${errorMap[httpStatus] || `HTTP ${httpStatus} inesperado.`}`);
  showEmptyGallery();
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#ff8b8b" : "#9fffc0";
}

// ─────────────────────────────────────────────
// Carga desde Cloudinary
// ─────────────────────────────────────────────

async function fetchByTag(cloudName, tag, resourceType) {
  try {
    const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resourceType}/list/${encodeURIComponent(tag)}.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[Cloudinary] fetchByTag ${resourceType}/${tag}: HTTP ${res.status}`);
      return { resources: [], error: res.status };
    }
    const data = await res.json();
    return {
      resources: (Array.isArray(data.resources) ? data.resources : [])
                   .map(r => ({ ...r, resource_type: resourceType })),
      error: null
    };
  } catch (e) {
    return { resources: [], error: e.message };
  }
}

async function fetchByFolder(cloudName, folder, resourceType) {
  try {
    const encodedFolder = folder.split("/").map(encodeURIComponent).join("/");
    const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resourceType}/list/${encodedFolder}.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { resources: [], error: res.status };
    const data = await res.json();
    return {
      resources: (Array.isArray(data.resources) ? data.resources : [])
                   .map(r => ({ ...r, resource_type: resourceType })),
      error: null
    };
  } catch (e) {
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

async function refreshGallery(silent = false) {
  const { cloudName, galleryTag, folder } = CONFIG_FIJA;
  if (!silent) setStatus("Cargando galería…");

  const [imgTag, vidTag] = await Promise.all([
    fetchByTag(cloudName, galleryTag, "image"),
    fetchByTag(cloudName, galleryTag, "video"),
  ]);

  let fetched = dedup([...imgTag.resources, ...vidTag.resources]);

  const errorPriority = (e) => ({ 401: 4, 403: 3, 404: 2 }[e] || 1);
  const pickBestError = (...codes) =>
    codes.filter(Boolean).sort((a, b) => errorPriority(b) - errorPriority(a))[0] || null;

  let lastError = pickBestError(imgTag.error, vidTag.error);

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
    renderGallery(currentResources, cloudName);
    if (!silent) setStatus("Galería al día.");
  } else {
    showErrorPanel(lastError);
    if (!silent) setStatus("");
  }
}

// ─────────────────────────────────────────────
// Upload con progreso
// ─────────────────────────────────────────────

const MAX_FILE_MB    = 100;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const progressWrap  = document.getElementById("progress-wrap");
const progressBar   = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");

function setProgress(percent) {
  progressBar.style.width   = `${percent}%`;
  progressLabel.textContent = `${Math.round(percent)}%`;
}
function showProgress(visible) {
  progressWrap.hidden = !visible;
  if (!visible) setProgress(0);
}

function uploadWithProgress(file, formData, cloudName, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Respuesta inválida de Cloudinary")); }
      } else {
        let msg = `Error ${xhr.status}`;
        if (xhr.status === 413) msg = `El archivo supera el límite de ${MAX_FILE_MB} MB permitido.`;
        else {
          try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch {}
        }
        reject(new Error(msg));
      }
    });
    xhr.addEventListener("error",   () => reject(new Error("Error de red al subir el archivo.")));
    xhr.addEventListener("abort",   () => reject(new Error("Subida cancelada.")));
    xhr.addEventListener("timeout", () => reject(new Error("Tiempo de espera agotado.")));
    xhr.send(formData);
  });
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { cloudName, uploadPreset, galleryTag, folder } = CONFIG_FIJA;
  const files = document.getElementById("media-files").files;

  if (!files.length) { setStatus("Selecciona al menos un archivo.", true); return; }

  const oversized = [...files].filter(f => f.size > MAX_FILE_BYTES);
  if (oversized.length) {
    setStatus(
      `${oversized.length === 1 ? "Este archivo supera" : "Estos archivos superan"} el límite de ${MAX_FILE_MB} MB: ` +
      oversized.map(f => f.name).join(", "),
      true
    );
    return;
  }

  const total = files.length;
  let uploaded = 0;
  showProgress(true);
  setProgress(0);

  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file",          file);
      formData.append("upload_preset", uploadPreset);
      formData.append("tags",          galleryTag);
      if (folder) formData.append("folder", folder);

      const uploadedResource = await uploadWithProgress(file, formData, cloudName, (p) => {
        setProgress(((uploaded + p) / total) * 100);
        const mb = (file.size / 1024 / 1024).toFixed(0);
        setStatus(`Subiendo ${uploaded + 1} de ${total} · ${file.name.substring(0, 20)}${file.name.length > 20 ? "…" : ""} (${mb} MB)`);
      });

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