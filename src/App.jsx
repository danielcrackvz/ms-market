import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Catalogo from "./pages/Catalogo";
import PublicarProducto from "./pages/PublicarProducto";
import MisProductos from "./pages/MisProductos";
import Transacciones from "./pages/Transacciones";
import ProductoDetalle from "./pages/ProductoDetalle";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import { useAuth } from "./AuthContext";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { subirImagen } from "./lib/cloudinary";

export default function App() {
  const { usuario, cargando } = useAuth();
  const [tab, setTab] = useState("explorar");
  const [vistaAuth, setVistaAuth] = useState("login");
  const [productoAbierto, setProductoAbierto] = useState(null);

  // ============ Estado Global del Carrito ============
  const [carrito, setCarrito] = useState(() => {
    try {
      const guardado = localStorage.getItem("msm_carrito");
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [ordenAPagar, setOrdenAPagar] = useState(null);
  const [archivoComprobante, setArchivoComprobante] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [mensajePago, setMensajePago] = useState("");

  // Guardar carrito en LocalStorage
  useEffect(() => {
    localStorage.setItem("msm_carrito", JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    if (usuario && tab === "login") {
      setTab("explorar");
    }
  }, [usuario, tab]);

  if (cargando) {
    return <div className="empty">Cargando M&amp;S Market…</div>;
  }

  // Funciones de Carrito
  function agregarAlCarrito(producto, cantidad = 1) {
    setCarrito((prev) => {
      const existeIndex = prev.findIndex((item) => item.id === producto.id);
      if (existeIndex >= 0) {
        const copia = [...prev];
        const nuevaCant = copia[existeIndex].cantidad + cantidad;
        copia[existeIndex] = {
          ...copia[existeIndex],
          cantidad: Math.min(nuevaCant, producto.stock || 99),
        };
        return copia;
      }
      return [
        ...prev,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio) || 0,
          imagenUrl: producto.imagenUrl || "",
          qrUrl: producto.qrUrl || "",
          vendedorId: producto.vendedorId,
          vendedorNombre: producto.vendedorNombre || "Vendedor M&S",
          whatsapp: producto.whatsapp || "",
          cantidad: Math.min(cantidad, producto.stock || 99),
          stock: producto.stock || 1,
        },
      ];
    });
  }

  function cambiarCantidad(id, delta) {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nueva = item.cantidad + delta;
            return nueva > 0 ? { ...item, cantidad: Math.min(nueva, item.stock) } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  }

  function eliminarDelCarrito(id) {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  }

  const totalItemsCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  // Agrupar items del carrito por vendedor para el pago QR individual
  const gruposVendedor = carrito.reduce((acc, item) => {
    const vId = item.vendedorId || "desconocido";
    if (!acc[vId]) {
      acc[vId] = {
        vendedorId: vId,
        vendedorNombre: item.vendedorNombre,
        qrUrl: item.qrUrl,
        whatsapp: item.whatsapp,
        items: [],
        subtotal: 0,
      };
    }
    acc[vId].items.push(item);
    acc[vId].subtotal += item.precio * item.cantidad;
    return acc;
  }, {});

  // Subir comprobante y registrar transacción de la orden
  async function confirmarPagoOrden(e) {
    e.preventDefault();
    if (!usuario) {
      alert("Debes iniciar sesión para confirmar tu compra.");
      setCarritoAbierto(false);
      setOrdenAPagar(null);
      setTab("login");
      return;
    }
    if (!archivoComprobante) {
      alert("Por favor selecciona la foto de tu comprobante de pago QR.");
      return;
    }

    try {
      setProcesandoPago(true);
      setMensajePago("Subiendo comprobante bancario...");
      const comprobanteUrl = await subirImagen(archivoComprobante, "ms-market/comprobantes");

      setMensajePago("Registrando transacción...");
      await addDoc(collection(db, "transacciones"), {
        compradorId: usuario.uid,
        compradorEmail: usuario.email,
        vendedorId: ordenAPagar.vendedorId,
        vendedorNombre: ordenAPagar.vendedorNombre,
        montoTotal: ordenAPagar.subtotal,
        comprobanteUrl,
        estado: "esperando_confirmacion",
        items: ordenAPagar.items.map((i) => ({
          productoId: i.id,
          nombre: i.nombre,
          precio: i.precio,
          cantidad: i.cantidad,
        })),
        creadoEn: serverTimestamp(),
      });

      setCarrito((prev) => prev.filter((i) => i.vendedorId !== ordenAPagar.vendedorId));
      setOrdenAPagar(null);
      setArchivoComprobante(null);
      setMensajePago("");
      alert("¡Comprobante enviado con éxito! El vendedor revisará tu pago.");
      setCarritoAbierto(false);
      setTab("transacciones");
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago: " + (err.message || "Inténtalo de nuevo"));
    } finally {
      setProcesandoPago(false);
      setMensajePago("");
    }
  }

  return (
    <div className="msm-root">
      <Navbar
        tab={tab}
        setTab={setTab}
        totalItemsCarrito={totalItemsCarrito}
        onAbrirCarrito={() => setCarritoAbierto(true)}
      />

      <main className="msm-content">
        {tab === "login" && (
          <div className="auth-wrap">
            {vistaAuth === "login" ? (
              <Login irARegistro={() => setVistaAuth("registro")} />
            ) : (
              <Registro irALogin={() => setVistaAuth("login")} />
            )}
          </div>
        )}

        {tab === "explorar" && (
          <Catalogo
            onAbrirProducto={(prod) => setProductoAbierto(prod)}
            onAgregarAlCarrito={agregarAlCarrito}
          />
        )}
        {tab === "publicar" && (
          <PublicarProducto onPublicado={() => setTab("explorar")} />
        )}
        {tab === "mis-productos" && <MisProductos />}
        {tab === "transacciones" && <Transacciones />}
      </main>

      {/* Modal de Detalle */}
      {productoAbierto && (
        <ProductoDetalle
          producto={productoAbierto}
          onCerrar={() => setProductoAbierto(null)}
          onAgregarAlCarrito={(prod, cant) => {
            agregarAlCarrito(prod, cant);
            setProductoAbierto(null);
          }}
        />
      )}

      {/* Drawer / Modal del Carrito */}
      {carritoAbierto && (
        <div className="overlay" onClick={() => setCarritoAbierto(false)}>
          <div className="drawer-carrito" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCarritoAbierto(false)}>
              ✕
            </button>
            <h2 style={{ marginBottom: "6px" }}>Tu Carrito de Compras</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px", marginBottom: "20px" }}>
              Los productos se dividen automáticamente según su vendedor para que pagues directamente a su QR personal.
            </p>

            {carrito.length === 0 ? (
              <div className="empty">El carrito está vacío. ¡Explora nuestros productos de belleza!</div>
            ) : (
              <>
                {Object.values(gruposVendedor).map((grupo) => (
                  <div key={grupo.vendedorId} className="grupo-vendedor">
                    <div className="grupo-vendedor-header">
                      <div>
                        <h4>Vendedor: {grupo.vendedorNombre}</h4>
                        {grupo.whatsapp && (
                          <a
                            href={`https://wa.me/${grupo.whatsapp.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(
                              grupo.vendedorNombre
                            )},%20tengo%20una%20consulta%20sobre%20mi%20pedido%20en%20M%26S%20Market`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-wa"
                            style={{ padding: "4px 8px", fontSize: "11px", marginTop: "4px", display: "inline-flex" }}
                          >
                            💬 Contactar por WhatsApp
                          </a>
                        )}
                      </div>
                      <span className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {grupo.items.length} producto(s)
                      </span>
                    </div>

                    {grupo.items.map((item) => (
                      <div key={item.id} className="item-carrito">
                        <img src={item.imagenUrl || "https://placehold.co/50"} alt={item.nombre} />
                        <div className="item-carrito-info">
                          <h5>{item.nombre}</h5>
                          <span>Bs. {item.precio} c/u</span>
                        </div>
                        <div className="item-qty">
                          <button className="btn-qty" onClick={() => cambiarCantidad(item.id, -1)}>−</button>
                          <span style={{ fontSize: "13px", fontWeight: "600", minWidth: "16px", textAlign: "center" }}>
                            {item.cantidad}
                          </span>
                          <button className="btn-qty" onClick={() => cambiarCantidad(item.id, 1)}>+</button>
                        </div>
                        <button
                          onClick={() => eliminarDelCarrito(item.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: "16px" }}
                          title="Quitar producto"
                        >
                          🗑
                        </button>
                      </div>
                    ))}

                    <div className="ticket-vendedor">
                      <span className="ticket-subtotal">Subtotal: Bs. {grupo.subtotal}</span>
                      <button
                        className="btn btn-primario btn-sm"
                        onClick={() => {
                          setOrdenAPagar(grupo);
                          setCarritoAbierto(false);
                        }}
                      >
                        Pagar orden a {grupo.vendedorNombre} (QR)
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Pago QR para una orden */}
      {ordenAPagar && (
        <div className="overlay" onClick={() => !procesandoPago && setOrdenAPagar(null)}>
          <div className="modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => !procesandoPago && setOrdenAPagar(null)}>
              ✕
            </button>
            <div className="pago-qr-card">
              <span className="hero-tag">Pagar con QR Simple</span>
              <h3 style={{ fontSize: "18px", marginTop: "8px" }}>
                Pagar a {ordenAPagar.vendedorNombre}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 14px" }}>
                Escanea el código QR del vendedor desde tu app bancaria y sube la captura del comprobante.
              </p>

              <div className="pago-qr-img">
                {ordenAPagar.qrUrl ? (
                  <img src={ordenAPagar.qrUrl} alt={`QR de ${ordenAPagar.vendedorNombre}`} />
                ) : (
                  <div style={{ padding: "40px 10px", fontSize: "12px", color: "var(--text-muted)" }}>
                    El vendedor no tiene QR registrado. Contáctalo por WhatsApp.
                  </div>
                )}
              </div>

              <div style={{ fontSize: "18px", fontWeight: "800", marginBottom: "14px", fontFamily: "JetBrains Mono" }}>
                Total a transferir: Bs. {ordenAPagar.subtotal}
              </div>

              <form onSubmit={confirmarPagoOrden}>
                <label style={{ fontSize: "12px", fontWeight: "600", display: "block", textAlign: "left", marginBottom: "6px" }}>
                  Foto del Comprobante de Pago:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  disabled={procesandoPago}
                  onChange={(e) => setArchivoComprobante(e.target.files[0])}
                  style={{ marginBottom: "14px", width: "100%", fontSize: "13px" }}
                />

                <button
                  type="submit"
                  className="btn btn-ok"
                  disabled={procesandoPago}
                  style={{ width: "100%" }}
                >
                  {procesandoPago ? mensajePago || "Procesando..." : "Enviar comprobante de pago"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}