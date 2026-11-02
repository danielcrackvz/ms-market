import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

const CATEGORIAS = ["Ropa", "Accesorios", "Belleza"];
const ICONO = { Ropa: "👗", Accesorios: "👜", Belleza: "💄" };

export default function Catalogo({ onAbrirProducto, onAgregarAlCarrito }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");

  useEffect(() => {
    // Escucha en tiempo real de los productos publicados
    const q = query(collection(db, "productos"), orderBy("creadoEn", "desc"));
    const desuscribir = onSnapshot(q, (snapshot) => {
      setProductos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
    return desuscribir;
  }, []);

  const disponibles = productos.filter((p) => !p.vendido);
  const filtrados =
    categoriaActiva === "Todas"
      ? disponibles
      : disponibles.filter((p) => p.categoria === categoriaActiva);

  function formatoWhatsApp(numero, nombreProducto, vendedor) {
    if (!numero) return null;
    const cleanNum = numero.replace(/\D/g, "");
    const msj = encodeURIComponent(
      `¡Hola ${vendedor || ""}! Vi tu producto "${nombreProducto}" en M&S Market y me gustaría coordinar la compra.`
    );
    return `https://wa.me/${cleanNum}?text=${msj}`;
  }

  return (
    <>
      {/* Portada estilo Landing Page / Boutique */}
      <div className="hero-banner">
        <span className="hero-tag">Boutique &amp; Cuidado Personal</span>
        <h2>Moda, Accesorios y Belleza Femenina</h2>
        <p>
          Encuentra prendas exclusivas, joyería y cosméticos de emprendedoras locales. 
          Paga de forma directa y segura mediante transferencia QR.
        </p>
      </div>

      <section className="section">
        {/* Filtros de Categorías */}
        <div className="chips">
          <button
            className={`chip ${categoriaActiva === "Todas" ? "chip--active" : ""}`}
            onClick={() => setCategoriaActiva("Todas")}
          >
            ✨ Todas las colecciones
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              className={`chip ${categoriaActiva === c ? "chip--active" : ""}`}
              onClick={() => setCategoriaActiva(c)}
            >
              {ICONO[c]} {c}
            </button>
          ))}
        </div>

        {cargando ? (
          <p className="empty">Cargando productos de la boutique…</p>
        ) : filtrados.length === 0 ? (
          <p className="empty">No hay artículos disponibles en esta categoría por el momento.</p>
        ) : (
          <div className="grid-productos">
            {filtrados.map((p) => {
              const linkWa = formatoWhatsApp(p.whatsapp, p.nombre, p.vendedorNombre);
              const hayStock = (p.stock || 0) > 0;

              return (
                <div className="card-producto" key={p.id}>
                  {/* Imagen y Badge */}
                  <div className="card-foto" onClick={() => onAbrirProducto(p)}>
                    <span className="card-badge-categoria">
                      {ICONO[p.categoria] || "🛍️"} {p.categoria}
                    </span>
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} loading="lazy" />
                    ) : (
                      <span style={{ fontSize: "42px" }}>{ICONO[p.categoria] || "🛍️"}</span>
                    )}
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="card-body">
                    <h3 onClick={() => onAbrirProducto(p)}>{p.nombre}</h3>
                    <div className="card-vendedor">
                      Vendido por: <b>{p.vendedorNombre || "Emprendedora"}</b>
                    </div>

                    <div className="card-footer">
                      <div className="card-precio-row">
                        <span className="card-precio">Bs {p.precio}</span>
                        <span className={`card-stock ${!hayStock ? "card-stock--agotado" : ""}`}>
                          {hayStock ? `${p.stock} disponibles` : "Agotado"}
                        </span>
                      </div>

                      {/* Botones Rápidos: Carrito y WhatsApp */}
                      <div className="card-acciones">
                        <button
                          type="button"
                          className="btn btn-primario btn-sm"
                          disabled={!hayStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAgregarAlCarrito) onAgregarAlCarrito(p, 1);
                          }}
                        >
                          🛒 Añadir
                        </button>

                        {linkWa && (
                          <a
                            href={linkWa}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-wa btn-sm"
                            title="Consultar por WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}