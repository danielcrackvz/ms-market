import React, { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { subirImagen } from "../lib/cloudinary";
import { useAuth } from "../AuthContext";

const CATEGORIAS = ["Ropa", "Accesorios", "Belleza"];

function obtenerTiempo(fecha) {
  if (!fecha) return 0;
  if (typeof fecha.toMillis === "function") return fecha.toMillis();
  if (fecha.seconds) return fecha.seconds * 1000;
  if (fecha instanceof Date) return fecha.getTime();
  return 0;
}

export default function MisProductos() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [borrando, setBorrando] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(null);

  useEffect(() => {
    if (!usuario?.uid) return;

    // Consulta con 'where' directo sin 'orderBy' para evitar el bloqueo por falta de índice compuesto
    const q = query(
      collection(db, "productos"),
      where("vendedorId", "==", usuario.uid)
    );

    const desuscribir = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Ordenamos en memoria del cliente por fecha más reciente
        lista.sort((a, b) => obtenerTiempo(b.creadoEn) - obtenerTiempo(a.creadoEn));
        setProductos(lista);
      },
      (error) => {
        console.error("Error al cargar mis productos:", error);
      }
    );

    return desuscribir;
  }, [usuario]);

  async function borrarProducto(id) {
    const confirmar = window.confirm("¿Seguro que deseas eliminar este producto de la tienda?");
    if (!confirmar) return;
    setBorrando(id);
    try {
      await deleteDoc(doc(db, "productos", id));
    } catch (err) {
      alert("Error al borrar: " + err.message);
    } finally {
      setBorrando(null);
    }
  }

  async function alternarVendido(producto) {
    setCambiandoEstado(producto.id);
    try {
      await updateDoc(doc(db, "productos", producto.id), { vendido: !producto.vendido });
    } catch (err) {
      alert("Error al cambiar estado: " + err.message);
    } finally {
      setCambiandoEstado(null);
    }
  }

  if (!usuario) {
    return (
      <section className="section">
        <p className="empty">Inicia sesión para gestionar tus publicaciones.</p>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-title">
        <div>
          <h2>Panel de mis publicaciones</h2>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--text-muted)" }}>
            Administra tus precios, disponibilidad de stock y estados de venta.
          </p>
        </div>
        <span className="mono" style={{ fontSize: "13px", fontWeight: "700" }}>
          {productos.length} producto(s) en catálogo
        </span>
      </div>

      {productos.length === 0 ? (
        <p className="empty">Todavía no has publicado ningún producto en la plataforma.</p>
      ) : (
        <div className="mis-productos-lista">
          {productos.map((p) =>
            editandoId === p.id ? (
              <FilaEdicion
                key={p.id}
                producto={p}
                onCancelar={() => setEditandoId(null)}
                onGuardado={() => setEditandoId(null)}
              />
            ) : (
              <div
                className="tx-row"
                key={p.id}
                style={p.vendido ? { opacity: 0.65, background: "var(--bg-main)" } : undefined}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                      border: "1px solid var(--line)",
                      flexShrink: 0,
                      background: "#fff",
                    }}
                  >
                    {p.imagenUrl ? (
                      <img
                        src={p.imagenUrl}
                        alt={p.nombre}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        🛍️
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--primary)" }}>
                      {p.categoria}
                    </span>
                    <h3 style={{ margin: "2px 0 4px", fontSize: "16px" }}>{p.nombre}</h3>
                    <div style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
                      <span className="mono" style={{ fontWeight: "800", fontSize: "15px" }}>
                        Bs {p.precio}
                      </span>
                      {p.vendido ? (
                        <span className="badge" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                          Pausado / Vendido
                        </span>
                      ) : (
                        <span className="card-stock">{p.stock} unidades disponibles</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tx-right">
                  <button
                    className="btn btn-secundario btn-sm"
                    disabled={cambiandoEstado === p.id}
                    onClick={() => alternarVendido(p)}
                  >
                    {cambiandoEstado === p.id ? "Actualizando…" : p.vendido ? "Reactivar" : "Pausar venta"}
                  </button>
                  <button
                    className="btn btn-secundario btn-sm"
                    onClick={() => setEditandoId(p.id)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-secundario btn-sm"
                    style={{ color: "var(--danger)" }}
                    disabled={borrando === p.id}
                    onClick={() => borrarProducto(p.id)}
                  >
                    {borrando === p.id ? "Eliminando…" : "Eliminar"}
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
    whatsapp: producto.whatsapp || "",
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
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        precio: Number(form.precio),
        stock: Number(form.stock),
        detalle: form.detalle.trim(),
        envio: form.envio.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ""),
      };

      if (nuevaFoto) {
        cambios.imagenUrl = await subirImagen(nuevaFoto, "ms-market/productos");
      }

      await updateDoc(doc(db, "productos", producto.id), cambios);
      onGuardado();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="tx-row"
      style={{
        flexDirection: "column",
        alignItems: "stretch",
        gap: "14px",
        background: "var(--bg-main)",
        border: "1.5px solid var(--primary)",
      }}
    >
      <h4 style={{ margin: 0, fontSize: "15px", color: "var(--primary)" }}>Editando: {producto.nombre}</h4>
      <div className="form-row">
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600" }}>Nombre del producto</label>
          <input value={form.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600" }}>Categoría</label>
          <select value={form.categoria} onChange={(e) => actualizar("categoria", e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600" }}>Precio (Bs)</label>
          <input type="number" min="1" value={form.precio} onChange={(e) => actualizar("precio", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600" }}>Stock disponible</label>
          <input type="number" min="0" value={form.stock} onChange={(e) => actualizar("stock", e.target.value)} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: "12px", fontWeight: "600" }}>Número de WhatsApp asociado</label>
        <input value={form.whatsapp} onChange={(e) => actualizar("whatsapp", e.target.value)} placeholder="Ej: 59178512345" />
      </div>

      <div>
        <label style={{ fontSize: "12px", fontWeight: "600" }}>Descripción del producto</label>
        <textarea rows={2} value={form.detalle} onChange={(e) => actualizar("detalle", e.target.value)} />
      </div>

      <div>
        <label style={{ fontSize: "12px", fontWeight: "600" }}>Forma de entrega o envío</label>
        <input value={form.envio} onChange={(e) => actualizar("envio", e.target.value)} />
      </div>

      <div>
        <label style={{ fontSize: "12px", fontWeight: "600" }}>Reemplazar fotografía (opcional)</label>
        <input type="file" accept="image/*" onChange={(e) => setNuevaFoto(e.target.files[0])} />
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
        <button className="btn btn-primario btn-sm" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Confirmar cambios"}
        </button>
        <button className="btn btn-secundario btn-sm" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}