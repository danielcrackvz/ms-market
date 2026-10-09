import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Catalogo from "./pages/Catalogo";
import PublicarProducto from "./pages/PublicarProducto";
import MisProductos from "./pages/MisProductos";
import Transacciones from "./pages/Transacciones";
import Mensajes from "./pages/Mensajes";
import ProductoDetalle from "./pages/ProductoDetalle";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import { useAuth } from "./AuthContext";

export default function App() {
  const { cargando } = useAuth();
  const [tab, setTab] = useState("explorar");
  const [vistaAuth, setVistaAuth] = useState("login"); // "login" | "registro"
  const [productoAbierto, setProductoAbierto] = useState(null);
  const [conversacionAAbrir, setConversacionAAbrir] = useState(null);

  if (cargando) {
    return <div className="empty">Cargando…</div>;
  }

  function abrirProducto(producto) {
    setProductoAbierto(producto);
  }

  function irAMensajesDesdeProducto(conversacionId) {
    setConversacionAAbrir(conversacionId);
    setProductoAbierto(null);
    setTab("mensajes");
  }

  return (
    <div className="msm-root">
      <Navbar tab={tab} setTab={setTab} />

      <main className="msm-content">
        {tab === "login" && (
          vistaAuth === "login" ? (
            <div className="auth-wrap"><Login irARegistro={() => setVistaAuth("registro")} /></div>
          ) : (
            <div className="auth-wrap"><Registro irALogin={() => setVistaAuth("login")} /></div>
          )
        )}

        {tab === "explorar" && <Catalogo onAbrirProducto={abrirProducto} />}
        {tab === "publicar" && <PublicarProducto onPublicado={() => setTab("explorar")} />}
        {tab === "mis-productos" && <MisProductos />}
        {tab === "transacciones" && <Transacciones />}
        {tab === "mensajes" && <Mensajes conversacionInicialId={conversacionAAbrir} />}
      </main>

      {productoAbierto && (
        <ProductoDetalle
          producto={productoAbierto}
          onCerrar={() => setProductoAbierto(null)}
          onIrAMensajes={irAMensajesDesdeProducto}
        />
      )}
    </div>
  );
}
