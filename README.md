# 💍 Wedingo — Invitaciones de boda elegantes

Crea una invitación de boda digital con tu propio estilo, comparte el enlace con tus invitados y gestiona las confirmaciones desde un panel privado. Sin complicaciones.

📱 **Visita la web:** [https://wedingo-6c26a.web.app](https://wedingo-6c26a.web.app)

---

## ✨ Cómo funciona

1. **Consigue tu código de acceso** — El organizador te da un código único para configurar tu invitación.
2. **Personaliza** — Elige fecha, lugar, tema, fotos, menú, música y más.
3. **Comparte** — Tus invitados abren el enlace, ven la invitación y confirman asistencia.
4. **Gestiona** — Desde el panel admin ves quién viene, qué menú elige y exportas los datos.

---

## 🎨 Lo que incluye

- **21 temas visuales** — Desde clásicos dorados hasta estilos arcoíris, trans, no binario y más.
- **Confirmación de asistencia** — Cada invitado confirma si viene y selecciona su menú.
- **Menús personalizados** — Carne, pescado, vegano y postre, cada uno con su propia descripción.
- **Galería de fotos cifrada** — Las imágenes se guardan cifradas en la nube por privacidad.
- **Mapa del lugar** — Ubicación interactiva con OpenStreetMap.
- **Música ambiental** — Añade una canción y se reproducirá al abrir la invitación.
- **Secciones a medida** — Elige qué secciones mostrar y en qué orden.
- **Impresión bonita** — Vista previa para imprimir la invitación en papel.
- **Privacidad total** — Consentimiento RGPD/LOPDGDD, cifrado de datos personales y fotos.

---

## 🛠️ Tecnología

| Parte | Usamos |
|-------|--------|
| Frontend | React 19, Vite |
| Estilos | CSS moderno (variables, gradientes, color-mix) |
| Base de datos | Firestore (noSQL) |
| Alojamiento | Firebase Hosting |
| Mapas | Leaflet + OpenStreetMap |
| Cifrado | AES-256-GCM (en el navegador) |

---

## 🚀 Para desarrolladores

### Requisitos
- Node.js 18+
- Una cuenta de Firebase (plan Spark gratis vale)

### Poner en marcha

```bash
git clone https://github.com/LightOracle67/lightoracle67.github.io
cd lightoracle67.github.io
npm install
```

Crea un archivo `.env` con las credenciales de tu proyecto Firebase:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAILS=tu@email.com
VITE_SUPERADMIN_ROUTE=/_/console
```

```bash
npm run dev        # Desarrollo en http://localhost:5173
npm run build      # Build de producción
npm run preview    # Vista previa del build
```

### Desplegar

```bash
npx firebase deploy --only hosting
```

---

## 📁 Estructura rápida

```
src/
├── components/     # Componentes reutilizables (SetupForm, LegalModal…)
├── contexts/       # Estado global con React Context
├── hooks/          # Lógica reutilizable (RSVP, autoSave, sesión…)
├── lib/            # Utilidades, constantes, Firebase, cifrado, auditoría
├── pages/          # Páginas y secciones de la app
│   ├── admin/      # Panel de administración (pestañas)
│   ├── superadmin/ # Panel de superadmin
│   └── sections/   # Secciones de la invitación pública (Hero, Rsvp…)
└── index.css       # Todos los estilos
```

---

## 📬 ¿Dudas o sugerencias?

Abre un issue en este repositorio o escribe a [adriancl2001@gmail.com](mailto:adriancl2001@gmail.com).

---

Hecho con ❤️ para bodas diversas.
