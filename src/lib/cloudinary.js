const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Sube un archivo de imagen (File) a Cloudinary usando un upload preset "unsigned",
 * es decir, sin necesidad de un backend propio que firme la petición.
 * Devuelve la URL segura (https) de la imagen ya subida, lista para guardar en Firestore.
 *
 * Uso: const url = await subirImagen(archivo, "productos"); // carpeta opcional
 */
export async function subirImagen(archivo, carpeta = "ms-market") {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Falta configurar VITE_CLOUDINARY_CLOUD_NAME o VITE_CLOUDINARY_UPLOAD_PRESET en tu archivo .env"
    );
  }

  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", carpeta);

  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Error subiendo imagen a Cloudinary: ${detalle}`);
  }

  const datos = await respuesta.json();
  return datos.secure_url;
}
