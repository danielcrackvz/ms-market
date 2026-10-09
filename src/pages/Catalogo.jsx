import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

const CATEGORIAS = ["Ropa", "Accesorios", "Belleza"];
const ICONO = { Ropa: "👕", Accesorios: "👜", Belleza: "💄" };

export default function Catalogo({ onAbrirProducto }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");

  useEffect(() => {
    // onSnapshot deja la lista escuchando en tiempo real: si otro vendedor
    // publica un producto nuevo, aparece solo, sin recargar la página.
    const q = query(collection(db, "productos"), orderBy("creadoEn", "desc"));
    const desuscribir = onSnapshot(q, (snapshot) => {
      setProductos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
    return desuscribir;
  }, []);

  const filtrados =
    categoriaActiva === "Todas" ? productos : productos.filter((p) => p.categoria === categoriaActiva);

  return (
    <section className="section">
      <div className="chips">
        <button className={`chip ${categoriaActiva === "Todas" ? "chip--active" : ""}`} onClick={() => setCategoriaActiva("Todas")}>
          Todas
        </button>
        {CATEGORIAS.map((c) => (
          <button key={c} className={`chip ${categoriaActiva === c ? "chip--active" : ""}`} onClick={() => setCategoriaActiva(c)}>
            {ICONO[c]} {c}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="empty">Cargando productos…</p>
      ) : filtrados.length === 0 ? (
        <p className="empty">Todavía no hay productos publicados en esta categoría.</p>
      ) : (
        <div className="grid-productos">
          {filtrados.map((p) => (
            <div className="card-producto" key={p.id} onClick={() => onAbrirProducto(p)}>
              <div className="card-foto">
                {p.imagenUrl ? <img src={p.imagenUrl} alt={p.nombre} /> : ICONO[p.categoria] || "🛍️"}
              </div>
              <div className="card-body">
                <h3>{p.nombre}</h3>
                <div className="card-meta">{p.vendedorNombre} · {p.categoria}</div>
                <div className="card-precio">Bs {p.precio}</div>
                <div className="card-stock">{p.stock} disponibles</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
