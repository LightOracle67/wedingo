# 💍 Wedingo — Wedding Invitation Web App

Una aplicación web moderna para invitaciones a bodas con panel de administración completo. Permite a los novios gestionar su invitación de boda de forma elegante, incluyendo confirmación de asistencia, gestión de invitados y mapas interactivos.

📱 **Sitio en vivo:** [https://wedingo-6c26a.web.app](https://wedingo-6c26a.web.app)

---

## 🎯 Características

- ✨ **Portada pública elegante** - Diseño responsivo y moderno para invitados
- 🔐 **Sistema de autenticación seguro** - Tokens únicos de un solo uso para cada invitado
- ⚙️ **Panel de administración completo** - Editar detalles, gestionar invitados y ver confirmaciones
- 🗺️ **Mapas interactivos** - Ubicación de la boda con MapLibre GL
- 🎨 **Temas personalizables** - Diferentes esquemas de color para diferentes bodas
- 📱 **Totalmente responsivo** - Funciona en desktop, tablet y móvil
- ⚡ **Rendimiento optimizado** - React 19 con Vite para una experiencia rápida
- 🔄 **Sincronización en tiempo real** - Firestore para datos actualizados al instante

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** - Framework principal
- **Vite** - Bundler y servidor de desarrollo
- **Tailwind CSS v4** - Estilos y diseño responsivo
- **react-router-dom v7** - Enrutamiento de páginas
- **MapLibre GL** - Mapas interactivos

### Backend
- **Firebase Data Connect** - Conexión a base de datos
- **Firestore** - Base de datos NoSQL en tiempo real
- **Firebase Hosting** - Despliegue

### Autenticación
- **Token-based** - Códigos únicos almacenados en colección `setupTokens`
- **Un solo uso** - Mayor seguridad para los invitados

### Tipografía
- **Playfair Display** - Títulos elegantes
- **Lora** - Cuerpo de texto legible

---

## 📂 Estructura del Proyecto

```
src/
├── components/
│   └── SetupForm.jsx              # Formulario de edición de la invitación
├── contexts/
│   └── AppContext.jsx             # Estado global, auth, operaciones Firestore
├── lib/
│   ├── constants.js               # Temas, meses, orden de secciones
│   ├── firebase.js                # Inicialización de Firebase
│   └── utils.js                   # Utilidades (mapa, fecha)
├── pages/
│   ├── AdminPage.jsx              # Panel de administración
│   ├── PublicInvitation.jsx       # Portada pública de la invitación
│   └── SetupPage.jsx              # Configuración inicial
├── App.jsx                        # Shell principal (ruteo, tema, admin bar)
└── index.css                      # Estilos globales
```

---

## 🛣️ Rutas de la Aplicación

| Ruta | Descripción |
|------|-------------|
| `/` | 🎉 Portada pública de la invitación (visible para invitados) |
| `/setup` | ⚙️ Configuración inicial (para novios sin invitación configurada) |
| `/admin` | 👨‍💼 Panel de administración (para novios registrados) |

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+
- npm o yarn
- Cuenta de Firebase

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/LightOracle67/lightoracle67.github.io
   cd lightoracle67.github.io
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   # Crear archivo .env con credenciales de Firebase
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_AUTH_DOMAIN=xxx
   VITE_FIREBASE_PROJECT_ID=xxx
   # ... resto de variables
   ```

4. **Ejecutar servidor de desarrollo**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`

---

## 📦 Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo (puerto 5173)

# Producción
npm run build            # Genera build de producción
npm run preview          # Vista previa del build

# Despliegue
npx firebase deploy --only hosting   # Despliega a Firebase Hosting
```

---

## 🌐 Despliegue

### Firebase Hosting
```bash
npx firebase deploy --only hosting
```

**URL de producción:** https://wedingo-6c26a.web.app

---

## 🔧 Configuración Firebase

Este proyecto utiliza:
- **Firebase Data Connect** - Para gestionar queries y mutations
- **Firestore** - Almacenamiento de datos
- **Firebase Authentication** - Sistema de autenticación
- **Firebase Hosting** - Alojamiento

### Archivos generados
Los archivos en `src/dataconnect-generated/` son generados automáticamente por Firebase Data Connect SDK.

---

## 📱 Flujo de Uso

### Para Novios (Administradores)
1. Acceden a `/setup` con su token único
2. Configuran detalles de la boda (fecha, hora, ubicación, etc.)
3. Personalizan el tema y colores
4. Acceden a `/admin` para ver confirmaciones de invitados

### Para Invitados
1. Reciben enlace a `/` con su token
2. Ven la invitación personalizada con información de la boda
3. Confirman asistencia (Sí/No/Quizás)
4. Ven el mapa de ubicación
5. Reciben información de contacto

---

## 🎨 Personalización

### Temas
Los temas se definen en `src/lib/constants.js` y pueden incluir:
- Colores primarios y secundarios
- Tipografía
- Estilos de componentes

### Agregar nuevo tema
1. Editar `constants.js`
2. Añadir nueva configuración de tema
3. Seleccionar en panel admin

---

## 🛡️ Seguridad

- ✅ Tokens únicos por invitado
- ✅ Validación de tokens en backend
- ✅ Reglas de seguridad en Firestore
- ✅ Datos protegidos por autenticación
- ✅ HTTPS en producción

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo licencia MIT. Ver `LICENSE` para más detalles.

---

## 📧 Contacto

**Autor:** LightOracle67

Para reportar bugs o sugerencias, abre un issue en el repositorio.

---

## 🙏 Créditos

- Diseño inspirado en invitaciones modernas
- Iconografía y colores elegidos para bodas
- Integración completa con ecosistema Firebase

---

## 📚 Recursos Útiles

- [Firebase Documentation](https://firebase.google.com/docs)
- [React 19 Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [MapLibre GL](https://maplibre.org/)
- [Vite Guide](https://vitejs.dev)

---

**¡Que disfrutes tu boda! 💒✨**
