export const WEDDING_MESSAGES = [
  "Hoy nuestros corazones laten al mismo compás y queremos que seas parte de este sueño. El amor que nos une es el mismo que queremos compartir contigo en el día más especial de nuestras vidas.",
  "Después de tanto caminar juntos, de tantas risas y de tantos sueños compartidos, ha llegado el momento de dar el paso definitivo. Queremos que seas testigo del comienzo de nuestra historia para siempre.",
  "El amor nos encontró cuando menos lo esperábamos y desde entonces no hemos dejado de sumar motivos para sonreír. Ahora queremos celebrar contigo todo lo que hemos construido y todo lo que está por venir.",
  "Cada historia de amor tiene capítulos que merecen ser recordados, y el nuestro está a punto de escribir el más importante de todos. Nos encantaría que formaras parte de esta página.",
  "Hay momentos en la vida que merecen ser celebrados con las personas que más queremos. Nuestra boda es uno de ellos, y tu presencia hará que sea inolvidable.",
  "Entre promesas susurradas al oído y sueños que poco a poco se hacen realidad, hemos decidido unir nuestras vidas para siempre. Y no hay nada que nos haga más ilusión que compartir este momento contigo.",
  "Nada nos haría más felices que verte sonreír el día que unamos nuestras vidas. Porque cada persona que ha estado a nuestro lado es parte de esta historia de amor que hoy celebramos.",
  "Hemos encontrado en el otro un hogar, un refugio y mil razones para despertar cada mañana. Ahora queremos abrirte las puertas de par en par para que lo celebres con nosotros.",
  "Decidir pasar el resto de tu vida con alguien es el acto de fe más bonito que existe. Nosotros ya lo hemos hecho, y ahora queremos compartir esa alegría contigo.",
  "Cada latido nos acerca al momento más importante de nuestras vidas, y no podemos imaginarlo sin ti. Llevamos meses preparando cada detalle con todo el cariño del mundo para que disfrutes de un día inolvidable.",
  "El amor no solo se siente, se celebra. Se baila, se ríe, se brinda. Y queremos hacer todo eso contigo en el día que marcará nuestras vidas para siempre.",
  "Entre risas, abrazos y momentos que guardamos en el corazón, hemos construido una historia que merece ser celebrada por todo lo alto. Y tú eres una pieza fundamental de ese puzzle.",
  "Cuando el amor es verdadero, todo a su alrededor florece. Tú has sido testigo de nuestro crecimiento, y ahora queremos que seas testigo de nuestro compromiso eterno.",
  "Llegó el día de vestirnos de felicidad y prometernos eternidad. Hemos preparado una celebración llena de detalles pensados para ti, porque sin los nuestros nada tendría sentido.",
  "Cada paso que hemos dado juntos nos ha traído hasta aquí, y cada persona que ha caminado a nuestro lado ha hecho el camino más hermoso. Tú eres una de ellas, y te queremos a nuestro lado en este día tan especial.",
  "El tiempo nos ha regalado momentos inolvidables, y el mejor está por llegar. Queremos que lo vivas con nosotros, que lo sientas, que lo bailes y que lo guardes en tu corazón.",
  "No hay forma más bonita de comenzar una vida juntos que rodeados de las personas que han sido parte de nuestro camino. Por eso hemos guardado un sitio muy especial para ti.",
  "Hoy nuestros sueños se visten de gala y el amor es el único invitado de honor. Pero sin ti la mesa está incompleta, la pista de baile vacía y la alegría a medias.",
  "El amor verdadero no es solo mirarse a los ojos, es mirar juntos en la misma dirección. Nosotros ya hemos elegido nuestro rumbo, y nos encantaría que caminaras con nosotros en este primer paso.",
  "Hemos guardado un lugar especial para ti en el día más importante de nuestras vidas. Porque las mejores celebraciones se viven en compañía, y tú eres parte imprescindible de la nuestra.",
  "Si el amor es la respuesta, tú eres parte de nuestra historia. Acompáñanos a celebrar el comienzo de nuestro «felices para siempre» con una fiesta que recordaremos toda la vida.",
  "Cada persona que amamos es una estrella que ilumina nuestro camino. Tú brillas con luz propia, y por eso queremos que ilumines también el día más feliz de nuestras vidas.",
  "Nos casamos. Después de años de complicidad, de construir recuerdos y de soñar despiertos, ha llegado el gran día. Y no sería lo mismo sin ti a nuestro lado.",
];

export function randomMessage() {
  const index = Math.floor(Math.random() * WEDDING_MESSAGES.length);
  return WEDDING_MESSAGES[index];
}
