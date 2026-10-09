import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { traducirError } from "./Registro";

export default function Login({ irARegistro }) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarLogin(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, correo, clave);
    } catch (err) {
      setError(traducirError(err.code));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth-card">
      <h2>Iniciar sesión</h2>
      <p className="auth-sub">Entra a tu cuenta de M&S Market.</p>
      <form onSubmit={manejarLogin} className="auth-form">
        <label>Correo electrónico</label>
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />

        <label>Contraseña</label>
        <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required />

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primario" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <p className="auth-switch">
        ¿No tienes cuenta? <button onClick={irARegistro} className="link-btn">Regístrate</button>
      </p>
    </div>
  );
}
