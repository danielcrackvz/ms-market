import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Busca si ya existe una conversación entre este comprador y vendedor sobre
 * este producto. Si existe, devuelve su id. Si no, crea una nueva y devuelve
 * el id recién creado.
 */
export async function obtenerOCrearConversacion({
  compradorId,
  compradorNombre,
  vendedorId,
  vendedorNombre,
  productoId,
  productoNombre,
}) {
  const q = query(
    collection(db, "conversaciones"),
    where("compradorId", "==", compradorId),
    where("vendedorId", "==", vendedorId),
    where("productoId", "==", productoId)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const nuevaRef = await addDoc(collection(db, "conversaciones"), {
    compradorId,
    compradorNombre,
    vendedorId,
    vendedorNombre,
    productoId,
    productoNombre,
    participantes: [compradorId, vendedorId],
    creadoEn: serverTimestamp(),
    ultimoMensaje: "",
    ultimaActualizacion: serverTimestamp(),
  });
  return nuevaRef.id;
}
