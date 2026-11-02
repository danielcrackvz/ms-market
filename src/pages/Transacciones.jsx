import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

function obtenerTiempo(fecha) {
  if (!fecha) return 0;
  if (typeof fecha.toMillis === "function") return fecha.toMillis();
  if (fecha.seconds) return fecha.seconds * 1000;
  if (fecha instanceof Date) return fecha.getTime();
  return 0;
}

function EstadoBadge({ estado }) {
  const esConfirmado = estado === "confirmado";
  return (
    <span className={esConfirmado ? "badge badge--ok" : "badge badge--wait"}>
      {esConfirmado ? "Pago verificado y confirmado" : "Esperando confirmación"}
    </span>
  );
}

export default function Transacciones() {
  const { usuario } = useAuth();
  const [comoComprador, setComoComprador] = useState([]);
  const [comoVendedor, setComoVendedor] = useState([]);
  const [comprobanteModal, setComprobanteModal] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);

  useEffect(() => {
    if (!usuario?.uid) return;

    // Transacciones donde el usuario es el comprador (sin orderBy en Firestore)
    const qComprador = query(
      collection(db, "transacciones"),
      where("compradorId", "==", usuario.uid)
    );
    const desuscribir1 = onSnapshot(
      qComprador,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => obtenerTiempo(b.creadoEn) - obtenerTiempo(a.creadoEn));
        setComoComprador(lista);
      },
      (err) => console.error("Error transacciones comprador:", err)
    );

    // Transacciones donde el usuario es el vendedor que recibe el dinero (sin orderBy en Firestore)
    const qVendedor = query(
      collection(db, "transacciones"),
      where("vendedorId", "==", usuario.uid)
    );
    const desuscribir2 = onSnapshot(
      qVendedor,
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => obtenerTiempo(b.creadoEn) - obtenerTiempo(a.creadoEn));
        setComoVendedor(lista);
      },
      (err) => console.error("Error transacciones vendedor:", err)
    );

    return () => {
      desuscribir1();
      desuscribir2();
    };
  }, [usuario]);

  // Confirmar acreditación del pago y descontar el stock en tiempo real
  async function confirmarPago(t) {
    const confirmacion = window.confirm(
      "¿Has verificado en tu cuenta bancaria que el dinero fue abonado correctamente?"
    );
    if (!confirmacion) return;

    setConfirmandoId(t.id);
    const txRef = doc(db, "transacciones", t.id);

    try {
      await runTransaction(db, async (transaction) => {
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists() || txSnap.data().estado === "confirmado") {
          return; // Prevenir doble descuento
        }

        // Caso 1: Orden del Carrito de Compras (múltiples productos)
        if (t.items && Array.isArray(t.items) && t.items.length > 0) {
          const docsProductos = [];
          for (const item of t.items) {
            if (item.productoId) {
              const pRef = doc(db, "productos", item.productoId);
              const pSnap = await transaction.get(pRef);
              docsProductos.push({ ref: pRef, snap: pSnap, cantidad: item.cantidad || 1 });
            }
          }

          transaction.update(txRef, { estado: "confirmado" });

          for (const itemData of docsProductos) {
            if (itemData.snap.exists()) {
              const stockActual = itemData.snap.data().stock ?? 0;
              const nuevoStock = Math.max(0, stockActual - itemData.cantidad);
              const updates = { stock: nuevoStock };
              if (nuevoStock === 0) updates.vendido = true;
              transaction.update(itemData.ref, updates);
            }
          }
        } 
        // Caso 2: Compra directa individual de un solo producto
        else if (t.productoId) {
          const productoRef = doc(db, "productos", t.productoId);
          const productoSnap = await transaction.get(productoRef);

          transaction.update(txRef, { estado: "confirmado" });

          if (productoSnap.exists()) {
            const stockActual = productoSnap.data().stock ?? 0;
            const nuevoStock = Math.max(0, stockActual - 1);
            const updates = { stock: nuevoStock };
            if (nuevoStock === 0) updates.vendido = true;
            transaction.update(productoRef, updates);
          }
        }
      });
      alert("¡Pago confirmado con éxito! El stock del catálogo se actualizó.");
    } catch (err) {
      console.error(err);
      alert("No se pudo confirmar el pago: " + (err.message || "Inténtalo de nuevo."));
    } finally {
      setConfirmandoId(null);
    }
  }

  if (!usuario) {
    return (
      <section className="section">
        <p className="empty">Inicia sesión para revisar tus transacciones.</p>
      </section>
    );
  }

  return (
    <section className="section">
      {/* ============ Ventas Recibidas ============ */}
      <div className="section-title">
        <div>
          <h2>Ventas y Cobros Recibidos</h2>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--text-muted)" }}>
            Revisa los comprobantes QR subidos por tus compradoras y confirma la acreditación del pago.
          </p>
        </div>
        <span className="mono" style={{ fontSize: "13px", fontWeight: "700" }}>
          {comoVendedor.length} venta(s)
        </span>
      </div>

      {comoVendedor.length === 0 ? (
        <p className="empty">Todavía no has recibido pagos como vendedora.</p>
      ) : (
        <div className="tx-list">
          {comoVendedor.map((t) => {
            const total = t.montoTotal ?? t.monto ?? 0;
            const pendiente = t.estado !== "confirmado";

            return (
              <div className="tx-row" key={t.id}>
                <div className="tx-info" style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Cliente: <b>{t.compradorNombre || t.compradorEmail || "Compradora"}</b>
                    </span>
                  </div>

                  {t.items && Array.isArray(t.items) ? (
                    <div style={{ marginTop: "6px" }}>
                      <h4 style={{ margin: "0 0 4px", fontSize: "15px" }}>
                        Orden Carrito ({t.items.length} producto{t.items.length > 1 ? "s" : ""})
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--text-muted)" }}>
                        {t.items.map((it, idx) => (
                          <li key={idx}>
                            {it.nombre} — <b>{it.cantidad} unidad(es)</b> (Bs {it.precio} c/u)
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <h4 style={{ margin: "4px 0 0", fontSize: "15px" }}>{t.productoNombre}</h4>
                  )}
                </div>

                <div className="tx-right">
                  <span className="tx-monto mono" style={{ fontSize: "17px", fontWeight: "800" }}>
                    Bs {total}
                  </span>

                  <EstadoBadge estado={t.estado} />

                  {t.comprobanteUrl && (
                    <button
                      type="button"
                      className="btn btn-secundario btn-sm"
                      onClick={() => setComprobanteModal(t.comprobanteUrl)}
                    >
                      🔍 Ver Comprobante
                    </button>
                  )}

                  {pendiente && (
                    <button
                      type="button"
                      className="btn btn-ok btn-sm"
                      disabled={confirmandoId === t.id}
                      onClick={() => confirmarPago(t)}
                    >
                      {confirmandoId === t.id ? "Verificando..." : "✓ Confirmar Acreditación"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ Mis Compras Realizadas ============ */}
      <div className="section-title" style={{ marginTop: "48px" }}>
        <div>
          <h2>Mis Compras</h2>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--text-muted)" }}>
            Seguimiento de pedidos realizados y estado de confirmación de tus transferencias QR.
          </p>
        </div>
        <span className="mono" style={{ fontSize: "13px", fontWeight: "700" }}>
          {comoComprador.length} compra(s)
        </span>
      </div>

      {comoComprador.length === 0 ? (
        <p className="empty">Todavía no has realizado ninguna compra en la tienda.</p>
      ) : (
        <div className="tx-list">
          {comoComprador.map((t) => {
            const total = t.montoTotal ?? t.monto ?? 0;
            return (
              <div className="tx-row" key={t.id}>
                <div className="tx-info" style={{ flex: 1, minWidth: "260px" }}>
                  <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Vendedora: <b>{t.vendedorNombre || "Emprendedora M&S"}</b>
                  </div>

                  {t.items && Array.isArray(t.items) ? (
                    <div style={{ marginTop: "6px" }}>
                      <h4 style={{ margin: "0 0 4px", fontSize: "15px" }}>
                        Pedido en carrito ({t.items.length} artículo{t.items.length > 1 ? "s" : ""})
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--text-muted)" }}>
                        {t.items.map((it, idx) => (
                          <li key={idx}>
                            {it.nombre} (x{it.cantidad}) — Bs {it.precio * it.cantidad}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <h4 style={{ margin: "4px 0 0", fontSize: "15px" }}>{t.productoNombre}</h4>
                  )}
                </div>

                <div className="tx-right">
                  <span className="tx-monto mono" style={{ fontSize: "17px", fontWeight: "800" }}>
                    Bs {total}
                  </span>
                  <EstadoBadge estado={t.estado} />
                  {t.comprobanteUrl && (
                    <button
                      type="button"
                      className="btn btn-secundario btn-sm"
                      onClick={() => setComprobanteModal(t.comprobanteUrl)}
                    >
                      Ver mi comprobante
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ Modal Visor de Comprobante ============ */}
      {comprobanteModal && (
        <div className="overlay" onClick={() => setComprobanteModal(null)}>
          <div
            className="modal"
            style={{ maxWidth: "520px", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setComprobanteModal(null)}>
              ✕
            </button>
            <h3 style={{ marginBottom: "14px", fontSize: "18px" }}>Comprobante de Transferencia QR</h3>
            <div
              style={{
                maxHeight: "65vh",
                overflowY: "auto",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "8px",
                background: "#fdfdfd",
              }}
            >
              <img
                src={comprobanteModal}
                alt="Comprobante de pago"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "4px" }}
              />
            </div>
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <a
                href={comprobanteModal}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secundario btn-sm"
              >
                Abrir imagen completa
              </a>
              <button
                type="button"
                className="btn btn-primario btn-sm"
                onClick={() => setComprobanteModal(null)}
              >
                Cerrar visor
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}