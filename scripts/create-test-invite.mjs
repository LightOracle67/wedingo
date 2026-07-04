import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc, serverTimestamp } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCNF9woM_se26u4Mz9CIcNoBqxdLIcffuI",
  authDomain: "wedingo-6c26a.firebaseapp.com",
  projectId: "wedingo-6c26a",
  storageBucket: "wedingo-6c26a.firebasestorage.app",
  messagingSenderId: "222572038554",
  appId: "1:222572038554:web:b894dbd62b270c22551223",
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const THEMES = [
  "golden", "forest", "rose", "linen-soft", "blush-pearl",
  "lavender-mist", "champagne-bubble", "amber-night", "onyx-gold",
  "midnight-royal", "burgundy-velvet", "sapphire-night",
  "emerald-grove", "plum-twilight",
];

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function generateToken(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars[rand(0, chars.length - 1)];
  }
  return token;
}

function generateSetupToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rawToken = Array.from({ length: 32 }, () => alphabet[rand(0, alphabet.length - 1)]).join("");
  return rawToken.match(/.{1,4}/g).join("-");
}

function normalizeTokenValue(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const firstNames = ["María", "Ana", "Laura", "Carmen", "Lucía", "Paula", "Sara", "Elena", "Marta", "Cristina"];
const secondNames = ["Carlos", "David", "Javier", "Alejandro", "Pablo", "Daniel", "Miguel", "Sergio", "Manuel", "Adrián"];
const places = [
  "Finca La Alquería, Sevilla",
  "Masía Can Soler, Barcelona",
  "Palacio de los Olivos, Córdoba",
  "Hacienda San Rafael, Jerez",
  "Castillo de Almansa, Albacete",
  "Casa de Campo La Herradura, Madrid",
  "Torre del Mar, Málaga",
  "Jardines de La Vega, Valencia",
];

const futureYear = new Date().getFullYear() + rand(1, 3);
const futureMonth = rand(4, 10);
const futureDay = rand(1, 28);
const futureHour = rand(12, 21);
const futureMinute = pick([0, 15, 30, 45]);

const inviteToken = generateToken();
const firstName = pick(firstNames);
const secondName = pick(secondNames);
const a = firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const b = secondName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const username = a.slice(0, 4) + b.slice(0, 4) + String(rand(10, 99));

const config = {
  adminUsername: username,
  firstName,
  secondName,
  inviteMessage: `Con mucha alegría os invitamos a compartir este día tan especial.`,
  weddingPlace: pick(places),
  weddingLatitude: String(40 + Math.random() * 7),
  weddingLongitude: String(-3 + Math.random() * 6),
  weddingDay: String(futureDay),
  weddingMonth: MONTHS[futureMonth - 1],
  weddingYear: String(futureYear),
  weddingHour: String(futureHour),
  weddingMinute: pad(futureMinute),
  weddingSchedule: `${pad(futureHour)}:${pad(futureMinute)} Recepción de invitados\n${pad(futureHour + 1)}:${pad(futureMinute)} Ceremonia\n${pad(futureHour + 2)}:${pad(futureMinute)} Banquete\n${pad(futureHour + 3)}:${pad(futureMinute)} Baile`,
  weddingDressCode: pick(["Etiqueta informal", "Traje de gala", "Vestimenta formal", "Cóctel elegante", "Ropa cómoda"]),
  theme: pick(THEMES),
  backgroundImage: "",
  backgroundImageLabel: "",
  backgroundImageSource: "",
  sectionOrder: "hero,details,info,story,gifts,accommodation,rsvp",
  hiddenSections: "",
  storyText: `Todo empezó en ${pick(["primavera", "verano", "otoño", "invierno"])} de ${rand(2015, 2020)}, cuando ${firstName} y ${secondName} se conocieron en ${pick(["la universidad", "un viaje", "una fiesta", "el trabajo", "una cafetería"])}. Desde entonces no se han separado.`,
  giftsInfo: `Nuestra dirección: ES${rand(1000, 9999)}${rand(1000, 9999)}${rand(10, 99)}${rand(10, 99)}${rand(1000, 9999)} (Banco Santander). También podéis encontrar nuestra lista de bodas en El Corte Inglés.`,
  accommodationInfo: pick([
    "Hotel Rural El Molino (10% descuento con código BODA2026)",
    "Hospedería Los Álamos, a 5 min del recinto. Habitación doble desde 90€/noche.",
    "Recomendamos alojarse en el centro y hemos reservado un autobús que recogerá a los invitados a las 17:00 en la Plaza Mayor.",
  ]),
  kidsPolicy: pick([
    "Los niños son bienvenidos. Habrá zona de juegos y monitor.",
    "Preferimos que sea una celebración solo para adultos.",
    "Los niños son bienvenidos siempre que podáis estar atentos a ellos.",
  ]),
};

const setupTokenFormatted = generateSetupToken();
const setupTokenNormalized = normalizeTokenValue(setupTokenFormatted);

try {
  await setDoc(doc(db, "invitations", inviteToken), config);
  console.log(`✓ Invitación creada: ${inviteToken}`);

  await setDoc(doc(db, "setupTokens", setupTokenNormalized), {
    used: false,
    createdAt: serverTimestamp(),
    autoGen: true,
    inviteToken,
  });
  console.log(`✓ Token de acceso creado: ${setupTokenNormalized}`);

  console.log("\n── Acceso ──");
  console.log(`URL invitación: https://wedingo-6c26a.web.app/${inviteToken}`);
  console.log(`URL edición:   https://wedingo-6c26a.web.app/${inviteToken}/setup`);
  console.log(`Usuario admin:  ${username}`);
  console.log(`Código acceso:  ${setupTokenNormalized}`);
  console.log("\nDatos de la invitación:");
  console.log(`  Contrayentes: ${firstName} & ${secondName}`);
  console.log(`  Fecha:        ${futureDay} de ${MONTHS[futureMonth - 1]} de ${futureYear} a las ${futureHour}:${pad(futureMinute)}`);
  console.log(`  Lugar:        ${config.weddingPlace}`);
  console.log(`  Tema:         ${config.theme}`);

  process.exit(0);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
