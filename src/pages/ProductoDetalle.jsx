import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { subirImagen } from "../lib/cloudinary";
import { useAuth } from "../AuthContext";
import { obtenerOCrearConversacion } from "../lib/mensajeria";

export default function ProductoDetalle({ producto, onCerrar, onIrAMensajes }) {
  const { usuario, perfil } = useAuth();
  const [comprobante, setComprobante] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [yaEnviado, setYaEnviado] = useState(false);
  const [error, setError] = useState("");

  const esMiPropioProducto = usuario && producto.vendedorId === usuario.uid;

  async function subirComprobante(e) {
    const archivo = e.target.files?.[0];
    if (!archivo || !usuario) return;

    setSubiendo(true);
    setError("");
    try {
      const comprobanteUrl = await subirImagen(archivo, "ms-market/comprobantes");
      setComprobante(comprobanteUrl);

      await addDoc(collection(db, "transacciones"), {
        productoId: producto.id,
        productoNombre: producto.nombre,
        monto: producto.precio,
        compradorId: usuario.uid,
        compradorNombre: perfil?.nombre || usuario.displayName || "Comprador",
        vendedorId: producto.vendedorId,
        vendedorNombre: producto.vendedorNombre,
        comprobanteUrl,
        estado: "pendiente_confirmacion",
        creadoEn: serverTimestamp(),
      });

      setYaEnviado(true);
    } catch (err) {
      setError(err.message || "No se pudo subir el comprobante, intenta nuevamente.");
    } finally {
      setSubiendo(false);
    }
  }

  async function contactarVendedor() {
    if (!usuario) return;
    const conversacionId = await obtenerOCrearConversacion({
      compradorId: usuario.uid,
      compradorNombre: perfil?.nombre || usuario.displayName || "Comprador",
      vendedorId: producto.vendedorId,
      vendedorNombre: producto.vendedorNombre,
      productoId: producto.id,
      productoNombre: producto.nombre,
    });
    onIrAMensajes(conversacionId);
  }

  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCerrar}>✕</button>
        <h2>{producto.nombre}</h2>
        <div className="modal-grid">
          <div>
            <div className="modal-foto">
              {producto.imagenUrl ? <img src={producto.imagenUrl} alt={producto.nombre} /> : "🛍️"}
            </div>
            <div className="detalle-lista">
              <b>Precio</b> Bs {producto.precio} · {producto.stock} disponibles<br /><br />
              <b>Detalle</b> {producto.detalle}<br /><br />
              <b>Vendedor</b> {producto.vendedorNombre}<br /><br />
              <b>Forma de envío</b> {producto.envio}
            </div>
            {!esMiPropioProducto && usuario && (
              <button className="btn btn-secundario" style={{ marginTop: 14, width: "100%" }} onClick={contactarVendedor}>
                Contactar al vendedor
              </button>
            )}
          </div>

          {esMiPropioProducto ? (
            <div className="ticket" style={{ margin: 0, maxWidth: "none" }}>
              <p style={{ fontSize: 13, color: "#7A6C56" }}>
                Este es tu propio producto — los compradores verán aquí tu QR para pagarte directamente.
              </p>
            </div>
          ) : (
            <div className="ticket" style={{ margin: 0, maxWidth: "none" }}>
              <div className="ticket-top">
                <div>
                  <h3>Pagar a {producto.vendedorNombre}</h3>
                  <div className="mono">QR del vendedor</div>
                </div>
              </div>
              <div className="qr-real">
                {producto.qrUrl ? <img src={producto.qrUrl} alt="QR del vendedor" /> : <p>Sin QR cargado</p>}
              </div>
              <div className="ticket-divider" />
              <div className="ticket-row">
                <span>Monto a pagar</span>
                <b className="mono">Bs {producto.precio}</b>
              </div>

              {!usuario ? (
                <p className="auth-error">Inicia sesión para poder pagar y subir tu comprobante.</p>
              ) : yaEnviado ? (
                <div className="ticket-row">
                  <span>Comprobante</span>
                  <span className="badge badge--wait">Esperando confirmación</span>
                </div>
              ) : (
                <>
                  <input type="file" accept="image/*" id="input-comprobante" style={{ display: "none" }} onChange={subirComprobante} />
                  <button
                    className="btn btn-primario"
                    style={{ width: "100%", marginTop: 8 }}
                    disabled={subiendo}
                    onClick={() => document.getElementById("input-comprobante").click()}
                  >
                    {subiendo ? "Subiendo…" : "Subir comprobante de pago"}
                  </button>
                </>
              )}
              {error && <div className="auth-error">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
