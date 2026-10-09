import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../AuthContext";

const TABS_PRIVADAS = [
  { id: "publicar", label: "Publicar" },
  { id: "mis-productos", label: "Mis productos" },
  { id: "transacciones", label: "Transacciones" },
  { id: "mensajes", label: "Mensajes" },
];

export default function Navbar({ tab, setTab }) {
  const { usuario, perfil } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  function ir(destino) {
    setTab(destino);
    setMenuAbierto(false);
  }

  return (
    <header className="msm-header">
      <div className="msm-header-row">
        <div className="msm-logo" onClick={() => ir("explorar")} role="button" tabIndex={0}>
          <h1>M&amp;S Market</h1>
          <span>Feria digital</span>
        </div>

        <nav className="msm-nav msm-nav--desktop">
          <button className={`msm-tab ${tab === "explorar" ? "msm-tab--active" : ""}`} onClick={() => ir("explorar")}>
            Explorar
          </button>
          {usuario &&
            TABS_PRIVADAS.map((t) => (
              <button key={t.id} className={`msm-tab ${tab === t.id ? "msm-tab--active" : ""}`} onClick={() => ir(t.id)}>
                {t.label}
              </button>
            ))}
        </nav>

        <div className="msm-cuenta">
          {usuario ? (
            <>
              <span className="mono msm-cuenta-nombre">{perfil?.nombre || usuario.email}</span>
              <button className="btn btn-secundario" onClick={() => signOut(auth)}>Salir</button>
            </>
          ) : (
            <button className="btn btn-primario" onClick={() => ir("login")}>Ingresar</button>
          )}

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

      {menuAbierto && (
        <nav className="msm-nav--movil">
          <button className={`msm-tab-movil ${tab === "explorar" ? "msm-tab-movil--active" : ""}`} onClick={() => ir("explorar")}>
            Explorar
          </button>
          {usuario &&
            TABS_PRIVADAS.map((t) => (
              <button key={t.id} className={`msm-tab-movil ${tab === t.id ? "msm-tab-movil--active" : ""}`} onClick={() => ir(t.id)}>
                {t.label}
              </button>
            ))}
          {!usuario && (
            <button className="msm-tab-movil" onClick={() => ir("login")}>Ingresar</button>
          )}
          {usuario && (
            <button className="msm-tab-movil" onClick={() => { signOut(auth); setMenuAbierto(false); }}>
              Salir ({perfil?.nombre || usuario.email})
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
