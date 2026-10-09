import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null); // objeto de Firebase Auth
  const [perfil, setPerfil] = useState(null); // documento en la colección "usuarios"
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const desuscribir = onAuthStateChanged(auth, async (usuarioFirebase) => {
      setUsuario(usuarioFirebase);
      if (usuarioFirebase) {
        const ref = doc(db, "usuarios", usuarioFirebase.uid);
        const snap = await getDoc(ref);
        setPerfil(snap.exists() ? snap.data() : null);
      } else {
        setPerfil(null);
      }
      setCargando(false);
    });
    return desuscribir;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, perfil, setPerfil, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
