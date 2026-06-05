const CONFIG_FIJA = {
  cloudName: "dmtiwxvw5",
  uploadPreset: "preset_fotos_evento", // Asegúrate de que coincida con tu Preset Unsigned de Cloudinary
  galleryTag: "evento-gaby",             
  folder: "15_Years_Gaby"                
};

const uploadForm = document.getElementById("upload-form");
const statusNode = document.getElementById("status");
const galleryNode = document.getElementById("gallery");

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#ff8b8b" : "#9fffc0";
}

function getConfig() {
  return CONFIG_FIJA;
}

function buildDownloadUrl(cloudName, resource) {
  const ext = resource.format ? `.${resource.format}` : "";
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${resource.resource_type}/upload/fl_attachment/${resource.public_id}${ext}`;
}

function renderGallery(resources, cloudName) {
  galleryNode.innerHTML = "";
  if (!resources.length) {
    galleryNode.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--muted); padding: 20px;'>No hay archivos en la galería todavía.</p>";
    return;
  }

  resources
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .forEach((resource) => {
      const card = document.createElement("article");
      card.className = "card";

      const mediaContainer = document.createElement("div");
      mediaContainer.className = "media-container";

      const media = resource.resource_type === "video" ? document.createElement("video") : document.createElement("img");
      media.src = resource.secure_url;
      if (resource.resource_type === "video") {
        media.controls = true;
      } else {
        media.alt = resource.public_id;
        media.loading = "lazy";
      }

      mediaContainer.appendChild(media);

      const footer = document.createElement("div");
      footer.className = "card-footer";

      const name = document.createElement("small");
      const shortName = resource.public_id.split('/').pop() || resource.public_id;
      name.textContent = shortName.length > 15 ? shortName.substring(0, 12) + "..." : shortName;

      const download = document.createElement("a");
      download.className = "download-link";
      download.href = buildDownloadUrl(cloudName, resource);
      download.textContent = "Descargar";
      download.target = "_blank";
      download.rel = "noopener noreferrer";

      footer.append(name, download);
      card.append(mediaContainer, footer);
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
  setStatus("Actualizando galería...");
  try {
    const [images, videos] = await Promise.all([
      fetchResourcesByType(config.cloudName, config.galleryTag, "image"),
      fetchResourcesByType(config.cloudName, config.galleryTag, "video"),
    ]);
    renderGallery([...images, ...videos], config.cloudName);
    setStatus("Galería al día.");
  } catch (error) {
    setStatus(`No se pudo cargar la galería: ${error.message}`, true);
  }
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const config = getConfig();
  const files = document.getElementById("media-files").files;

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
    setStatus("¡Carga completada con éxito!");
    await refreshGallery(); // Esto garantiza la actualización automática tras subir
  } catch (error) {
    setStatus(`Error al subir: ${error.message}`, true);
  }
});

// Carga las fotos automáticamente en tiempo real al entrar a la página
refreshGallery();