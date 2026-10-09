# M&S Market — Proyecto base

Plataforma web tipo marketplace con pago mediante código QR, comprobante,
confirmación de transacciones y mensajería entre comprador y vendedor.

## Qué ya funciona en esta versión

- Registro e inicio de sesión (Firebase Authentication).
- Catálogo de productos en tiempo real (Firestore), filtrable por categoría.
- Publicar producto: nombre, categoría, precio, stock, detalle, forma de
  envío, foto del producto e imagen del QR de cobro (fotos subidas a
  Cloudinary).
- Ficha de producto: el comprador ve el QR del vendedor y puede subir su
  comprobante de pago, lo que crea una transacción "pendiente de
  confirmación".
- Transacciones: el vendedor ve sus ventas pendientes, puede abrir el
  comprobante y confirmar el pago; el comprador ve el estado de sus compras.
- Mensajería en tiempo real entre comprador y vendedor, por producto.

## 1. Instalar dependencias

Necesitas tener [Node.js](https://nodejs.org/) instalado (versión 18 o
superior). Luego, dentro de la carpeta del proyecto:

```bash
npm install
```

## 2. Configurar las credenciales

Copia el archivo `.env.example` como `.env`:

```bash
cp .env.example .env
```

Y completa los valores dentro de `.env`:

- Los seis `VITE_FIREBASE_...` salen de: **Firebase Console → Configuración
  del proyecto (ícono de engranaje) → Tus apps → tu app web → bloque
  `firebaseConfig`**.
- `VITE_CLOUDINARY_CLOUD_NAME` es tu "Cloud name", visible en el Dashboard de
  Cloudinary.
- `VITE_CLOUDINARY_UPLOAD_PRESET` es el nombre del upload preset "unsigned"
  que creaste en Cloudinary (Settings → Upload → Upload presets).

El archivo `.env` **no se sube a GitHub** (ya está en `.gitignore`), así que
cada quien que use el proyecto debe crear el suyo con sus propias
credenciales.

## 3. Configurar las reglas de seguridad de Firestore

En Firebase Console → Firestore Database → Reglas, reemplaza el contenido
por el que está en `firestore.rules` (en la raíz de este proyecto) y
publica los cambios. Esto es importante: sin estas reglas, cualquier
persona podría leer o modificar los datos de otros usuarios.

## 4. Correr el proyecto en modo desarrollo

```bash
npm run dev
```

Se abrirá en `http://localhost:5173`. Cada cambio que hagas en el código se
refleja al instante.

## 5. Publicar el sitio (GitHub Pages)

```bash
npm run build
npm run deploy
```

El primer comando genera la carpeta `dist/` con la versión final del sitio.
El segundo la publica en GitHub Pages usando la rama `gh-pages` (necesitas
haber hecho `git remote add origin <url-de-tu-repo>` antes). Luego activa
GitHub Pages desde la configuración del repositorio, apuntando a la rama
`gh-pages`.

Alternativa: si prefieres usar Firebase Hosting en vez de GitHub Pages, avísame
y armamos ese paso también.

## Estructura de datos en Firestore

- **usuarios/{uid}** → `{ nombre, correo, creadoEn }`
- **productos/{id}** → `{ nombre, categoria, precio, stock, detalle, envio, imagenUrl, qrUrl, vendedorId, vendedorNombre, creadoEn }`
- **transacciones/{id}** → `{ productoId, productoNombre, monto, compradorId, compradorNombre, vendedorId, vendedorNombre, comprobanteUrl, estado, creadoEn }`
  - `estado`: `"pendiente_confirmacion"` o `"confirmado"`
- **conversaciones/{id}** → `{ compradorId, compradorNombre, vendedorId, vendedorNombre, productoId, productoNombre, participantes: [uid1, uid2], ultimoMensaje, ultimaActualizacion }`
  - **conversaciones/{id}/mensajes/{id}** → `{ autorId, texto, creadoEn }`

## Próximos pasos sugeridos

- Panel "Mis productos" para que el vendedor edite stock o borre publicaciones.
- Validación de que el stock no baje de 0.
- Notificaciones (por ejemplo, un contador de mensajes o transacciones sin leer).
