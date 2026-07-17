export const CHANGELOG = [
  {
    version: "2.4.7",
    date: "2026-07-17",
    changes: [
      "Limpieza de caché con nuevo despliegue",
    ],
  },
  {
    version: "2.4.6",
    date: "2026-07-17",
    changes: [
      "Fondo animado: el gradiente base ya no se mueve, ahora una capa de luz se desplaza suavemente en diagonal sin dejar bordes visibles",
    ],
  },
  {
    version: "2.4.5",
    date: "2026-07-17",
    changes: [
      "Corregido error que ocultaba todas las secciones: el contenido de las tarjetas heredaba opacidad 0 de una animación antigua que ya no se usaba",
    ],
  },
  {
    version: "2.4.4",
    date: "2026-07-17",
    changes: [
      "Fondo de pantalla completa con pseudo-elemento fijo, sin bordes ni huecos",
      "Secciones adaptadas para Safari con altura mínima de pantalla completa",
      "El contenedor principal ahora tiene el color de fondo del tema",
    ],
  },
  {
    version: "2.4.3",
    date: "2026-07-17",
    changes: [
      "Actualización de versión para renovar caché del navegador",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-07-17",
    changes: [
      "Permitido el dominio google.com en la política de seguridad (CSP) para evitar errores con píxeles de seguimiento",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-07-17",
    changes: [
      "Corregido error: las secciones estaban invisibles porque una regla CSS antigua les ponía opacidad cero",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-07-17",
    changes: [
      "Navegación rediseñada: ahora las secciones se deslizan verticalmente con scroll-snap nativo del navegador",
      "Eliminado el sistema de navegación por JavaScript que causaba conflictos con los estilos",
      "Cada sección ocupa la pantalla completa y se encaja al hacer scroll",
    ],
  },
  {
    version: "2.3.10",
    date: "2026-07-17",
    changes: [
      "Las transiciones entre secciones usan clases CSS combinadas con estilos inline solo durante la animación",
    ],
  },
  {
    version: "2.3.9",
    date: "2026-07-17",
    changes: [
      "La visibilidad de las secciones ahora se controla solo con clases CSS, sin estilos inline",
    ],
  },
  {
    version: "2.3.8",
    date: "2026-07-17",
    changes: [
      "Prevenido el desplazamiento nativo del navegador al hacer scroll con ratón, teclado o táctil",
    ],
  },
  {
    version: "2.3.7",
    date: "2026-07-17",
    changes: [
      "Corregido fallo en Safari que impedía ver el fondo de los temas",
      "Corregido bloqueo del autoguardado: el indicador de guardado nunca se reiniciaba",
      "El formulario RSVP ahora se muestra en cuanto la invitación tiene nombre",
      "La sección RSVP ya no carga de forma diferida para evitar errores",
      "Añadido envoltorio Suspense para que las secciones con carga diferida no bloqueen toda la página",
    ],
  },
  {
    version: "2.3.6",
    date: "2026-07-17",
    changes: [
      "Añadido Suspense para aislar las secciones con carga diferida y permitir la navegación entre secciones",
    ],
  },
  {
    version: "2.3.5",
    date: "2026-07-17",
    changes: [
      "Corregido error: el autoguardado dejaba el indicador de guardado bloqueado y ningún cambio posterior se guardaba",
    ],
  },
  {
    version: "2.3.4",
    date: "2026-07-17",
    changes: [
      "La sección RSVP ahora se carga directamente en lugar de diferida para garantizar su funcionamiento",
    ],
  },
  {
    version: "2.3.3",
    date: "2026-07-17",
    changes: [
      "El formulario RSVP se muestra automáticamente cuando la invitación tiene nombre, sin necesidad del parámetro ?invitar",
    ],
  },
  {
    version: "2.3.2",
    date: "2026-07-17",
    changes: [
      "Forzada la visibilidad del formulario RSVP siempre que la invitación existe",
    ],
  },
  {
    version: "2.3.1",
    date: "2026-07-16",
    changes: [
      "Corregido error de maquetación: una posición relativa en las decoraciones rompía el diseño de la invitación",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-07-16",
    changes: [
      "Cada tema ahora tiene su propio fondo de página con degradado personalizado",
      "Decoraciones florales animadas que se adaptan al color de cada tema",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-07-16",
    changes: [
      "RSVP mejorado: los invitados pueden indicar cuántos acompañantes traen y qué menú elige cada uno",
      "Animación de sobre al abrir la invitación: al hacer clic, el sobre se abre y muestra el contenido",
      "Fondo de sección animado según el tema seleccionado",
      "Corregido error de conexión con Firestore usando long-polling",
      "Desactivado App Check porque los tokens eran demasiado grandes para las URLs",
      "Añadidas validaciones de campos largos que faltaban",
      "Corregida limpieza de imagen de fondo al eliminarla",
      "Sincronizada la galería de imágenes entre el formulario y la configuración",
    ],
  },
  {
    version: "2.1.27",
    date: "2026-07-15",
    changes: [
      "El número de versión ahora es un botón que muestra el historial de cambios completo",
    ],
  },
  {
    version: "2.1.26",
    date: "2026-07-15",
    changes: [
      "Unificada la versión entre package.json y el archivo de constantes",
    ],
  },
  {
    version: "2.1.25",
    date: "2026-07-15",
    changes: [
      "Auditoría completa: traducidos textos al francés, alemán, portugués, italiano y neerlandés",
      "Verificada la expiración automática de sesiones a las 24 horas",
      "Optimizada la carga del panel de administración",
    ],
  },
  {
    version: "2.1.22–24",
    date: "2026-07-13",
    changes: [
      "Los idiomas ahora se cargan bajo demanda, reduciendo el tamaño inicial un 87%",
      "Mejoras de accesibilidad: contraste, navegación por teclado en galería, lectores de pantalla",
      "Eliminadas 61 traducciones que no se usaban en los 84 idiomas",
    ],
  },
  {
    version: "2.1.21",
    date: "2026-07-12",
    changes: [
      "Actualizado el archivo Léeme con la versión y el estado de la auditoría",
    ],
  },
  {
    version: "2.1.20",
    date: "2026-07-12",
    changes: [
      "Auditoría de seguridad: corregidos 9 problemas graves y 12 importantes",
    ],
  },
  {
    version: "2.1.19",
    date: "2026-07-12",
    changes: [
      "Corregidos 22 problemas de calidad, añadido sistema de captura de errores, eliminado código muerto",
    ],
  },
  {
    version: "2.1.18",
    date: "2026-07-12",
    changes: [
      "Corregido desbordamiento del panel de administración",
      "Galería: miniaturas de tamaño fijo, carrusel cada 3 segundos, contenedor más ancho",
    ],
  },
  {
    version: "2.1.17",
    date: "2026-07-12",
    changes: [
      "Corregido interlineado en el panel de accesibilidad",
    ],
  },
  {
    version: "2.1.16",
    date: "2026-07-12",
    changes: [
      "Ventana legal más ancha y sin desplazamiento horizontal",
      "Corregida condición de carrera al iniciar sesión como superadministrador",
    ],
  },
  {
    version: "2.1.15",
    date: "2026-07-12",
    changes: [
      "Pantallas completas en los paneles de administración y configuración",
      "Corregido texto en inglés en el panel de datos",
    ],
  },
  {
    version: "2.1.14",
    date: "2026-07-11",
    changes: [
      "Panel de datos del superadministrador: exportar y eliminar invitaciones de forma individual, masiva o completa",
    ],
  },
  {
    version: "2.1.13",
    date: "2026-07-11",
    changes: [
      "Añadidas más de 50 traducciones nuevas en 84 idiomas, eliminados textos sin traducir",
      "Carrusel automático cada 1.5 segundos, descripciones editables en la galería",
    ],
  },
  {
    version: "2.1.12",
    date: "2026-07-11",
    changes: [
      "Las imágenes de la galería se adaptan al tamaño del contenedor sin recortarse",
    ],
  },
  {
    version: "2.1.11",
    date: "2026-07-11",
    changes: [
      "Al abrir el panel de administración, la galería carga las imágenes ya existentes (máximo 10)",
    ],
  },
  {
    version: "2.1.10",
    date: "2026-07-11",
    changes: [
      "Las miniaturas de la galería se actualizan al instante en el panel de administración al subir una imagen",
    ],
  },
  {
    version: "2.1.9",
    date: "2026-07-11",
    changes: [
      "Transición suave al cambiar de imagen en la galería",
    ],
  },
  {
    version: "2.1.8",
    date: "2026-07-11",
    changes: [
      "Añadida regla de seguridad en Firestore para la galería de imágenes",
    ],
  },
  {
    version: "2.1.7",
    date: "2026-07-11",
    changes: [
      "Las imágenes se cifran en fragmentos para evitar desbordamiento de memoria",
    ],
  },
  {
    version: "2.1.6",
    date: "2026-07-11",
    changes: [
      "Barra de progreso real al subir imágenes",
      "Eliminado el icono de carga giratorio de la barra de progreso",
    ],
  },
  {
    version: "2.1.5",
    date: "2026-07-10",
    changes: [
      "Extraído el sistema de navegación a un hook independiente y documentado",
      "Limpiados estilos duplicados y archivos sin usar",
      "Añadidas pruebas automáticas",
      "Corregida protección de eventos del teclado",
    ],
  },
  {
    version: "2.1.4",
    date: "2026-07-10",
    changes: [
      "Al fallar el descifrado, ahora devuelve vacío en lugar de texto cifrado",
    ],
  },
  {
    version: "2.1.3",
    date: "2026-07-10",
    changes: [
      "Corregido error de nombres de variable duplicados en el sistema de notificaciones",
    ],
  },
  {
    version: "2.1.2",
    date: "2026-07-10",
    changes: [
      "El pie de página ahora es una barra superior en el panel de administración",
      "Unificados los avisos legales en un solo lugar",
    ],
  },
  {
    version: "2.1.1",
    date: "2026-07-10",
    changes: [
      "Movidos el selector de idioma y los enlaces legales al pie de página",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-07-10",
    changes: [
      "Actualización de versión menor",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-07-10",
    changes: [
      "Primera versión estable con números de versión oficiales",
    ],
  },
  {
    version: "< 2.0.0",
    date: "2026-06 — 2026-07",
    changes: [
      "Desarrollo inicial de la plataforma Wedingo",
      "React 19, Vite, Tailwind CSS y Firebase como base tecnológica",
      "Invitaciones con confirmación de asistencia, galería de fotos, mapa interactivo y música",
      "Panel de administración con edición en tiempo real y guardado automático",
      "67 temas visuales con vista previa",
      "84 idiomas con el sistema de traducciones i18next",
      "Panel de superadministrador con estadísticas, tokens y cumplimiento legal",
      "Panel de accesibilidad con 8 opciones de personalización",
      "Reproductor de música con ecualizador visual",
      "Cifrado de imágenes y datos personales con AES-256-GCM",
      "Sesiones con renovación automática cada 60 segundos",
      "Página de impresión de la invitación",
      "Ventanas legales con políticas de privacidad y términos",
      "Selector de idiomas organizado por regiones del mundo",
      "Y mucho más...",
    ],
  },
];
