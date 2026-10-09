import React, { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { subirImagen } from "../lib/cloudinary";
import { useAuth } from "../AuthContext";

const CATEGORIAS = ["Ropa", "Accesorios", "Belleza"];

export default function MisProductos() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [borrando, setBorrando] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    const q = query(
      collection(db, "productos"),
      where("vendedorId", "==", usuario.uid),
      orderBy("creadoEn", "desc")
    );
    const desuscribir = onSnapshot(q, (snap) =>
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return desuscribir;
  }, [usuario]);

  async function borrarProducto(id) {
    const confirmar = window.confirm("¿Seguro que quieres borrar esta publicación? Esta acción no se puede deshacer.");
    if (!confirmar) return;
    setBorrando(id);
    try {
      await deleteDoc(doc(db, "productos", id));
    } finally {
      setBorrando(null);
    }
  }

  if (!usuario) {
    return <section className="section"><p className="empty">Inicia sesión para ver tus productos.</p></section>;
  }

  return (
    <section className="section">
      <div className="section-title">
        <h2>Mis productos</h2>
        <span className="mono">{productos.length} publicados</span>
      </div>

      {productos.length === 0 ? (
        <p className="empty">Todavía no publicaste ningún producto.</p>
      ) : (
        <div className="mis-productos-lista">
          {productos.map((p) =>
            editandoId === p.id ? (
              <FilaEdicion key={p.id} producto={p} onCancelar={() => setEditandoId(null)} onGuardado={() => setEditandoId(null)} />
            ) : (
              <div className="tx-row" key={p.id}>
                <div className="tx-info" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", border: "1.5px solid var(--ink)", flexShrink: 0 }}>
                    {p.imagenUrl && <img src={p.imagenUrl} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div>
                    <div className="mono">{p.categoria} · Bs {p.precio}</div>
                    <h3>{p.nombre}</h3>
                    <div className="card-stock">{p.stock} disponibles</div>
                  </div>
                </div>
                <div className="tx-right">
                  <button className="btn btn-secundario" onClick={() => setEditandoId(p.id)}>Editar</button>
                  <button className="btn btn-secundario" disabled={borrando === p.id} onClick={() => borrarProducto(p.id)}>
                    {borrando === p.id ? "Borrando…" : "Borrar"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function FilaEdicion({ producto, onCancelar, onGuardado }) {
  const [form, setForm] = useState({
    nombre: producto.nombre,
    categoria: producto.categoria,
    precio: producto.precio,
    stock: producto.stock,
    detalle: producto.detalle,
    envio: producto.envio,
  });
  const [nuevaFoto, setNuevaFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      const cambios = {
        nombre: form.nombre,
        categoria: form.categoria,
        precio: Number(form.precio),
        stock: Number(form.stock),
        detalle: form.detalle,
        envio: form.envio,
      };
      if (nuevaFoto) {
        cambios.imagenUrl = await subirImagen(nuevaFoto, "ms-market/productos");
      }
      await updateDoc(doc(db, "productos", producto.id), cambios);
      onGuardado();
    } catch (err) {
      setError(err.message || "No se pudo guardar el cambio.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="tx-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <div className="form-row">
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Nombre</label>
          <input value={form.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Categoría</label>
          <select value={form.categoria} onChange={(e) => actualizar("categoria", e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Precio (Bs)</label>
          <input type="number" min="0" value={form.precio} onChange={(e) => actualizar("precio", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Stock</label>
          <input type="number" min="0" value={form.stock} onChange={(e) => actualizar("stock", e.target.value)} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Detalle</label>
        <textarea rows={2} value={form.detalle} onChange={(e) => actualizar("detalle", e.target.value)} style={{ width: "100%" }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Forma de envío</label>
        <input value={form.envio} onChange={(e) => actualizar("envio", e.target.value)} style={{ width: "100%" }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Cambiar foto (opcional)</label>
        <input type="file" accept="image/*" onChange={(e) => setNuevaFoto(e.target.files[0])} />
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primario" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        <button className="btn btn-secundario" onClick={onCancelar} disabled={guardando}>Cancelar</button>
      </div>
    </div>
  );
}
