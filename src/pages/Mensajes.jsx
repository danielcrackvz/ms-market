import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

export default function Mensajes({ conversacionInicialId }) {
  const { usuario } = useAuth();
  const [conversaciones, setConversaciones] = useState([]);
  const [seleccionadaId, setSeleccionadaId] = useState(conversacionInicialId || null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");

  // Lista de conversaciones donde participo (como comprador o vendedor)
  useEffect(() => {
    if (!usuario) return;
    const q = query(
      collection(db, "conversaciones"),
      where("participantes", "array-contains", usuario.uid),
      orderBy("ultimaActualizacion", "desc")
    );
    const desuscribir = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConversaciones(lista);
      if (!seleccionadaId && lista.length > 0) setSeleccionadaId(lista[0].id);
    });
    return desuscribir;
  }, [usuario]);

  // Mensajes de la conversación seleccionada, en tiempo real
  useEffect(() => {
    if (!seleccionadaId) return;
    const q = query(
      collection(db, "conversaciones", seleccionadaId, "mensajes"),
      orderBy("creadoEn", "asc")
    );
    const desuscribir = onSnapshot(q, (snapshot) => {
      setMensajes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return desuscribir;
  }, [seleccionadaId]);

  async function enviarMensaje() {
    if (!texto.trim() || !seleccionadaId || !usuario) return;
    const contenido = texto.trim();
    setTexto("");

    await addDoc(collection(db, "conversaciones", seleccionadaId, "mensajes"), {
      autorId: usuario.uid,
      texto: contenido,
      creadoEn: serverTimestamp(),
    });

    await updateDoc(doc(db, "conversaciones", seleccionadaId), {
      ultimoMensaje: contenido,
      ultimaActualizacion: serverTimestamp(),
    });
  }

  const conv = conversaciones.find((c) => c.id === seleccionadaId);

  if (!usuario) {
    return <section className="section"><p className="empty">Inicia sesión para ver tus mensajes.</p></section>;
  }

  return (
    <section className="section">
      <div className="msg-wrap">
        <div className="msg-list">
          {conversaciones.length === 0 && <p className="empty">Todavía no tienes conversaciones.</p>}
          {conversaciones.map((c) => {
            const nombreContraparte = c.compradorId === usuario.uid ? c.vendedorNombre : c.compradorNombre;
            return (
              <div
                key={c.id}
                className={`msg-item ${seleccionadaId === c.id ? "msg-item--active" : ""}`}
                onClick={() => setSeleccionadaId(c.id)}
              >
                <h4>{nombreContraparte}</h4>
                <p>{c.productoNombre}</p>
              </div>
            );
          })}
        </div>

        <div className="msg-thread">
          {!conv ? (
            <div className="empty">Selecciona una conversación.</div>
          ) : (
            <>
              <div className="msg-thread-head">
                {conv.compradorId === usuario.uid ? conv.vendedorNombre : conv.compradorNombre}
                <span>Sobre: {conv.productoNombre}</span>
              </div>
              <div className="msg-body">
                {mensajes.map((m) => (
                  <div key={m.id} className={`bubble ${m.autorId === usuario.uid ? "bubble--yo" : "bubble--ellos"}`}>
                    {m.texto}
                  </div>
                ))}
              </div>
              <div className="msg-input">
                <input
                  placeholder="Escribe un mensaje…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                />
                <button className="btn btn-primario" onClick={enviarMensaje}>Enviar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
