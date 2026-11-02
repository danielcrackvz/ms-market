import React, { useState, useEffect } from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { subirImagen } from "../lib/cloudinary";
import { useAuth } from "../AuthContext";

const CATEGORIAS = ["Ropa", "Accesorios", "Belleza"];

export default function PublicarProducto({ onPublicado }) {
  const { usuario, perfil } = useAuth();
  const [form, setForm] = useState({
    nombre: "",
    categoria: "Ropa",
    precio: "",
    stock: "",
    detalle: "",
    envio: "",
  });

  const [whatsapp, setWhatsapp] = useState("");
  const [editandoWa, setEditandoWa] = useState(false);
  const [cambiarQr, setCambiarQr] = useState(false);

  const [foto, setFoto] = useState(null);
  const [qr, setQr] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  // Cargar número de WhatsApp guardado en el perfil si ya existe
  useEffect(() => {
    if (perfil?.whatsapp) {
      setWhatsapp(perfil.whatsapp);
      setEditandoWa(false);
    } else {
      setEditandoWa(true);
    }

    if (!perfil?.qrUrl) {
      setCambiarQr(true);
    }
  }, [perfil]);

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarPublicar(e) {
    e.preventDefault();
    setError("");

    if (!foto) {
      setError("Debes subir una foto atractiva de tu producto.");
      return;
    }

    const waFinal = whatsapp.trim();
    if (!waFinal) {
      setError("Por favor ingresa tu número de WhatsApp para que los clientes puedan contactarte.");
      return;
    }

    // Si no tiene QR guardado y no seleccionó archivo
    if (!perfil?.qrUrl && !qr) {
      setError("Debes subir la foto de tu código QR de cobro.");
      return;
    }

    setSubiendo(true);
    try {
      // 1. Subida de la foto del producto a Cloudinary
      const imagenUrl = await subirImagen(foto, "ms-market/productos");

      // 2. Subida del QR (solo si subió uno nuevo; de lo contrario reusa el guardado)
      let qrUrlFinal = perfil?.qrUrl || "";
      if (qr) {
        qrUrlFinal = await subirImagen(qr, "ms-market/qr");
      }

      // 3. Formatear WhatsApp a estándar internacional (Bolivia por defecto: 591)
      let waLimpio = waFinal.replace(/\D/g, "");
      if (waLimpio.length === 8) {
        waLimpio = `591${waLimpio}`;
      }

      // 4. Guardar o actualizar datos del vendedor en su perfil (para que nunca más vuelva a pedirlo)
      await setDoc(
        doc(db, "usuarios", usuario.uid),
        {
          whatsapp: waLimpio,
          qrUrl: qrUrlFinal,
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );

      // 5. Crear la publicación en la colección de productos
      await addDoc(collection(db, "productos"), {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        precio: Number(form.precio),
        stock: Number(form.stock),
        detalle: form.detalle.trim(),
        envio: form.envio.trim(),
        imagenUrl,
        qrUrl: qrUrlFinal,
        whatsapp: waLimpio,
        vendedorId: usuario.uid,
        vendedorNombre: perfil?.nombre || usuario.displayName || usuario.email.split("@")[0],
        vendido: false,
        creadoEn: serverTimestamp(),
      });

      // Limpieza de formulario
      setForm({ nombre: "", categoria: "Ropa", precio: "", stock: "", detalle: "", envio: "" });
      setFoto(null);
      setQr(null);
      onPublicado?.();
    } catch (err) {
      setError(err.message || "No se pudo publicar el artículo. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <section className="section">
      <div className="section-title">
        <div>
          <h2>Publicar nuevo artículo</h2>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--text-muted)" }}>
            Completa la información para exhibir tu producto en la vitrina de M&amp;S Market.
          </p>
        </div>
      </div>

      <form onSubmit={manejarPublicar} className="form-producto" style={{ maxWidth: "600px" }}>
        <label>Nombre del producto</label>
        <input
          placeholder="Ej: Labial mate indeleble tono cereza"
          value={form.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
          required
        />

        <label>Categoría</label>
        <select value={form.categoria} onChange={(e) => actualizar("categoria", e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="form-row">
          <div>
            <label>Precio (Bs)</label>
            <input
              type="number"
              min="1"
              placeholder="Ej: 45"
              value={form.precio}
              onChange={(e) => actualizar("precio", e.target.value)}
              required
            />
          </div>
          <div>
            <label>Stock disponible</label>
            <input
              type="number"
              min="1"
              placeholder="Ej: 10"
              value={form.stock}
              onChange={(e) => actualizar("stock", e.target.value)}
              required
            />
          </div>
        </div>

        <label>Descripción detallada</label>
        <textarea
          placeholder="Describe características, tonos, tallas, textura, o modo de uso..."
          value={form.detalle}
          onChange={(e) => actualizar("detalle", e.target.value)}
          rows={3}
          required
        />

        <label>Punto de entrega o método de envío</label>
        <input
          placeholder="Ej: Entregas personales en Plaza Principal o envíos por mototaxi"
          value={form.envio}
          onChange={(e) => actualizar("envio", e.target.value)}
          required
        />

        <label>Fotografía del producto</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFoto(e.target.files[0])}
          required
        />

        {/* Sección de WhatsApp del Vendedor */}
        <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", marginTop: "10px" }}>
          <label style={{ margin: 0, fontWeight: "700" }}>Número de WhatsApp de contacto</label>
          <p style={{ margin: "2px 0 10px", fontSize: "12px", color: "var(--text-muted)" }}>
            A este número te escribirán los clientes desde el catálogo para coordinar entregas.
          </p>

          {!editandoWa && perfil?.whatsapp ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span className="mono" style={{ fontSize: "14px", fontWeight: "700", color: "var(--teal)" }}>
                +{perfil.whatsapp} (Guardado en tu perfil)
              </span>
              <button
                type="button"
                className="btn btn-secundario btn-sm"
                onClick={() => setEditandoWa(true)}
              >
                Cambiar número
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="tel"
                placeholder="Ej: 78512345 o +59178512345"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
              />
              {perfil?.whatsapp && (
                <button
                  type="button"
                  className="btn btn-secundario btn-sm"
                  onClick={() => {
                    setWhatsapp(perfil.whatsapp);
                    setEditandoWa(false);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sección de Código QR de Cobro */}
        <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", marginTop: "10px" }}>
          <label style={{ margin: 0, fontWeight: "700" }}>Código QR de cobro bancario</label>
          <p style={{ margin: "2px 0 10px", fontSize: "12px", color: "var(--text-muted)" }}>
            Código QR de tu banco o billetera móvil para recibir pagos directos de tus compradoras.
          </p>

          {!cambiarQr && perfil?.qrUrl ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src={perfil.qrUrl}
                  alt="QR Guardado"
                  style={{ width: "45px", height: "45px", objectFit: "contain", border: "1px solid var(--line)", borderRadius: "4px", background: "#fff" }}
                />
                <span style={{ fontSize: "12.5px", color: "var(--teal)", fontWeight: "600" }}>
                  QR activo en tu perfil
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secundario btn-sm"
                onClick={() => setCambiarQr(true)}
              >
                Cambiar QR
              </button>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setQr(e.target.files[0])}
                required={!perfil?.qrUrl}
              />
              {perfil?.qrUrl && (
                <button
                  type="button"
                  className="link-btn"
                  style={{ marginTop: "6px" }}
                  onClick={() => setCambiarQr(false)}
                >
                  Conservar el QR anterior
                </button>
              )}
            </div>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primario" disabled={subiendo} style={{ marginTop: "16px" }}>
          {subiendo ? "Subiendo imágenes y publicando..." : "Publicar producto en catálogo"}
        </button>
      </form>
    </section>
  );
}