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
- **84 idiomas** — Cobertura del 95% de la población mundial.
- **Animaciones** — Entrada y salida en modales y popups.
- **Privacidad total** — Consentimiento RGPD/LOPDGDD, cifrado de datos personales y fotos.
- **Cumplimiento legal internacional** — GDPR, UK GDPR, CCPA/CPRA, LGPD, PIPEDA, POPIA.

---

## 🌍 Cumplimiento legal internacional

| Ley | Jurisdicción | Estado |
|-----|-------------|--------|
| GDPR | Unión Europea / EEE | ✅ Consentimiento, derechos ARSO, SCC, DPF |
| UK GDPR | Reino Unido | ✅ Adaptado, UK Extension al DPF |
| CCPA/CPRA | California (EE.UU.) | ✅ Derecho a saber, no venta de datos |
| LGPD | Brasil | ✅ Derechos del titular, transferencias internacionales |
| PIPEDA | Canadá | ✅ Consentimiento, propósito limitado |
| POPIA | Sudáfrica | ✅ Consentimiento, restricción de transferencias |

- **Cifrado AES-256-GCM** para datos personales sensibles.
- **Consentimiento explícito** para datos de salud (alergias).
- **Política de retención:** 12 meses tras el evento.
- **Almacenamiento local** solo con consentimiento del usuario.
- **Botón de solicitud de borrado y exportación** en el panel de soporte.
- **Plan de respuesta a brechas** documentado (72h notificación).
- **Registro de actividades** (Art. 30 GDPR) en panel superadmin.

---

## 🛠️ Tecnología

| Parte | Usamos |
|-------|--------|
| Frontend | React 19, Vite |
| Estilos | CSS moderno (variables, gradientes, color-mix, animaciones) |
| i18n | react-i18next (84 idiomas, selector con portal y popup) |
| Base de datos | Firestore (noSQL) |
| Alojamiento | Firebase Hosting |
| Mapas | Leaflet + OpenStreetMap |
| Cifrado | AES-256-GCM (en el navegador, PBKDF2) |

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
rm -rf dist .firebase && npm run build
npx firebase-tools hosting:channel:deploy dev   # Canal de pruebas
npx firebase-tools deploy --only hosting         # Producción
```

---

## 📁 Estructura rápida

```
src/
├── components/     # Componentes reutilizables (SetupForm, LegalModal…)
├── contexts/       # Estado global con React Context
├── hooks/          # Lógica reutilizable (RSVP, autoSave, sesión…)
├── i18n/           # 84 idiomas con traducciones completas
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
