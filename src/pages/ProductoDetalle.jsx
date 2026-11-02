import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { subirImagen } from "../lib/cloudinary";
import { useAuth } from "../AuthContext";

export default function ProductoDetalle({ producto, onCerrar, onAgregarAlCarrito }) {
  const { usuario, perfil } = useAuth();
  const [cantidad, setCantidad] = useState(1);
  const [subiendo, setSubiendo] = useState(false);
  const [yaEnviado, setYaEnviado] = useState(false);
  const [error, setError] = useState("");

  const esMiPropioProducto = usuario && producto.vendedorId === usuario.uid;
  const stockDisponible = Number(producto.stock) || 0;

  // Enlace directo a WhatsApp del vendedor
  const numeroWa = producto.whatsapp ? producto.whatsapp.replace(/\D/g, "") : null;
  const linkWhatsApp = numeroWa
    ? `https://wa.me/${numeroWa}?text=${encodeURIComponent(
        `¡Hola ${producto.vendedorNombre}! Tengo una consulta sobre el producto "${producto.nombre}" en M&S Market.`
      )}`
    : null;

  // Pago directo e individual desde la ficha de detalle (flujo clásico por si no usan el carrito)
  async function subirComprobante(e) {
    const archivo = e.target.files?.[0];
    if (!archivo || !usuario) return;

    setSubiendo(true);
    setError("");
    try {
      const comprobanteUrl = await subirImagen(archivo, "ms-market/comprobantes");

      await addDoc(collection(db, "transacciones"), {
        productoId: producto.id,
        productoNombre: producto.nombre,
        monto: producto.precio,
        compradorId: usuario.uid,
        compradorNombre: perfil?.nombre || usuario.displayName || usuario.email,
        compradorEmail: usuario.email,
        vendedorId: producto.vendedorId,
        vendedorNombre: producto.vendedorNombre,
        comprobanteUrl,
        estado: "esperando_confirmacion",
        creadoEn: serverTimestamp(),
      });

      setYaEnviado(true);
    } catch (err) {
      setError(err.message || "No se pudo subir el comprobante. Intenta nuevamente.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCerrar} aria-label="Cerrar modal">
          ✕
        </button>

        <h2 style={{ fontSize: "22px", marginBottom: "4px" }}>{producto.nombre}</h2>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
          Categoría: <b>{producto.categoria}</b>
        </span>

        <div className="modal-grid">
          {/* Columna Izquierda: Imagen y Ficha */}
          <div>
            <div className="modal-foto">
              {producto.imagenUrl ? (
                <img src={producto.imagenUrl} alt={producto.nombre} />
              ) : (
                <span style={{ fontSize: "56px" }}>🛍️</span>
              )}
            </div>

            <div className="detalle-lista">
              <b>Descripción del producto</b>
              <p style={{ margin: "4px 0", color: "var(--text-main)" }}>
                {producto.detalle || "Sin descripción adicional."}
              </p>

              <b>Vendedora</b>
              <p style={{ margin: "4px 0" }}>{producto.vendedorNombre}</p>

              <b>Punto de entrega o método de envío</b>
              <p style={{ margin: "4px 0" }}>{producto.envio || "A coordinar con la vendedora"}</p>
            </div>

            {/* Botón de WhatsApp directo */}
            {linkWhatsApp && (
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noreferrer"
                className="btn-wa"
                style={{ width: "100%", marginTop: "16px", textDecoration: "none" }}
              >
                💬 Contactar a {producto.vendedorNombre} por WhatsApp
              </a>
            )}
          </div>

          {/* Columna Derecha: Opciones de Compra y Pago QR */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Caja de Acción para Carrito */}
            <div
              style={{
                background: "var(--bg-main)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                padding: "18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                <span style={{ fontSize: "22px", fontWeight: "800", fontFamily: "JetBrains Mono" }}>
                  Bs {producto.precio}
                </span>
                <span style={{ fontSize: "12px", fontWeight: "600", color: stockDisponible > 0 ? "var(--teal)" : "var(--danger)" }}>
                  {stockDisponible > 0 ? `${stockDisponible} disponibles` : "Agotado"}
                </span>
              </div>

              {stockDisponible > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600" }}>Cantidad:</label>
                  <div className="item-qty">
                    <button
                      className="btn-qty"
                      type="button"
                      onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    >
                      −
                    </button>
                    <span style={{ minWidth: "24px", textAlign: "center", fontWeight: "700" }}>
                      {cantidad}
                    </span>
                    <button
                      className="btn-qty"
                      type="button"
                      onClick={() => setCantidad((c) => Math.min(stockDisponible, c + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn btn-primario"
                style={{ width: "100%" }}
                disabled={stockDisponible <= 0}
                onClick={() => {
                  if (onAgregarAlCarrito) {
                    onAgregarAlCarrito(producto, cantidad);
                  }
                }}
              >
                🛒 Añadir al Carrito de Compras
              </button>
            </div>

            {/* Ticket de Pago QR Individual */}
            {esMiPropioProducto ? (
              <div className="ticket" style={{ margin: 0, textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                  Eres la dueña de este producto. Los compradores podrán ver aquí tu código QR para transferirte.
                </p>
              </div>
            ) : (
              <div className="ticket" style={{ margin: 0 }}>
                <div className="ticket-top">
                  <h3 style={{ fontSize: "15px" }}>Pago inmediato a {producto.vendedorNombre}</h3>
                  <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Escanea con tu aplicación bancaria
                  </div>
                </div>

                <div className="qr-real">
                  {producto.qrUrl ? (
                    <img src={producto.qrUrl} alt={`QR de ${producto.vendedorNombre}`} />
                  ) : (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                      QR no disponible
                    </p>
                  )}
                </div>

                <div className="ticket-divider" />

                <div className="ticket-row">
                  <span>Total directo (1 unidad):</span>
                  <b className="mono">Bs {producto.precio}</b>
                </div>

                {!usuario ? (
                  <p className="auth-error" style={{ textAlign: "center" }}>
                    Inicia sesión para subir tu comprobante de pago directo.
                  </p>
                ) : yaEnviado ? (
                  <div style={{ textAlign: "center", marginTop: "10px" }}>
                    <span className="badge badge--wait">Comprobante enviado (Esperando confirmación)</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      id="input-comprobante-directo"
                      style={{ display: "none" }}
                      disabled={subiendo}
                      onChange={subirComprobante}
                    />
                    <button
                      type="button"
                      className="btn btn-secundario"
                      style={{ width: "100%", marginTop: "8px" }}
                      disabled={subiendo || !producto.qrUrl}
                      onClick={() => document.getElementById("input-comprobante-directo").click()}
                    >
                      {subiendo ? "Subiendo captura..." : "📷 Subir comprobante directo"}
                    </button>
                  </>
                )}

                {error && <div className="auth-error">{error}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}