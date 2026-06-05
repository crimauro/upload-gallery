const STORAGE_KEY = "uploadGallery.cloudinaryConfig";

const configForm = document.getElementById("config-form");
const uploadForm = document.getElementById("upload-form");
const statusNode = document.getElementById("status");
const galleryNode = document.getElementById("gallery");
const refreshBtn = document.getElementById("refresh-btn");

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#ff8b8b" : "#9fffc0";
}

function sanitizeTag(value) {
  return value.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "");
}

function getConfig() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function fillConfigForm(config) {
  if (!config) return;
  configForm.cloudName.value = config.cloudName || "";
  configForm.uploadPreset.value = config.uploadPreset || "";
  configForm.galleryTag.value = config.galleryTag || "upload-gallery";
  configForm.folder.value = config.folder || "";
}

function buildDownloadUrl(cloudName, resource) {
  const ext = resource.format ? `.${resource.format}` : "";
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resource.resource_type}/upload/fl_attachment/${resource.public_id}${ext}`;
}

function renderGallery(resources, cloudName) {
  galleryNode.innerHTML = "";
  if (!resources.length) {
    galleryNode.innerHTML = "<p>No hay archivos en la galería.</p>";
    return;
  }

  resources
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .forEach((resource) => {
      const card = document.createElement("article");
      card.className = "card";

      const media = resource.resource_type === "video" ? document.createElement("video") : document.createElement("img");
      media.src = resource.secure_url;
      if (resource.resource_type === "video") {
        media.controls = true;
      } else {
        media.alt = resource.public_id;
        media.loading = "lazy";
      }

      const footer = document.createElement("div");
      footer.className = "card-footer";

      const name = document.createElement("small");
      name.textContent = resource.public_id;

      const download = document.createElement("a");
      download.className = "download-link";
      download.href = buildDownloadUrl(cloudName, resource);
      download.textContent = "Descargar";
      download.target = "_blank";
      download.rel = "noopener noreferrer";

      footer.append(name, download);
      card.append(media, footer);
      galleryNode.appendChild(card);
    });
}

async function fetchResourcesByType(cloudName, galleryTag, resourceType) {
  const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resourceType}/list/${encodeURIComponent(galleryTag)}.json`;
  const response = await fetch(`${url}?t=${Date.now()}`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  if (!Array.isArray(data.resources)) {
    return [];
  }
  return data.resources;
}

async function refreshGallery() {
  const config = getConfig();
  if (!config) {
    setStatus("Guarda la configuración de Cloudinary primero.", true);
    return;
  }

  setStatus("Cargando galería...");
  try {
    const [images, videos] = await Promise.all([
      fetchResourcesByType(config.cloudName, config.galleryTag, "image"),
      fetchResourcesByType(config.cloudName, config.galleryTag, "video"),
    ]);
    renderGallery([...images, ...videos], config.cloudName);
    setStatus("Galería actualizada.");
  } catch (error) {
    setStatus(`No se pudo cargar la galería: ${error.message}`, true);
  }
}

configForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const cloudName = configForm.cloudName.value.trim();
  const uploadPreset = configForm.uploadPreset.value.trim();
  const galleryTag = sanitizeTag(configForm.galleryTag.value);
  const folder = configForm.folder.value.trim();

  if (!cloudName || !uploadPreset || !galleryTag) {
    setStatus("Completa Cloud Name, Upload Preset y Gallery Tag.", true);
    return;
  }

  const config = { cloudName, uploadPreset, galleryTag, folder };
  saveConfig(config);
  configForm.galleryTag.value = galleryTag;
  setStatus("Configuración guardada.");
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const config = getConfig();
  const files = document.getElementById("media-files").files;

  if (!config) {
    setStatus("Guarda la configuración antes de subir.", true);
    return;
  }
  if (!files.length) {
    setStatus("Selecciona al menos un archivo.", true);
    return;
  }

  setStatus("Subiendo archivos...");
  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("tags", config.galleryTag);
      if (config.folder) {
        formData.append("folder", config.folder);
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/auto/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload.error?.message || "Error en subida";
        throw new Error(`${file.name}: ${message}`);
      }
    }

    uploadForm.reset();
    setStatus("Carga completada.");
    await refreshGallery();
  } catch (error) {
    setStatus(`Error al subir: ${error.message}`, true);
  }
});

refreshBtn.addEventListener("click", refreshGallery);

fillConfigForm(getConfig());
refreshGallery();
