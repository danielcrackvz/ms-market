import React, { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, runTransaction, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

function EstadoBadge({ estado }) {
  const mapa = {
    confirmado: { texto: "Pago confirmado", clase: "badge badge--ok" },
    pendiente_confirmacion: { texto: "Esperando confirmación", clase: "badge badge--wait" },
  };
  const info = mapa[estado] || mapa.pendiente_confirmacion;
  return <span className={info.clase}>{info.texto}</span>;
}

export default function Transacciones() {
  const { usuario } = useAuth();
  const [comoComprador, setComoComprador] = useState([]);
  const [comoVendedor, setComoVendedor] = useState([]);

  useEffect(() => {
    if (!usuario) return;

    const qComprador = query(
      collection(db, "transacciones"),
      where("compradorId", "==", usuario.uid),
      orderBy("creadoEn", "desc")
    );
    const desuscribir1 = onSnapshot(qComprador, (snap) =>
      setComoComprador(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const qVendedor = query(
      collection(db, "transacciones"),
      where("vendedorId", "==", usuario.uid),
      orderBy("creadoEn", "desc")
    );
    const desuscribir2 = onSnapshot(qVendedor, (snap) =>
      setComoVendedor(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      desuscribir1();
      desuscribir2();
    };
  }, [usuario]);

  async function confirmarPago(t) {
    const txRef = doc(db, "transacciones", t.id);
    const productoRef = doc(db, "productos", t.productoId);

    try {
      await runTransaction(db, async (transaction) => {
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists() || txSnap.data().estado === "confirmado") return; // evita doble descuento

        const productoSnap = await transaction.get(productoRef);
        const stockActual = productoSnap.exists() ? productoSnap.data().stock ?? 0 : 0;
        const nuevoStock = Math.max(0, stockActual - 1);

        transaction.update(txRef, { estado: "confirmado" });
        if (productoSnap.exists()) {
          transaction.update(productoRef, { stock: nuevoStock });
        }
      });
    } catch (err) {
      alert("No se pudo confirmar el pago: " + (err.message || "intenta nuevamente."));
    }
  }

  if (!usuario) {
    return <section className="section"><p className="empty">Inicia sesión para ver tus transacciones.</p></section>;
  }

  return (
    <section className="section">
      <div className="section-title">
        <h2>Ventas por confirmar</h2>
      </div>
      {comoVendedor.length === 0 ? (
        <p className="empty">Todavía no recibiste pagos como vendedor.</p>
      ) : (
        <div className="tx-list">
          {comoVendedor.map((t) => (
            <div className="tx-row" key={t.id}>
              <div className="tx-info">
                <div className="mono">Comprador: {t.compradorNombre}</div>
                <h3>{t.productoNombre}</h3>
              </div>
              <div className="tx-right">
                {t.comprobanteUrl && (
                  <a href={t.comprobanteUrl} target="_blank" rel="noreferrer" className="btn btn-secundario">
                    Ver comprobante
                  </a>
                )}
                <span className="tx-monto mono">Bs {t.monto}</span>
                <EstadoBadge estado={t.estado} />
                {t.estado === "pendiente_confirmacion" && (
                  <button className="btn btn-ok" onClick={() => confirmarPago(t)}>Confirmar pago</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title" style={{ marginTop: 32 }}>
        <h2>Mis compras</h2>
      </div>
      {comoComprador.length === 0 ? (
        <p className="empty">Todavía no hiciste ninguna compra.</p>
      ) : (
        <div className="tx-list">
          {comoComprador.map((t) => (
            <div className="tx-row" key={t.id}>
              <div className="tx-info">
                <div className="mono">Vendedor: {t.vendedorNombre}</div>
                <h3>{t.productoNombre}</h3>
              </div>
              <div className="tx-right">
                <span className="tx-monto mono">Bs {t.monto}</span>
                <EstadoBadge estado={t.estado} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
