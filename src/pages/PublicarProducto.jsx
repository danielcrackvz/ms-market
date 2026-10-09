import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
  const [foto, setFoto] = useState(null);
  const [qr, setQr] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarPublicar(e) {
    e.preventDefault();
    setError("");

    if (!foto || !qr) {
      setError("Sube una foto del producto y la imagen de tu QR de cobro.");
      return;
    }

    setSubiendo(true);
    try {
      const [imagenUrl, qrUrl] = await Promise.all([
        subirImagen(foto, "ms-market/productos"),
        subirImagen(qr, "ms-market/qr"),
      ]);

      await addDoc(collection(db, "productos"), {
        nombre: form.nombre,
        categoria: form.categoria,
        precio: Number(form.precio),
        stock: Number(form.stock),
        detalle: form.detalle,
        envio: form.envio,
        imagenUrl,
        qrUrl,
        vendedorId: usuario.uid,
        vendedorNombre: perfil?.nombre || usuario.displayName || "Vendedor",
        creadoEn: serverTimestamp(),
      });

      setForm({ nombre: "", categoria: "Ropa", precio: "", stock: "", detalle: "", envio: "" });
      setFoto(null);
      setQr(null);
      onPublicado?.();
    } catch (err) {
      setError(err.message || "No se pudo publicar el producto, intenta nuevamente.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <section className="section">
      <div className="section-title">
        <h2>Publicar producto</h2>
      </div>
      <form onSubmit={manejarPublicar} className="form-producto">
        <label>Nombre del producto</label>
        <input value={form.nombre} onChange={(e) => actualizar("nombre", e.target.value)} required />

        <label>Categoría</label>
        <select value={form.categoria} onChange={(e) => actualizar("categoria", e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="form-row">
          <div>
            <label>Precio (Bs)</label>
            <input type="number" min="0" value={form.precio} onChange={(e) => actualizar("precio", e.target.value)} required />
          </div>
          <div>
            <label>Stock disponible</label>
            <input type="number" min="0" value={form.stock} onChange={(e) => actualizar("stock", e.target.value)} required />
          </div>
        </div>

        <label>Detalle del producto</label>
        <textarea value={form.detalle} onChange={(e) => actualizar("detalle", e.target.value)} rows={3} required />

        <label>Forma de envío o punto de entrega</label>
        <input value={form.envio} onChange={(e) => actualizar("envio", e.target.value)} required />

        <label>Foto del producto</label>
        <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} required />

        <label>Imagen de tu QR de cobro</label>
        <input type="file" accept="image/*" onChange={(e) => setQr(e.target.files[0])} required />

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primario" disabled={subiendo}>
          {subiendo ? "Publicando…" : "Publicar producto"}
        </button>
      </form>
    </section>
  );
}
