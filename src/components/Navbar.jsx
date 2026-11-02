import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../AuthContext";

const TABS_PRIVADAS = [
  { id: "publicar", label: "Publicar" },
  { id: "mis-productos", label: "Mis productos" },
  { id: "transacciones", label: "Transacciones" },
];

export default function Navbar({ tab, setTab, totalItemsCarrito = 0, onAbrirCarrito }) {
  const { usuario, perfil } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  function ir(destino) {
    setTab(destino);
    setMenuAbierto(false);
  }

  return (
    <header className="msm-header">
      <div className="msm-header-row">
        {/* Logotipo M&S Market */}
        <div className="msm-logo" onClick={() => ir("explorar")} role="button" tabIndex={0}>
          <h1>M&amp;S Market</h1>
          <span>Boutique &amp; Belleza</span>
        </div>

        {/* Navegación de Escritorio (Sin Mensajería) */}
        <nav className="msm-nav msm-nav--desktop">
          <button
            className={`msm-tab ${tab === "explorar" ? "msm-tab--active" : ""}`}
            onClick={() => ir("explorar")}
          >
            Explorar
          </button>
          {usuario &&
            TABS_PRIVADAS.map((t) => (
              <button
                key={t.id}
                className={`msm-tab ${tab === t.id ? "msm-tab--active" : ""}`}
                onClick={() => ir(t.id)}
              >
                {t.label}
              </button>
            ))}
        </nav>

        {/* Área de Usuario y Carrito */}
        <div className="msm-cuenta">
          {/* Botón Carrito con Contador */}
          <button
            className="btn-cart-nav"
            onClick={onAbrirCarrito}
            title="Ver carrito de compras"
            type="button"
          >
            🛒 Carrito
            {totalItemsCarrito > 0 && (
              <span className="cart-badge">{totalItemsCarrito}</span>
            )}
          </button>

          {usuario ? (
            <>
              <span className="msm-cuenta-nombre">
                {perfil?.nombre || usuario.email?.split("@")[0]}
              </span>
              <button
                className="btn btn-secundario btn-sm"
                onClick={() => signOut(auth)}
              >
                Salir
              </button>
            </>
          ) : (
            <button className="btn btn-primario btn-sm" onClick={() => ir("login")}>
              Ingresar
            </button>
          )}

          {/* Menú Móvil Hamburguesa */}
          <button
            className={`msm-hamburguesa ${menuAbierto ? "msm-hamburguesa--abierta" : ""}`}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Menú Desplegable en Móviles */}
      {menuAbierto && (
        <nav className="msm-nav--movil">
          <button
            className={`msm-tab-movil ${tab === "explorar" ? "msm-tab-movil--active" : ""}`}
            onClick={() => ir("explorar")}
          >
            Explorar
          </button>
          {usuario &&
            TABS_PRIVADAS.map((t) => (
              <button
                key={t.id}
                className={`msm-tab-movil ${tab === t.id ? "msm-tab-movil--active" : ""}`}
                onClick={() => ir(t.id)}
              >
                {t.label}
              </button>
            ))}
          <button
            className="msm-tab-movil"
            onClick={() => {
              setMenuAbierto(false);
              onAbrirCarrito();
            }}
          >
            🛒 Carrito ({totalItemsCarrito})
          </button>
          {!usuario ? (
            <button className="msm-tab-movil" onClick={() => ir("login")}>
              Ingresar
            </button>
          ) : (
            <button
              className="msm-tab-movil"
              onClick={() => {
                signOut(auth);
                setMenuAbierto(false);
              }}
            >
              Cerrar sesión ({perfil?.nombre || usuario.email?.split("@")[0]})
            </button>
          )}
        </nav>
      )}
    </header>
  );
}