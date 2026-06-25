/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BoilerplateFile {
  title: string;
  filename: string;
  language: string;
  description: string;
  code: string;
}

export const boilerplateFiles: BoilerplateFile[] = [
  {
    title: "1. Estructura Next.js 14",
    filename: "nextjs-structure.txt",
    language: "bash",
    description: "Estructura recomendada de carpetas para el frontend público y administrativo de la plataforma utilizando Next.js 14 (App Router) y Tailwind CSS v4.",
    code: `cabanas-san-rafael-web/
├── app/
│   ├── layout.tsx             # Root layout con Google Fonts e i18n
│   ├── page.tsx               # Landing page premium (Home)
│   ├── cabanas/
│   │   ├── page.tsx           # Catálogo general de cabañas (ISR)
│   │   └── [id]/
│   │       └── page.tsx       # Ficha individual de la cabaña (ISR / SSG)
│   ├── reservar/
│   │   ├── page.tsx           # Formulario dinámico de reserva (3 pasos)
│   │   └── confirmacion/
│   │       └── page.tsx       # Página de éxito post-pago Mercado Pago
│   ├── destino/
│   │   └── page.tsx           # Sección interactiva turística de San Rafael
│   ├── blog/
│   │   ├── page.tsx           # Feed del blog SEO local
│   │   └── [slug]/
│   │       └── page.tsx       # Artículos del blog optimizados para Schema.org
│   ├── admin/
│   │   ├── page.tsx           # Dashboard de métricas e ingresos (Auth)
│   │   ├── calendario/
│   │   │   └── page.tsx       # Grid de ocupación mensual (Drag & Drop)
│   │   └── cabanas/
│   │       └── page.tsx       # CRUD de cabañas y tarifas por temporada
│   └── api/
│       ├── chatbot/
│       │   └── route.ts       # Endpoint proxy del Asistente de WhatsApp IA
│       └── mercadopago/
│           └── webhook/
│               └── route.ts   # Webhook para notificaciones de pago IPN
├── components/
│   ├── ui/                    # Componentes atómicos (Botones, Calendarios, Cards)
│   ├── Navbar.tsx             # Cabecera de navegación adaptativa
│   ├── Footer.tsx             # Pie de página con widget flotante de WhatsApp
│   └── MotorBusqueda.tsx      # Barra de búsqueda inteligente con fechas
├── lib/
│   ├── db.ts                  # Cliente de base de datos (PostgreSQL/Drizzle)
│   └── mercadopago.ts         # Configuración del SDK de Mercado Pago
├── package.json               # Dependencias de React 19, Tailwind v4 y Next.js 14
└── tailwind.config.js         # Configuración personalizada de temas`
  },
  {
    title: "2. Calendario de Disponibilidad (React)",
    filename: "CalendarioDisponibilidad.tsx",
    language: "typescript",
    description: "Componente React 19 que renderiza un calendario de selección de rango de fechas, con cotizador dinámico que calcula los precios noche a noche de acuerdo a las solapas de temporadas (Baja, Media, Alta) definidas por la administración.",
    code: `import React, { useState, useMemo } from 'react';

interface RateRange {
  startDate: Date;
  endDate: Date;
  rate: number;
  seasonName: 'Baja' | 'Media' | 'Alta';
}

interface Props {
  cabinId: string;
  baseRateBaja: number;
  customRates: RateRange[];
}

export default function CalendarioDisponibilidad({ cabinId, baseRateBaja, customRates }: Props) {
  const [range, setRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Helper para verificar el precio de una fecha específica
  const getRateForDate = (date: Date): { rate: number; season: string } => {
    // Buscar si cae en un rango especial configurado
    const match = customRates.find(r => date >= r.startDate && date <= r.endDate);
    if (match) {
      return { rate: match.rate, season: match.seasonName };
    }
    return { rate: baseRateBaja, season: 'Baja' };
  };

  // Cálculo detallado de la estadía seleccionada
  const reservationDetails = useMemo(() => {
    if (!range.start || !range.end) return null;
    const start = new Date(range.start);
    const end = new Date(range.end);
    const msecs = 1000 * 60 * 60 * 24;
    const nights = Math.ceil((end.getTime() - start.getTime()) / msecs);

    if (nights <= 0) return { error: "La fecha de salida debe ser posterior a la de entrada." };

    const breakdown: Array<{ date: string; rate: number; season: string }> = [];
    let total = 0;

    for (let i = 0; i < nights; i++) {
      const current = new Date(start.getTime() + (i * msecs));
      const { rate, season } = getRateForDate(current);
      breakdown.push({
        date: current.toISOString().split('T')[0],
        rate,
        season
      });
      total += rate;
    }

    return { nights, breakdown, total };
  }, [range, baseRateBaja, customRates]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100 max-w-xl mx-auto">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span>📅</span> Cotizador de Estadía Inteligente
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Entrada (Check-In)</label>
          <input 
            type="date" 
            value={range.start}
            onChange={(e) => setRange(prev => ({ ...prev, start: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Salida (Check-Out)</label>
          <input 
            type="date" 
            value={range.end}
            onChange={(e) => setRange(prev => ({ ...prev, end: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50" 
          />
        </div>
      </div>

      {reservationDetails && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          {'error' in reservationDetails ? (
            <p className="text-rose-500 text-sm font-medium">{reservationDetails.error}</p>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-600 font-medium">Total de Noches:</span>
                <span className="text-slate-800 font-bold">{reservationDetails.nights} noches</span>
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-1 mb-4 pr-1 scrollbar-thin">
                {reservationDetails.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-500 py-1 border-b border-dashed border-slate-200 last:border-0">
                    <span>{item.date} (Temporada {item.season})</span>
                    <span className="font-semibold text-slate-700">$ {item.rate.toLocaleString('es-AR')} ARS</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-800 font-bold text-lg">Monto Total:</span>
                <span className="text-2xl font-black text-sky-600">
                  $ {reservationDetails.total.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-400">ARS</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}`
  },
  {
    title: "3. Mercado Pago Checkout Pro (Server Action)",
    filename: "checkoutMercadoPago.ts",
    language: "typescript",
    description: "Server Action de Next.js que inicializa de forma segura la preferencia de pago de Mercado Pago utilizando su SDK v2, vinculando el id de reserva y el desglose de precios para el checkout del huésped.",
    code: `"use server";

import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicialización del cliente con el token de producción/sandbox desde variables de entorno
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

interface CheckoutInput {
  bookingId: string;
  cabinName: string;
  nights: number;
  totalAmount: number;
  guestEmail: string;
}

export async function createPaymentPreference(data: CheckoutInput) {
  try {
    const preference = new Preference(client);

    // Crear la estructura de la preferencia
    const result = await preference.create({
      body: {
        items: [
          {
            id: data.bookingId,
            title: \`Estadía en \${data.cabinName} - \${data.nights} Noches\`,
            quantity: 1,
            unit_price: data.totalAmount,
            currency_id: 'ARS',
            description: 'Reserva turística en Complejo de Cabañas San Rafael, Mendoza, Argentina.'
          }
        ],
        payer: {
          email: data.guestEmail,
        },
        back_urls: {
          success: \`\${process.env.APP_URL}/reservar/confirmacion?status=success&bookingId=\${data.bookingId}\`,
          failure: \`\${process.env.APP_URL}/reservar/confirmacion?status=failed&bookingId=\${data.bookingId}\`,
          pending: \`\${process.env.APP_URL}/reservar/confirmacion?status=pending&bookingId=\${data.bookingId}\`,
        },
        auto_return: 'approved',
        notification_url: \`\${process.env.APP_URL}/api/mercadopago/webhook\`,
        external_reference: data.bookingId,
        metadata: {
          booking_id: data.bookingId
        }
      }
    });

    // Retorna el init_point oficial de Mercado Pago para redirigir al huésped
    return {
      success: true,
      initPoint: result.init_point,
      preferenceId: result.id
    };

  } catch (error: any) {
    console.error("Error al crear preferencia de Mercado Pago:", error);
    return {
      success: false,
      error: error.message || "Error al inicializar el procesador de pagos."
    };
  }
}`
  },
  {
    title: "4. Esquema de Base de Datos (SQL)",
    filename: "schema.sql",
    language: "sql",
    description: "Estructura SQL relacional óptima en PostgreSQL para soportar cabañas, huéspedes, temporadas, precios dinámicos, promociones, reservas, logs del chatbot, puntos de fidelización y métricas administrativas.",
    code: `-- Base de Datos Relacional para Cabañas San Rafael (Mendoza, Argentina)
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE season_type AS ENUM ('baja', 'media', 'alta');
CREATE TYPE loyalty_level AS ENUM ('Viajero', 'Explorador', 'Aventurero', 'VIP');

-- Tabla de Cabañas
CREATE TABLE cabanas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INT NOT NULL,
    area_m2 INT,
    rooms_count INT,
    services TEXT[], -- Array de prestaciones (WiFi, piscina, jacuzzi, etc.)
    images TEXT[],   -- Array de URLs de la galería
    price_baja NUMERIC(12, 2) NOT NULL,
    price_media NUMERIC(12, 2) NOT NULL,
    price_alta NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Huéspedes
CREATE TABLE huespedes (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    fidelity_points INT DEFAULT 0,
    fidelity_level loyalty_level DEFAULT 'Viajero',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Temporadas y Precios Dinámicos con solapamiento controlado
CREATE TABLE temporadas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type season_type NOT NULL,
    check (start_date <= end_date)
);

-- Tabla de Reservas
CREATE TABLE reservas (
    id VARCHAR(50) PRIMARY KEY, -- Formato RES-XXXX
    cabana_id VARCHAR(50) REFERENCES cabanas(id),
    huesped_id INT REFERENCES huespedes(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights_count INT NOT NULL,
    guests_count INT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    status booking_status DEFAULT 'pending',
    mercado_pago_pref_id VARCHAR(100),
    mercado_pago_payment_id VARCHAR(100),
    points_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check (check_in < check_out)
);

-- Tabla de Registro (Logs) del Asistente Virtual de WhatsApp IA
CREATE TABLE chatbot_logs (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(30) NOT NULL,
    user_name VARCHAR(100),
    incoming_message TEXT NOT NULL,
    outgoing_response TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Rendimiento para Búsqueda de Ocupación y SEO
CREATE INDEX idx_reservas_fechas ON reservas (check_in, check_out) WHERE status = 'confirmed';
CREATE INDEX idx_temporadas_fechas ON temporadas (start_date, end_date);
CREATE INDEX idx_huespedes_dni ON huespedes (dni);`
  },
  {
    title: "5. Módulo NestJS (Reservas)",
    filename: "booking.module.ts",
    language: "typescript",
    description: "Boilerplate de arquitectura NestJS desacoplada. Muestra la definición del controlador, el servicio inyectable con cálculo dinámico de tarifas, y los DTOs de validación con class-validator para el motor de reservas.",
    code: `// ==========================================
// booking.dto.ts
// ==========================================
import { IsString, IsNotEmpty, IsDateString, IsInt, IsEmail, Min, Max } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  cabinId: string;

  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsString()
  guestPhone: string;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsInt()
  @Min(1)
  @Max(10)
  guestsCount: number;
}

// ==========================================
// booking.service.ts
// ==========================================
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

@Injectable()
export class BookingService {
  // Simulando inyección de repositorios
  private readonly cabinsTable = new Map(); // database mock

  async calculateStayPrice(cabinId: string, checkIn: Date, checkOut: Date): Promise<number> {
    const cabin = this.cabinsTable.get(cabinId);
    if (!cabin) throw new NotFoundException('La cabaña solicitada no existe.');

    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) throw new BadRequestException('Fechas inválidas para estadía.');

    let total = 0;
    for (let i = 0; i < nights; i++) {
      const current = new Date(checkIn.getTime() + i * 24 * 60 * 60 * 1000);
      // Lógica de cálculo estacional:
      const month = current.getMonth() + 1; // 1-12
      let rate = cabin.priceBaja;
      if ([12, 1, 2, 7].includes(month)) {
        rate = cabin.priceAlta; // Verano e Invierno alta nieve
      } else if ([3, 4, 9, 10, 11].includes(month)) {
        rate = cabin.priceMedia; // Otoño Vendimia y Primavera
      }
      total += rate;
    }
    return total;
  }

  async create(dto: CreateBookingDto) {
    const checkInDate = new Date(dto.checkIn);
    const checkOutDate = new Date(dto.checkOut);
    
    const amount = await this.calculateStayPrice(dto.cabinId, checkInDate, checkOutDate);
    
    const newBooking = {
      id: \`RES-\${Math.floor(1000 + Math.random() * 9000)}\`,
      ...dto,
      totalAmount: amount,
      status: 'pending',
      createdAt: new Date(),
    };

    // guardar en DB...
    return newBooking;
  }
}

// ==========================================
// booking.controller.ts
// ==========================================
import { Controller, Post, Body, Get, Param } from '@nestjs/common';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Post('quote')
  async quoteStay(@Body() body: { cabinId: string; checkIn: string; checkOut: string }) {
    const start = new Date(body.checkIn);
    const end = new Date(body.checkOut);
    const total = await this.bookingService.calculateStayPrice(body.cabinId, start, end);
    return { cabinId: body.cabinId, checkIn: body.checkIn, checkOut: body.checkOut, total };
  }
}`
  },
  {
    title: "6. Chatbot WhatsApp & IA Flow (Node.js)",
    filename: "whatsapp-chatbot-api.js",
    language: "javascript",
    description: "Controlador Node.js para recibir mensajes de Meta WhatsApp Cloud API (Webhook), mantener la persistencia contextual de la conversación del huésped e integrarse con el modelo de Gemini para responder de forma automática.",
    code: `const express = require('express');
const axios = require('axios');
const router = express.Router();

// Credenciales oficiales de Meta y Gemini
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Almacenamiento contextual en memoria (Sugerencia: migrar a Redis en producción)
const sessions = new Map();

// Verificación del Token para Webhook de Meta Developer
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recepción y procesamiento de mensajes entrantes
router.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    const msg = body.entry[0].changes[0].value.messages[0];
    const from = msg.from; // Número del cliente
    const text = msg.text?.body;
    const userName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || "Huésped";

    if (text) {
      await handleIncomingMessage(from, userName, text);
    }
  }
  res.sendStatus(200);
});

async function handleIncomingMessage(phone, name, text) {
  // 1. Obtener o crear sesión conversacional para mantener memoria del chat
  if (!sessions.has(phone)) {
    sessions.set(phone, [
      { role: "user", parts: [{ text: "Hola" }] },
      { role: "model", parts: [{ text: \`¡Hola \${name}! Qué hacés che, cómo andás? Soy Santi, tu conserje digital de Cabañas San Rafael. ¿En qué te puedo dar una mano hoy?\` }] }
    ]);
  }

  const history = sessions.get(phone);
  history.push({ role: "user", parts: [{ text: text }] });

  // 2. Comunicarse con el servicio de Gemini con el sistema de instrucciones embebido
  try {
    const response = await axios.post(\`\${GEMINI_API_URL}?key=\${GEMINI_API_KEY}\`, {
      contents: history,
      systemInstruction: {
        parts: [{ text: "Actuás como Santi, el conserje virtual por WhatsApp de Cabañas San Rafael en Mendoza, Argentina. Hablás con voseo argentino, sos súper cálido, amigable y resolutivo. Ofrecés detalles de las cabañas y sugerís visitar el Cañón del Atuel, Valle Grande y bodegas locales." }]
      },
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 250
      }
    });

    const aiReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Disculpame che, se me congeló la señal en la cordillera. ¿Me repetís?";
    history.push({ role: "model", parts: [{ text: aiReply }] });

    // Guardar historial recortado para no saturar memoria/tokens
    sessions.set(phone, history.slice(-10));

    // 3. Responder al huésped mediante la API de WhatsApp
    await axios.post(\`https://graph.facebook.com/v18.0/\${PHONE_NUMBER_ID}/messages\`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: { body: aiReply }
    }, {
      headers: { 'Authorization': \`Bearer \${WHATSAPP_TOKEN}\` }
    });

  } catch (error) {
    console.error("Error en flujo de Chatbot IA:", error);
  }
}`
  },
  {
    title: "7. Home App de Huéspedes (Flutter / Dart)",
    filename: "home_guest_screen.dart",
    language: "dart",
    description: "Componente visual estructurado en Flutter para la aplicación móvil que el huésped descarga antes de su viaje. Proporciona acceso al check-in digital, solicitudes de limpieza, chat directo e información local turística en tiempo real.",
    code: `import 'package:flutter/material';

class HomeGuestScreen extends StatefulWidget {
  final Map<String, dynamic> bookingData;

  const HomeGuestScreen({Key? key, required this.bookingData}) : super(key: key);

  @override
  _HomeGuestScreenState createState() => _HomeGuestScreenState();
}

class _HomeGuestScreenState extends State<HomeGuestScreen> {
  @override
  Widget build(BuildContext context) {
    final guestName = widget.bookingData['guestName'] ?? 'Viajero';
    final cabinName = widget.bookingData['cabinName'] ?? 'Cabaña San Rafael';
    final checkIn = widget.bookingData['checkIn'] ?? '';
    final status = widget.bookingData['status'] ?? 'Pendiente';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('Mi Estadía', style: TextStyle(fontFamily: 'Playfair', fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F4C81),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_active),
            onPressed: () {},
          )
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Banner de Bienvenida Cálida
              Text(
                '¡Hola $guestName!',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
              ),
              const Text('Tu refugio en la montaña de San Rafael te espera.', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 20),

              // Card de Estado de Reserva Activa
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0F4C81), Color(0xFF4EA8DE)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          const Icon(Icons.home_work, color: Colors.white, size: 30),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, py: 4),
                            decoration: BoxDecoration(
                              color: Colors.white24,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              status.toUpperCase(),
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 15),
                      Text(
                        cabinName,
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Fecha de Llegada: $checkIn (Check-In 14:00)',
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Grid de Accesos Rápidos Automáticos (Servicios al Huésped)
              const Text('Servicios y Solicitudes', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 3,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                children: [
                  _buildQuickAction(Icons.how_to_reg, 'Check-In DNI', Colors.teal),
                  _buildQuickAction(Icons.cleaning_services, 'Limpieza', Colors.amber),
                  _buildQuickAction(Icons.build, 'Mantenimiento', Colors.red),
                  _buildQuickAction(Icons.chat_bubble, 'Santi Chat', Colors.green),
                  _buildQuickAction(Icons.map, 'Guía San Rafael', Colors.indigo),
                  _buildQuickAction(Icons.vpn_key, 'Llave Digital', Colors.purple),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF4A5568)),
            )
          ],
        ),
      ),
    );
  }
}`
  },
  {
    title: "8. Dashboard WebSockets & Admin KPIs (React)",
    filename: "DashboardAdmin.tsx",
    language: "typescript",
    description: "Componente React 19 para el Panel Administrativo que consume estadísticas en tiempo real y gestiona suscripciones por WebSockets para actualizar el contador de ocupación y logs de mensajería al instante.",
    code: `import React, { useEffect, useState } from 'react';

interface KPIState {
  occupancyRate: number;
  totalRevenue: number;
  activeGuests: number;
  pendingBookings: number;
}

export default function DashboardAdmin() {
  const [kpis, setKpis] = useState<KPIState>({
    occupancyRate: 0,
    totalRevenue: 0,
    activeGuests: 0,
    pendingBookings: 0
  });
  const [wsLogs, setWsLogs] = useState<string[]>([]);

  useEffect(() => {
    // 1. Fetch de Métricas Iniciales (Polling / REST)
    const fetchKPIs = async () => {
      try {
        const res = await fetch('/api/kpis');
        const data = await res.json();
        setKpis(data);
      } catch (err) {
        console.error("Error al cargar KPIs del panel administrativo:", err);
      }
    };
    fetchKPIs();

    // 2. Suscripción por WebSockets para actualizaciones en Tiempo Real (Real-time update)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = \`\${wsProtocol}//\${window.location.host}/ws/admin\`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'KPI_UPDATE') {
        setKpis(data.payload);
      } else if (data.type === 'CHATBOT_ALERT') {
        setWsLogs(prev => [\`[\${new Date().toLocaleTimeString()}] Nueva consulta: \${data.payload}\`, ...prev.slice(0, 10)]);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h2 className="text-2xl font-black tracking-tight mb-6">📊 Centro de Mandos - KPIs en Tiempo Real</h2>
      
      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Porcentaje de Ocupación</p>
          <p className="text-3xl font-black text-sky-400">{kpis.occupancyRate}%</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Facturación Total (ARS)</p>
          <p className="text-3xl font-black text-emerald-400">$ {kpis.totalRevenue.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Huéspedes Activos</p>
          <p className="text-3xl font-black text-amber-400">{kpis.activeGuests} pers.</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Reservas Pendientes</p>
          <p className="text-3xl font-black text-rose-400">{kpis.pendingBookings} res.</p>
        </div>
      </div>

      {/* Monitor de Eventos en Vivo */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-widest flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
          Actividad Reciente del Chatbot
        </h3>
        <div className="font-mono text-xs text-slate-300 space-y-2 h-40 overflow-y-auto bg-slate-950 p-4 rounded-xl">
          {wsLogs.length === 0 ? (
            <p className="text-slate-500 italic">Esperando eventos en tiempo real...</p>
          ) : (
            wsLogs.map((log, i) => <div key={i} className="border-b border-slate-800/50 pb-1">{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
}`
  }
];
