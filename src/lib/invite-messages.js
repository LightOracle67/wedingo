export const WEDDING_MESSAGES = [
  "Hoy nuestros corazones laten al mismo compás y queremos que seas parte de este sueño. {coupleName} te invitan a celebrar su amor.",
  "Después de tanto caminar juntos, llegó el día de decir «sí, para siempre». {coupleName} te invitan a su boda.",
  "El amor nos encontró, nos unió, y ahora queremos compartir contigo la magia de este momento. {coupleName} te esperan.",
  "Cada historia tiene un capítulo inolvidable, y el nuestro comienza con tu presencia. {coupleName} te invitan a su boda.",
  "Queremos celebrar el amor rodeados de quienes más queremos. Porque sin ti la fiesta no estaría completa. {coupleName} te esperan.",
  "Entre promesas y sueños cumplidos, hemos decidido dar el paso más importante. Y queremos que estés ahí. {coupleName} te invitan.",
  "Nada nos haría más felices que verte sonreír el día que unamos nuestras vidas. {coupleName} te esperan con todo el corazón.",
  "Hemos encontrado en el otro un hogar, y queremos abrirte las puertas para celebrarlo juntos. {coupleName} te invitan.",
  "El día que dijimos «para siempre» ya no es un secreto. Ahora queremos compartirlo contigo. {coupleName} te esperan.",
  "Cada latido nos acerca al momento más importante de nuestras vidas, y no podemos imaginarlo sin ti. {coupleName} te invitan.",
  "El amor no solo se siente, se celebra. Y queremos celebrarlo contigo. {coupleName} te invitan a su boda.",
  "Entre risas, abrazos y momentos compartidos, hemos construido una historia que queremos sellar para siempre. Acompáñanos. {coupleName} te esperan.",
  "Cuando el amor es verdadero, el universo entero conspira para que florezca. Y tú has sido parte de ese universo. {coupleName} te invitan.",
  "Llegó el día de vestirnos de felicidad y prometernos eternidad. No faltes. {coupleName} te esperan.",
  "Cada paso en este camino ha tenido sentido gracias al apoyo de personas como tú. Ahora queremos que seas testigo de nuestro «sí, acepto». {coupleName} te invitan.",
  "El tiempo nos ha regalado momentos inolvidables, y el mejor está por llegar. Queremos que lo vivas con nosotros. {coupleName} te esperan.",
  "No hay forma más bonita de comenzar una vida juntos que rodeados de quienes han sido parte de nuestro camino. {coupleName} te invitan.",
  "Hoy nuestros sueños se visten de gala y el amor es el único invitado de honor. Pero sin ti la mesa está incompleta. {coupleName} te esperan.",
  "El amor no solo es mirarse el uno al otro, es mirar juntos en la misma dirección. Y queremos que camines con nosotros en este nuevo rumbo. {coupleName} te invitan.",
  "Hemos guardado un lugar especial para ti en el día más importante de nuestras vidas. Porque el amor compartido es amor multiplicado. {coupleName} te esperan.",
  "Si el amor es la respuesta, tú eres parte de nuestra historia. Acompáñanos a celebrar el comienzo de nuestro «felices para siempre». {coupleName} te invitan.",
  "Cada persona que amamos es una estrella que ilumina nuestro camino. Tú brillas entre ellas. Por eso queremos que estés en nuestra boda. {coupleName} te esperan.",
];

export function randomMessage(coupleName) {
  const index = Math.floor(Math.random() * WEDDING_MESSAGES.length);
  return WEDDING_MESSAGES[index].replace("{coupleName}", coupleName);
}
