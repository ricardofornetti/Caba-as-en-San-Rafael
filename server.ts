/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client Lazily to prevent startup crashes if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Sample Cabins Data
const cabins = [
  {
    id: "atuel",
    name: "Cabaña Cañón del Atuel",
    description: "Confort rústico frente al río, rodeado de una frondosa arboleda autóctona.",
    capacity: 4,
    priceBaja: 45000,
    priceMedia: 65000,
    priceAlta: 95000,
    services: ["WiFi de Alta Velocidad", "Smart TV con Netflix", "Aire Acondicionado Frío/Calor", "Asador/Chulengo Privado", "Cochera Techada", "Piscina Compartida", "Vajilla Completa"],
    images: [
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"
    ],
    area: 65,
    rooms: 2,
    descriptionFull: "Disfrutá del sonido del río Atuel desde el porche de esta hermosa cabaña construida en madera y piedra volcánica de la zona. Cuenta con un dormitorio principal con cama matrimonial y un segundo dormitorio con dos camas individuales, cocina totalmente equipada, asador privado para preparar exquisitos asados mendocinos y calefacción para las noches frescas de montaña."
  },
  {
    id: "vallegrande",
    name: "Cabaña Premium Valle Grande",
    description: "Vistas panorámicas espectaculares del lago y las imponentes formaciones rocosas.",
    capacity: 6,
    priceBaja: 65000,
    priceMedia: 95000,
    priceAlta: 140000,
    services: ["WiFi de Alta Velocidad", "Piscina Privada", "Deck Panorámico", "Cocina de Vitrocerámica", "Smart TV 55\" 4K", "Aire Acondicionado Central", "Cochera Doble", "Parrilla Techada", "Pet Friendly"],
    images: [
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
    ],
    area: 85,
    rooms: 3,
    descriptionFull: "Nuestra opción más lujosa y espaciosa, ideal para familias numerosas o grupos de amigos. Cuenta con un imponente deck que vuela sobre el paisaje de Valle Grande, piscina de uso exclusivo, suite principal con baño privado y cama king size, dos habitaciones adicionales sumamente confortables, cocina con isla de mármol y un cómodo asador techado para compartir momentos inolvidables."
  },
  {
    id: "reyunos",
    name: "Cabaña Nido Los Reyunos",
    description: "Refugio íntimo y romántico para parejas, suspendido sobre las aguas turquesas.",
    capacity: 2,
    priceBaja: 55000,
    priceMedia: 80000,
    priceAlta: 110000,
    services: ["WiFi de Alta Velocidad", "Jacuzzi Privado con Vista", "Hogar a Leña", "Cama King Size", "Deck Flotante", "Desayuno de Campo Incluido", "Cafetera Nespresso", "Smart TV", "Aire Acondicionado"],
    images: [
      "https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80"
    ],
    area: 45,
    rooms: 1,
    descriptionFull: "Concebida exclusivamente para el romance y la desconexión total. Esta cabaña ofrece un balcón terraza vidriado, hidromasaje climatizado con ventanales hacia las montañas y un hogar a leña para crear un clima cálido en invierno. Rodeada de paz, ofrece la máxima privacidad y un servicio exclusivo que incluye desayuno artesanal servido en la cabaña todas las mañanas."
  },
  {
    id: "nihuil",
    name: "Cabaña El Nihuil",
    description: "Espíritu aventurero y comodidad para amantes del windsurf, la pesca y la naturaleza.",
    capacity: 5,
    priceBaja: 48000,
    priceMedia: 70000,
    priceAlta: 100000,
    services: ["WiFi de Alta Velocidad", "Guarda Equipos de Aventura", "Asador Grande", "Smart TV", "Cochera para Lancha", "Aire Acondicionado", "Cocina Completa", "Apto Mascotas"],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    area: 75,
    rooms: 2,
    descriptionFull: "Ubicada estratégicamente para los amantes de las actividades náuticas y terrestres. Cuenta con un gran patio y cochera de dimensiones especiales para lanchas o vehículos 4x4, lavadero y depósito de equipos para guardar trajes de neoprene, kayaks o cañas de pescar. Dispone de cocina comedor espaciosa, un gran asador tradicional y habitaciones amplias y abrigadas."
  }
];

// Seed initial bookings
let bookings = [
  {
    id: "RES-1042",
    cabinId: "atuel",
    cabinName: "Cabaña Cañón del Atuel",
    guestName: "Martín Rodríguez",
    guestEmail: "martin.rodriguez@gmail.com",
    guestPhone: "+54 9 261 555-1234",
    checkIn: "2026-06-20",
    checkOut: "2026-06-25",
    nights: 5,
    guestsCount: 3,
    totalAmount: 325000, // Media pricing
    status: "confirmed" as const,
    pointsEarned: 325,
    createdAt: "2026-05-10T14:32:00Z"
  },
  {
    id: "RES-1043",
    cabinId: "reyunos",
    cabinName: "Cabaña Nido Los Reyunos",
    guestName: "Sofía Bianchi",
    guestEmail: "sofia.bianchi@outlook.com",
    guestPhone: "+54 9 11 4444-5555",
    checkIn: "2026-06-23",
    checkOut: "2026-06-27",
    nights: 4,
    guestsCount: 2,
    totalAmount: 320000,
    status: "confirmed" as const,
    pointsEarned: 320,
    createdAt: "2026-05-18T09:12:00Z"
  },
  {
    id: "RES-1044",
    cabinId: "vallegrande",
    cabinName: "Cabaña Premium Valle Grande",
    guestName: "Facundo López",
    guestEmail: "faculopez@gmail.com",
    guestPhone: "+54 9 341 666-7788",
    checkIn: "2026-07-02",
    checkOut: "2026-07-09",
    nights: 7,
    guestsCount: 5,
    totalAmount: 980000, // Alta pricing (Julio)
    status: "pending" as const,
    pointsEarned: 980,
    createdAt: "2026-06-15T18:45:00Z"
  }
];

// In-memory chatbot logs
const chatbotLogs: Array<{
  id: string;
  userPhone: string;
  userName: string;
  message: string;
  response: string;
  timestamp: string;
}> = [
  {
    id: "LOG-001",
    userPhone: "+54 9 11 9876-5432",
    userName: "Emiliano",
    message: "Hola che! Tenés lugar para este finde largo de junio?",
    response: "¡Hola Emiliano! Qué hacés che, cómo va todo? Mirá, justo para este finde largo me queda libre la hermosa Cabaña Cañón del Atuel para hasta 4 personas y el Nido Los Reyunos que es una locura para dos. ¿Para cuántos son ustedes así te armo el presupuesto exacto?",
    timestamp: "2026-06-24T09:15:00Z"
  },
  {
    id: "LOG-002",
    userPhone: "+54 9 261 123-4567",
    userName: "Carolina",
    message: "Tienen piscina climatizada?",
    response: "¡Hola Caro! Sí, de una. Tenemos una hermosa piscina exterior con un entorno de parque espectacular, y está templada/climatizada de forma solar y por caldera durante los meses de temporada de primavera y verano (de octubre a marzo). En invierno la piscina está pasiva, ¡pero compensamos con hermosos jacuzzis internos en algunas cabañas como Los Reyunos! ¿Buscabas con jacuzzi?",
    timestamp: "2026-06-24T10:05:00Z"
  }
];

// Helper to determine season for a date
function getSeason(dateString: string): "baja" | "media" | "alta" {
  const date = new Date(dateString);
  const month = date.getMonth(); // 0-indexed (Jan = 0, Dec = 11)
  const day = date.getDate();

  // Summer High: Dec 15 - Feb 28
  if (month === 11 && day >= 15) return "alta";
  if (month === 0 || month === 1) return "alta";
  
  // Winter High (Julio): July 1 - July 31
  if (month === 6) return "alta";

  // Mid Season: March (2), April (3) - harvest/Vendimia; Sept (8), Oct (9), Nov (10) - Spring
  if ([2, 3, 8, 9, 10].includes(month)) return "media";

  // Low Season: May (4), June (5), August (7)
  return "baja";
}

// Calculate pricing logic
function calculatePrice(cabinId: string, checkIn: string, checkOut: string): {
  nights: number;
  breakdown: Array<{ date: string; season: "baja" | "media" | "alta"; rate: number }>;
  total: number;
} {
  const cabin = cabins.find(c => c.id === cabinId);
  if (!cabin) throw new Error("Cabaña no encontrada");

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const nights = Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay);

  if (nights <= 0) {
    return { nights: 0, breakdown: [], total: 0 };
  }

  const breakdown: Array<{ date: string; season: "baja" | "media" | "alta"; rate: number }> = [];
  let total = 0;

  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(start.getTime() + (i * millisecondsPerDay));
    const currentDateString = currentDate.toISOString().split("T")[0];
    const season = getSeason(currentDateString);
    
    let rate = cabin.priceBaja;
    if (season === "media") rate = cabin.priceMedia;
    if (season === "alta") rate = cabin.priceAlta;

    breakdown.push({
      date: currentDateString,
      season,
      rate
    });
    total += rate;
  }

  return {
    nights,
    breakdown,
    total
  };
}

// Start Server Wrapper
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API ROUTES
  app.get("/api/cabins", (req, res) => {
    res.json(cabins);
  });

  app.get("/api/bookings", (req, res) => {
    res.json(bookings);
  });

  app.post("/api/bookings/calculate", (req, res) => {
    const { cabinId, checkIn, checkOut } = req.body;
    if (!cabinId || !checkIn || !checkOut) {
       res.status(400).json({ error: "Faltan datos de cabinId, checkIn o checkOut" });
       return;
    }
    try {
      const calculation = calculatePrice(cabinId, checkIn, checkOut);
      res.json(calculation);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/bookings", (req, res) => {
    const { cabinId, guestName, guestEmail, guestPhone, checkIn, checkOut, guestsCount } = req.body;
    if (!cabinId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut || !guestsCount) {
       res.status(400).json({ error: "Faltan datos requeridos" });
       return;
    }

    const cabin = cabins.find(c => c.id === cabinId);
    if (!cabin) {
       res.status(404).json({ error: "Cabaña no encontrada" });
       return;
    }

    try {
      const pricing = calculatePrice(cabinId, checkIn, checkOut);
      const pointsEarned = Math.floor(pricing.total / 1000); // 1 point per $1000 ARS
      
      const newBooking = {
        id: `RES-${1000 + bookings.length + 5}`,
        cabinId,
        cabinName: cabin.name,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        nights: pricing.nights,
        guestsCount,
        totalAmount: pricing.total,
        status: "confirmed" as const, // Autoconfirmed for simulator ease
        pointsEarned,
        createdAt: new Date().toISOString()
      };

      bookings.push(newBooking);
      res.status(201).json(newBooking);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/kpis", (req, res) => {
    const confirmedNights = bookings.filter(b => b.status === "confirmed").reduce((sum, b) => sum + b.nights, 0);
    // Let's make an interesting simulated KPI block
    const occupancyRate = 68; // percentage
    const totalRevenue = bookings.filter(b => b.status === "confirmed").reduce((sum, b) => sum + b.totalAmount, 0);
    const activeGuests = bookings.filter(b => b.status === "confirmed").reduce((sum, b) => sum + b.guestsCount, 0);
    const pendingBookings = bookings.filter(b => b.status === "pending").length;

    res.json({
      occupancyRate,
      totalRevenue,
      activeGuests,
      pendingBookings
    });
  });

  app.get("/api/chatbot-logs", (req, res) => {
    res.json(chatbotLogs);
  });

  // Chatbot Gemini Assistant API route
  app.post("/api/chat", async (req, res) => {
    const { messages, userName, userPhone } = req.body;
    if (!messages || !Array.isArray(messages)) {
       res.status(400).json({ error: "messages array is required" });
       return;
    }

    const currentUserName = userName || "Huésped Interesado";
    const currentUserPhone = userPhone || "+54 9 11 9999-8888";

    try {
      const systemInstruction = `
      Actúa como "Santi", el asistente virtual por WhatsApp de "Cabañas San Rafael", en San Rafael, Mendoza, Argentina.
      Tu personalidad debe ser súper cálida, amigable, bien mendocina y argentina, pero sumamente profesional en el trato.
      
      Reglas cruciales de tono e idioma:
      1. Hablá en español de Argentina con modismos sutiles y cálidos (usá el voseo: "tenés", "querés", "buscás", "comentame", "venite", "andá", "viste", "che").
      2. Sé servicial y empático. Hacé que se sientan ya de vacaciones en la montaña y el río.
      3. Usá emojis de forma moderada pero alegre (🏕️, 🍷, 🌊, ⛰️, 🧉).
      
      Información sobre el complejo que debés usar:
      - Ubicación: Ruta Provincial 173, Km 18, Valle Grande, San Rafael, Mendoza. Estamos justo frente al río Atuel, rodeados de bosque y cerros imponentes.
      - Cabañas Disponibles:
        1. "Cabaña Cañón del Atuel": Para hasta 4 personas. Tiene 2 dormitorios, cocina completa, asador privado (chulengo), cochera techada. Ideal para familias chicas.
        2. "Cabaña Premium Valle Grande": Para hasta 6 personas. Súper amplia (85 m²), 3 dormitorios, deck panorámico que vuela sobre el paisaje y piscina privada. Exclusiva y hermosa.
        3. "Cabaña Nido Los Reyunos": Exclusiva para parejas (2 personas). Tiene jacuzzi privado climatizado con vista a la montaña, hogar a leña, cama King y desayuno de campo incluido. Ideal para escapadas románticas.
        4. "Cabaña El Nihuil": Para hasta 5 personas. Pensada para deportistas y aventureros, con un patio enorme ideal para lanchas, vehículos 4x4 y depósito de equipos de rafting/pesca.
      - Servicios Generales: WiFi de alta velocidad en todo el predio, piscina templada de temporada (octubre a marzo), cocheras techadas individuales, asadores/parrillas individuales, bajada privada al río, desayuno seco artesanal de cortesía.
      - Mascotas: ¡Somos Pet Friendly! Aceptamos mascotas educadas bajo aviso previo, sin cargo extra (¡amamos a los pichichos!).
      - Qué hacer en San Rafael (Guía de turismo):
        * El Cañón del Atuel es una maravilla geológica increíble, ideal para rafting y fotos.
        * El dique Valle Grande ofrece kayak, catamarán y senderos hermosos.
        * Los Reyunos tiene el famoso 'Tirobangi' y paseos náuticos en un agua color turquesa única.
        * Hay bodegas excelentes para visitar como Bodegas Bianchi, Suter o Valentín Bianchi, donde hacen visitas guiadas y catas de Malbec deliciosas.
      - Precios y Reservas: Los precios varían según la temporada (Baja, Media, Alta). Las tarifas rondan desde los $45.000 ARS en temporada baja hasta los $140.000 ARS por noche la cabaña premium en temporada alta. Comentales que para cotizar con precisión o realizar una reserva formal, pueden usar la pestaña de "Reservar" en nuestra plataforma web que calcula todo de forma automática.
      
      Formato de respuesta:
      Tus respuestas deben imitar un chat de WhatsApp: cortas, estructuradas con saltos de línea claros, amables y directas al grano. No escribas párrafos enormes difíciles de leer en el celu.
      `;

      // Formulate query for Gemini
      // Format messages history for Gemini API
      const chatContents = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatContents,
        config: {
          systemInstruction,
          temperature: 0.85,
        }
      });

      const replyText = response.text || "Disculpame che, se me cortó la señal en la montaña. ¿Me repetís la pregunta?";

      // Log the conversation in our chatbot logs
      const lastUserMsg = messages[messages.length - 1]?.text || "";
      chatbotLogs.push({
        id: `LOG-${1000 + chatbotLogs.length + 3}`,
        userPhone: currentUserPhone,
        userName: currentUserName,
        message: lastUserMsg,
        response: replyText,
        timestamp: new Date().toISOString()
      });

      res.json({ text: replyText });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      // Friendly offline Argentine message fallback if no API key is available
      const fallbackResponse = `¡Hola che! ¿Cómo andás? Mirá, justo estoy con poca señal acá en el Cañón del Atuel, pero te comento que nuestras cabañas en San Rafael están listas para recibirte. 🏕️🍷
      
Para consultas de tarifas o para reservar, podés ingresar a la sección de **Reservar** acá arriba en la web, donde vas a poder ver la disponibilidad real en el calendario y pagar cómodamente con Mercado Pago. 

¿Te gustaría saber sobre alguna cabaña en particular (Atuel para 4, Valle Grande para 6 o Reyunos para parejas)? ¡Preguntame lo que quieras!`;
      
      // Log search fallback to show on dashboard even on failure
      const lastUserMsg = messages[messages.length - 1]?.text || "Hola";
      chatbotLogs.push({
        id: `LOG-${1000 + chatbotLogs.length + 3}`,
        userPhone: currentUserPhone,
        userName: currentUserName,
        message: lastUserMsg,
        response: fallbackResponse,
        timestamp: new Date().toISOString()
      });

      res.json({ text: fallbackResponse, note: "Fallback used because Gemini API is not configured or failed." });
    }
  });

  // Serve static files and integrate Vite in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
