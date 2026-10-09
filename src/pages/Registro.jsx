import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Registro({ irALogin }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarRegistro(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const credencial = await createUserWithEmailAndPassword(auth, correo, clave);
      await updateProfile(credencial.user, { displayName: nombre });
      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nombre,
        correo,
        creadoEn: serverTimestamp(),
      });
    } catch (err) {
      setError(traducirError(err.code));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth-card">
      <h2>Crear cuenta</h2>
      <p className="auth-sub">Una sola cuenta te sirve para comprar y para vender.</p>
      <form onSubmit={manejarRegistro} className="auth-form">
        <label>Nombre completo</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />

        <label>Correo electrónico</label>
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />

        <label>Contraseña</label>
        <input type="password" minLength={6} value={clave} onChange={(e) => setClave(e.target.value)} required />

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primario" disabled={cargando}>
          {cargando ? "Creando cuenta…" : "Registrarme"}
        </button>
      </form>
      <p className="auth-switch">
        ¿Ya tienes cuenta? <button onClick={irALogin} className="link-btn">Inicia sesión</button>
      </p>
    </div>
  );
}

export function traducirError(codigo) {
  const mapa = {
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
  };
  return mapa[codigo] || "Ocurrió un error, intenta nuevamente.";
}
