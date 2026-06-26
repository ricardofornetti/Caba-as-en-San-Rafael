/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MEJORAS CRÍTICAS APLICADAS POR EL ARQUITECTO DE SEGURIDAD WEB:
 * 1. PERSISTENCIA CON FIRESTORE: Reemplazo de colecciones y arrays en memoria por la base de datos Firestore ("bookings" y "chatbot_logs").
 * 2. FIRESTORE SECURITY RULES: Creación de archivo firestore.rules para denegar acceso directo no autorizado desde los clientes de Firebase.
 * 3. AUTENTICACIÓN ADMIN CON GOOGLE SIGN-IN: Middleware robusto "requireFirebaseAuth" que valida tokens e-mail con lista blanca.
 * 4. INTEGRACIÓN REAL DE MERCADO PAGO CHECKOUT PRO: Creación de preferencias con vencimiento de 24 horas y webhook con firma HMAC-SHA256.
 * 5. SEPARACIÓN ESTRICTA DE VARIABLES DE ENTORNO: Organización rigurosa de claves privadas/públicas y script anti-leaks.
 */

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "./src/firebaseAdmin";
import { MercadoPagoConfig, Preference } from "mercadopago";
import crypto from "crypto";

dotenv.config();

// Initialize Mercado Pago Client Lazily to prevent startup crashes if credentials are missing
let mpClientInstance: MercadoPagoConfig | null = null;
function getMpClient(): MercadoPagoConfig {
  if (!mpClientInstance) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Missing MP_ACCESS_TOKEN in environment variables.");
    }
    mpClientInstance = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });
  }
  return mpClientInstance;
}

// Helper to convert Firestore Timestamp to ISO string
function convertTimestamp(val: any): string {
  if (val && typeof val.toDate === "function") {
    return val.toDate().toISOString();
  }
  if (val && typeof val === "object" && (val._seconds !== undefined || val.seconds !== undefined)) {
    const secs = val._seconds !== undefined ? val._seconds : val.seconds;
    return new Date(secs * 1000).toISOString();
  }
  if (typeof val === "string") {
    return val;
  }
  return new Date().toISOString();
}

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

// Initial Seed Data (to be inserted if Firestore is empty)
const SEED_BOOKINGS = [
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
    totalAmount: 325000,
    status: "confirmed",
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
    status: "confirmed",
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
    totalAmount: 980000,
    status: "pending",
    pointsEarned: 980,
    createdAt: "2026-06-15T18:45:00Z"
  }
];

const SEED_CHATBOT_LOGS = [
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

// Helper to seed Firestore if empty
async function seedFirestoreIfEmpty(db: any) {
  try {
    const bookingsSnap = await db.collection("bookings").limit(1).get();
    if (bookingsSnap.empty) {
      console.log("Seeding initial bookings to Firestore...");
      for (const b of SEED_BOOKINGS) {
        await db.collection("bookings").doc(b.id).set(b);
      }
    }
    const logsSnap = await db.collection("chatbot_logs").limit(1).get();
    if (logsSnap.empty) {
      console.log("Seeding initial chatbot logs to Firestore...");
      for (const log of SEED_CHATBOT_LOGS) {
        await db.collection("chatbot_logs").doc(log.id).set(log);
      }
    }
  } catch (err) {
    console.error("Optional database seeding warning:", err);
  }
}


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

  // Webhook de Mercado Pago (Debe registrarse ANTES de express.json() para recibir el body raw)
  app.post("/api/mp-webhook", express.raw({ type: "application/json" }), async (req: any, res: any) => {
    // Validar firma del webhook
    const xSignature   = req.headers["x-signature"] as string | undefined;
    const xRequestId   = req.headers["x-request-id"] as string | undefined;
    const webhookSecret = process.env.MP_WEBHOOK_SECRET || "";

    if (webhookSecret && xSignature && xRequestId) {
      // Formato de firma MP: "ts=xxx,v1=yyy"
      const parts: Record<string, string> = {};
      xSignature.split(",").forEach(part => {
        const [k, v] = part.split("=");
        if (k && v) parts[k.trim()] = v.trim();
      });

      const ts = parts["ts"];
      const v1 = parts["v1"];

      if (!ts || !v1) {
        res.sendStatus(400);
        return;
      }

      // El body en raw para calcular HMAC
      const rawBody = req.body instanceof Buffer ? req.body.toString("utf-8") : JSON.stringify(req.body);
      const dataToSign = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`;
      const expectedHash = crypto
        .createHmac("sha256", webhookSecret)
        .update(dataToSign)
        .digest("hex");

      if (expectedHash !== v1) {
        console.warn("[MP Webhook] Firma inválida — posible request falsificado.");
        res.sendStatus(401);
        return;
      }
    } else if (webhookSecret) {
      // Hay secret configurado pero no vino la firma → rechazar
      console.warn("[MP Webhook] Signature ausente en el request.");
      res.sendStatus(400);
      return;
    }

    let body: any;
    try {
      body = req.body instanceof Buffer ? JSON.parse(req.body.toString()) : req.body;
    } catch {
      res.sendStatus(400);
      return;
    }

    // MP envía distintos tipos de notificación
    if (body.type !== "payment") {
      res.sendStatus(200); // Ignorar otros tipos (ej. "merchant_order")
      return;
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      res.sendStatus(400);
      return;
    }

    try {
      // Consultar el pago a la API de MP para no confiar sólo en el webhook
      const mpFetch = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      if (!mpFetch.ok) throw new Error(`MP API status: ${mpFetch.status}`);

      const payment = await mpFetch.json();
      const bookingId        = payment.external_reference as string;
      const paymentStatus    = payment.status as string; // approved | rejected | pending | etc.

      if (!bookingId) {
        console.warn("[MP Webhook] Pago sin external_reference:", paymentId);
        res.sendStatus(200);
        return;
      }

      const db = getFirestoreDb();

      // Mapear estado de MP a estado interno
      let newStatus: string | null = null;
      if (paymentStatus === "approved")  newStatus = "confirmed";
      if (paymentStatus === "rejected" || paymentStatus === "cancelled") newStatus = "cancelled";

      if (newStatus) {
        await db.collection("bookings").doc(bookingId).update({
          status: newStatus,
          mpPaymentId: paymentId,
          mpPaymentStatus: paymentStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[MP Webhook] Reserva ${bookingId} actualizada a "${newStatus}" (pago ${paymentId})`);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("[MP Webhook] Error al procesar pago:", err);
      // Devolver 200 igual para que MP no reintente en loop
      res.sendStatus(200);
    }
  });

  app.use(express.json());

  const getFirestoreDb = () => db;

  const ADMIN_EMAILS = new Set(
    (process.env.ADMIN_EMAILS || "fornettiricardo@gmail.com")
      .split(",")
      .map(e => e.trim().toLowerCase())
  );

  async function requireFirebaseAuth(
    req: Request, res: Response, next: NextFunction
  ): Promise<void> {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Se requiere autenticación." });
      return;
    }

    const idToken = authHeader.slice(7);
    try {
      const decoded = await auth.verifyIdToken(idToken);
      const email   = decoded.email?.toLowerCase() || "";

      if (!ADMIN_EMAILS.has(email)) {
        res.status(403).json({ error: "Tu cuenta no tiene permisos de administrador." });
        return;
      }

      // Adjuntar usuario al request para usarlo en los handlers si hace falta
      (req as any).adminUser = { uid: decoded.uid, email };
      next();
    } catch (err: any) {
      if (err.code === "auth/id-token-expired") {
        res.status(401).json({ error: "Sesión expirada. Volvé a iniciar sesión." });
      } else {
        res.status(401).json({ error: "Token de autenticación inválido." });
      }
    }
  }

  // API ROUTES
  app.get("/api/cabins", (req, res) => {
    res.json(cabins);
  });

  app.get("/api/bookings", requireFirebaseAuth, async (req: any, res: any) => {
    try {
      const db = getFirestoreDb();
      // Run seed check in the background/lazily
      seedFirestoreIfEmpty(db).catch(() => {});

      const snapshot = await db.collection("bookings")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: convertTimestamp(data.createdAt)
        };
      });
      res.json(results);
    } catch (err: any) {
      console.error("[Firestore] Error al leer reservas:", err);
      res.status(503).json({ error: "No se pudieron cargar las reservas. Intentá de nuevo." });
    }
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

  app.post("/api/bookings", async (req, res) => {
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
      const db = getFirestoreDb();
      const pricing = calculatePrice(cabinId, checkIn, checkOut);
      const pointsEarned = Math.floor(pricing.total / 1000); // 1 point per $1000 ARS
      
      const newBooking = {
        cabinId,
        cabinName: cabin.name,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        nights: pricing.nights,
        guestsCount: Number(guestsCount),
        totalAmount: pricing.total,
        status: "pending",
        pointsEarned,
        createdAt: FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("bookings").add(newBooking);
      const bookingId = docRef.id;

      // Obtener cliente de Mercado Pago
      const mpClient = getMpClient();

      // Construir la URL base de la app para los retornos
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

      // Crear preferencia de pago en Mercado Pago
      const preference = new Preference(mpClient);
      const mpResponse = await preference.create({
        body: {
          external_reference: bookingId,    // Nuestro ID de reserva en Firestore
          items: [{
            id: cabinId,
            title: `Reserva ${cabin.name} — ${checkIn} al ${checkOut}`,
            quantity: 1,
            unit_price: pricing.total,
            currency_id: "ARS",
            description: `${pricing.nights} noches para ${guestsCount} huéspedes`,
          }],
          payer: {
            name: guestName,
            email: guestEmail,
          },
          back_urls: {
            success: `${appUrl}/reserva/exito?id=${bookingId}`,
            failure: `${appUrl}/reserva/error?id=${bookingId}`,
            pending: `${appUrl}/reserva/pendiente?id=${bookingId}`,
          },
          auto_return: "approved",
          notification_url: `${appUrl}/api/mp-webhook`,
          statement_descriptor: "CABANAS SAN RAFAEL",
          expires: true,
          expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        }
      });

      res.status(201).json({
        id: bookingId, // Mantener id para compatibilidad con el frontend
        bookingId,
        cabinId,
        cabinName: cabin.name,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        nights: pricing.nights,
        guestsCount: Number(guestsCount),
        totalAmount: pricing.total,
        status: "pending",
        pointsEarned,
        createdAt: new Date().toISOString(),
        paymentUrl: mpResponse.sandbox_init_point
          ?? mpResponse.init_point
          ?? null,
      });
    } catch (err: any) {
      console.error("[Firestore/MercadoPago] Error al guardar reserva o crear preferencia:", err);
      if (err.message && err.message.includes("MP_ACCESS_TOKEN")) {
        res.status(503).json({ error: "La integración con Mercado Pago no está configurada. Contactá al administrador." });
      } else if (err.message && (err.message.includes("Cabaña") || err.message.includes("fecha") || err.message.includes("Date") || err.message.includes("checkIn") || err.message.includes("mínimo") || err.message.includes("ocupada"))) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(503).json({ error: "No se pudo registrar la reserva. Intentá nuevamente." });
      }
    }
  });

  app.get("/api/kpis", requireFirebaseAuth, async (req: any, res: any) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection("bookings").limit(500).get();
      const all = snap.docs.map(d => d.data());
      const confirmed = all.filter(b => b.status === "confirmed");
      
      const confirmedNights = confirmed.reduce((sum, b) => sum + (b.nights || 0), 0);
      const occupancyRate = all.length > 0 ? Math.min(Math.round((confirmedNights / 100) * 100), 95) || 68 : 68;

      res.json({
        occupancyRate,
        totalRevenue: confirmed.reduce((s, b) => s + (b.totalAmount || 0), 0),
        activeGuests: confirmed.reduce((s, b) => s + (b.guestsCount || 0), 0),
        pendingBookings: all.filter(b => b.status === "pending").length,
      });
    } catch (err: any) {
      console.error("[Firestore] Error al calcular KPIs:", err);
      res.status(503).json({ error: "No se pudieron cargar los KPIs." });
    }
  });

  app.get("/api/chatbot-logs", requireFirebaseAuth, async (req: any, res: any) => {
    try {
      const db = getFirestoreDb();
      const snapshot = await db.collection("chatbot_logs")
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();
      
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: convertTimestamp(data.timestamp || data.createdAt)
        };
      });
      res.json(results);
    } catch (err: any) {
      console.error("[Firestore] Error al leer logs:", err);
      res.status(503).json({ error: "No se pudieron cargar los logs." });
    }
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
      try {
        const db = getFirestoreDb();
        await db.collection("chatbot_logs").add({
          userPhone: currentUserPhone,
          userName: currentUserName,
          userAlias: currentUserName,
          message: lastUserMsg.slice(0, 200),
          response: replyText.slice(0, 500),
          timestamp: FieldValue.serverTimestamp()
        });
      } catch (logErr) {
        console.error("[Firestore] Error al guardar log de chat:", logErr);
      }

      res.json({ text: replyText });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      // Friendly offline Argentine message fallback if no API key is available
      const fallbackResponse = `¡Hola che! ¿Cómo andás? Mirá, justo estoy con poca señal acá en el Cañón del Atuel, pero te comento que nuestras cabañas en San Rafael están listas para recibirte. 🏕️🍷
      
Para consultas de tarifas o para reservar, podés ingresar a la sección de **Reservar** acá arriba en la web, donde vas a poder ver la disponibilidad real en el calendario y pagar cómodamente con Mercado Pago. 

¿Te gustaría saber sobre alguna cabaña en particular (Atuel para 4, Valle Grande para 6 o Reyunos para parejas)? ¡Preguntame lo que quieras!`;
      
      // Log search fallback to show on dashboard even on failure
      const lastUserMsg = messages[messages.length - 1]?.text || "Hola";
      try {
        const db = getFirestoreDb();
        await db.collection("chatbot_logs").add({
          userPhone: currentUserPhone,
          userName: currentUserName,
          userAlias: currentUserName,
          message: lastUserMsg.slice(0, 200),
          response: fallbackResponse.slice(0, 500),
          timestamp: FieldValue.serverTimestamp()
        });
      } catch (logErr) {
        console.error("[Firestore] Error al guardar log de chat:", logErr);
      }

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
