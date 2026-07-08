export const WEDDING_MESSAGES = [
  "Hoy nuestros corazones laten al mismo compás y queremos que seas parte de este sueño.",
  "Después de tanto caminar juntos, llegó el día de decir «sí, para siempre».",
  "El amor nos encontró, nos unió, y ahora queremos compartir contigo la magia de este momento.",
  "Cada historia tiene un capítulo inolvidable, y el nuestro comienza con tu presencia.",
  "Queremos celebrar el amor rodeados de quienes más queremos. Porque sin ti la fiesta no estaría completa.",
  "Entre promesas y sueños cumplidos, hemos decidido dar el paso más importante. Y queremos que estés ahí.",
  "Nada nos haría más felices que verte sonreír el día que unamos nuestras vidas.",
  "Hemos encontrado en el otro un hogar, y queremos abrirte las puertas para celebrarlo juntos.",
  "El día que dijimos «para siempre» ya no es un secreto. Ahora queremos compartirlo contigo.",
  "Cada latido nos acerca al momento más importante de nuestras vidas, y no podemos imaginarlo sin ti.",
  "El amor no solo se siente, se celebra. Y queremos celebrarlo contigo.",
  "Entre risas, abrazos y momentos compartidos, hemos construido una historia que queremos sellar para siempre. Acompáñanos.",
  "Cuando el amor es verdadero, el universo entero conspira para que florezca. Y tú has sido parte de ese universo.",
  "Llegó el día de vestirnos de felicidad y prometernos eternidad. No faltes.",
  "Cada paso en este camino ha tenido sentido gracias al apoyo de personas como tú. Ahora queremos que seas testigo de nuestro «sí, acepto».",
  "El tiempo nos ha regalado momentos inolvidables, y el mejor está por llegar. Queremos que lo vivas con nosotros.",
  "No hay forma más bonita de comenzar una vida juntos que rodeados de quienes han sido parte de nuestro camino.",
  "Hoy nuestros sueños se visten de gala y el amor es el único invitado de honor. Pero sin ti la mesa está incompleta.",
  "El amor no solo es mirarse el uno al otro, es mirar juntos en la misma dirección. Y queremos que camines con nosotros.",
  "Hemos guardado un lugar especial para ti en el día más importante de nuestras vidas. Porque el amor compartido es amor multiplicado.",
  "Si el amor es la respuesta, tú eres parte de nuestra historia. Acompáñanos a celebrar el comienzo de nuestro «felices para siempre».",
  "Cada persona que amamos es una estrella que ilumina nuestro camino. Tú brillas entre ellas. Por eso queremos que estés en nuestra boda.",
  "Nos casamos. Y no sería lo mismo sin ti.",
];

export function randomMessage() {
  const index = Math.floor(Math.random() * WEDDING_MESSAGES.length);
  return WEDDING_MESSAGES[index];
}
