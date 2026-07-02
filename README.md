# wedingo — Wedding Invitation Web App

Invitación web para bodas con panel de administración. Construida con React, Firebase, y MapLibre GL.

## Stack

- **Frontend:** React 19 + Vite + Tailwind v4 + react-router-dom v7
- **Backend:** Firebase Data Connect + Firestore
- **Auth:** Token-based (códigos de un solo uso en colección `setupTokens`)
- **Mapas:** MapLibre GL
- **Tipografía:** Playfair Display (títulos) + Lora (cuerpo)

## Estructura

```
src/
├── components/
│   └── SetupForm.jsx       # Formulario de edición de la invitación
├── contexts/
│   └── AppContext.jsx       # Estado global, auth, operaciones Firestore
├── lib/
│   ├── constants.js        # Temas, meses, orden de secciones
│   ├── firebase.js         # Inicialización de Firebase
│   └── utils.js            # Utilidades (mapa, fecha)
├── pages/
│   ├── AdminPage.jsx       # Panel de administración
│   ├── PublicInvitation.jsx # Portada pública de la invitación
│   └── SetupPage.jsx       # Configuración inicial
├── App.jsx                 # Shell principal (ruteo, tema, admin bar)
└── index.css               # Todos los estilos globales
```

## Rutas

| Ruta     | Descripción                     |
|----------|---------------------------------|
| `/`      | Portada pública de la invitación |
| `/setup` | Configuración inicial           |
| `/admin` | Panel de administración         |

## Desarrollo

```bash
npm run dev       # Servidor de desarrollo (puerto 5173)
npm run build     # Build producción
npx firebase deploy --only hosting  # Despliegue
```

## Despliegue

`npx firebase deploy --only hosting` → `https://wedingo-6c26a.web.app`
