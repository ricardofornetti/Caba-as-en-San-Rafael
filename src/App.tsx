/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Home, 
  Calendar, 
  ShieldCheck, 
  MessageSquare, 
  FileCode, 
  Compass, 
  MapPin, 
  CheckCircle, 
  ChevronRight, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Clock, 
  ChevronLeft, 
  Info, 
  ExternalLink, 
  Heart, 
  Layers, 
  Search, 
  Sparkles,
  Clipboard,
  Check,
  Send,
  Phone,
  Wifi,
  Tv,
  Airplay,
  Flame,
  Volume2,
  Lock,
  Menu
} from "lucide-react";
import { Cabin, Booking, ChatbotLog, KPIs } from "./types";
import { boilerplateFiles, BoilerplateFile } from "./boilerplateData";

export default function App() {
  const [activeTab, setActiveTab] = useState<"public" | "booking" | "admin" | "chatbot" | "code" | "roadmap">("public");
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [selectedCabinId, setSelectedCabinId] = useState<string>("atuel");
  const [loadingCabins, setLoadingCabins] = useState(true);

  // Booking states
  const [bookingStep, setBookingStep] = useState(1);
  const [checkIn, setCheckIn] = useState("2026-06-25");
  const [checkOut, setCheckOut] = useState("2026-06-29");
  const [guestsCount, setGuestsCount] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [pricingQuote, setPricingQuote] = useState<{ nights: number; total: number; breakdown: any[] } | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<Booking | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Admin states
  const [kpis, setKpis] = useState<KPIs>({ occupancyRate: 0, totalRevenue: 0, activeGuests: 0, pendingBookings: 0 });
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatbotLog[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // WhatsApp Chatbot Simulator States
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; text: string; timestamp: string }>>([
    {
      role: "model",
      text: "¡Hola che! Qué hacés, cómo va todo? 🏕️ Soy Santi, tu conserje virtual de Cabañas San Rafael.\n¿Andás con ganas de venirte a descansar al Cañón del Atuel o a Los Reyunos? Comentame para cuántas personas buscás y te tiro la info al toque. 🧉🍷",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [simulatedUserName, setSimulatedUserName] = useState("Ricardo");
  const [simulatedUserPhone, setSimulatedUserPhone] = useState("+54 9 261 555-9876");

  // Boilerplate states
  const [selectedCodeIndex, setSelectedCodeIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Notification Banner
  const [bannerText, setBannerText] = useState<string | null>(null);

  // Fetch initial cabins
  useEffect(() => {
    fetch("/api/cabins")
      .then((res) => res.json())
      .then((data) => {
        setCabins(data);
        setLoadingCabins(false);
      })
      .catch((err) => {
        console.error("Error fetching cabins:", err);
        setLoadingCabins(false);
      });
  }, []);

  // Recalculate price when checkin, checkout or cabin changes
  useEffect(() => {
    if (checkIn && checkOut && selectedCabinId) {
      setCalculatingPrice(true);
      fetch("/api/bookings/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cabinId: selectedCabinId, checkIn, checkOut }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setPricingQuote(data);
          } else {
            setPricingQuote(null);
          }
          setCalculatingPrice(false);
        })
        .catch((err) => {
          console.error(err);
          setCalculatingPrice(false);
        });
    }
  }, [checkIn, checkOut, selectedCabinId]);

  // Load Admin Data on tab switch
  const loadAdminData = () => {
    setLoadingAdmin(true);
    Promise.all([
      fetch("/api/kpis").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/chatbot-logs").then((r) => r.json())
    ])
      .then(([kpiData, bookingsData, logData]) => {
        setKpis(kpiData);
        setBookingsList(bookingsData);
        setChatLogs(logData);
        setLoadingAdmin(false);
      })
      .catch((err) => {
        console.error("Error loading admin stats:", err);
        setLoadingAdmin(false);
      });
  };

  useEffect(() => {
    if (activeTab === "admin") {
      loadAdminData();
    }
  }, [activeTab]);

  // Handle Booking Submit
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !guestPhone) {
      triggerBanner("Por favor, completá todos tus datos personales.");
      return;
    }

    setSubmittingBooking(true);
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cabinId: selectedCabinId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        guestsCount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSubmittingBooking(false);
        if (!data.error) {
          setBookingSuccessData(data);
          setBookingStep(3);
          triggerBanner("¡Reserva confirmada con éxito! Se sumaron puntos de fidelización.");
        } else {
          triggerBanner("Error al procesar reserva: " + data.error);
        }
      })
      .catch((err) => {
        console.error(err);
        setSubmittingBooking(false);
        triggerBanner("Hubo un problema al contactar al servidor.");
      });
  };

  // Chat message send handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText("");

    const newMsgs = [
      ...chatMessages,
      { role: "user" as const, text: userMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setChatMessages(newMsgs);
    setSendingMessage(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, text: m.text })),
          userName: simulatedUserName,
          userPhone: simulatedUserPhone
        })
      });

      const data = await response.json();
      setChatMessages(prev => [
        ...prev,
        {
          role: "model",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  const triggerBanner = (msg: string) => {
    setBannerText(msg);
    setTimeout(() => setBannerText(null), 5000);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    triggerBanner("¡Código copiado al portapapeles con éxito!");
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const selectedCabin = cabins.find((c) => c.id === selectedCabinId) || cabins[0];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Banner Warning or Feedback */}
      {bannerText && (
        <div className="bg-[#0F4C81] text-white py-3 px-4 text-center text-sm font-semibold sticky top-0 z-50 flex items-center justify-center gap-2 animate-pulse shadow-md">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{bannerText}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-[#F5F0E1] sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-[#0F4C81] to-[#4EA8DE] rounded-xl flex items-center justify-center shadow-md">
                <Compass className="w-6 h-6 text-white animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0F4C81] tracking-tight">Cabañas San Rafael</h1>
                <p className="text-xs text-[#5C946E] font-sans font-semibold uppercase tracking-wider">Mendoza, Argentina</p>
              </div>
            </div>

            {/* Weather & Info widgets */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-right border-r border-[#F5F0E1] pr-4">
                <span className="text-xs text-slate-400 block font-medium">Clima San Rafael</span>
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1 justify-end">☀️ 18°C Sol Despejado</span>
              </div>
              <div className="text-right border-r border-[#F5F0E1] pr-4">
                <span className="text-xs text-slate-400 block font-medium">Temporada Actual</span>
                <span className="text-sm font-semibold text-amber-700 uppercase tracking-wider">Media (Otoño/Primavera)</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Zona Horaria</span>
                <span className="text-sm font-semibold text-slate-700">America/Buenos_Aires</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-100">
            {[
              { id: "public", label: "Sitio Público & Destino", icon: Home },
              { id: "booking", label: "Motor de Reservas", icon: Calendar },
              { id: "chatbot", label: "Chatbot Santi (WhatsApp)", icon: MessageSquare },
              { id: "admin", label: "Panel Admin (KPIs)", icon: ShieldCheck },
              { id: "code", label: "Código Generado", icon: FileCode },
              { id: "roadmap", label: "Roadmap & SEO", icon: Layers },
            ].map((tab) => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#0F4C81] text-white shadow-md shadow-slate-100"
                      : "text-slate-600 hover:bg-[#F5F0E1] hover:text-[#0F4C81]"
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ==================== TAB: PUBLIC SITE ==================== */}
        {activeTab === "public" && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[460px] flex flex-col justify-end p-6 sm:p-12">
              {/* Image background from Unsplash depicting Valle Grande river/lake */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/60 to-transparent" />
              
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 bg-[#5C946E] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" /> Exclusividad y Aventura
                </div>
                <h2 className="text-4xl sm:text-5xl font-serif font-black text-white leading-tight">
                  Tu refugio soñado entre el río Atuel y el sol mendocino.
                </h2>
                <p className="text-slate-200 text-base sm:text-lg">
                  Complejo turístico boutique frente al agua en Valle Grande, San Rafael. Cabañas rústicas de lujo, piscinas templadas, bajada privada al río y cocina regional. El escape perfecto para tu alma aventurera.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <button 
                    onClick={() => setActiveTab("booking")}
                    className="bg-[#4EA8DE] hover:bg-[#0F4C81] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    Reservar Estadía Directa <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveTab("chatbot")}
                    className="bg-[#5C946E] hover:bg-[#467354] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Chatear con Santi IA
                  </button>
                </div>
              </div>
            </div>

            {/* Cabins Catalogue */}
            <div>
              <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
                <h3 className="text-3xl font-serif font-black text-[#0F4C81]">Nuestras Cabañas Exclusivas</h3>
                <p className="text-slate-500 text-sm">
                  Cada una diseñada con identidad única, equipamiento de primera calidad y vistas espectaculares al paisaje cordillerano.
                </p>
              </div>

              {loadingCabins ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-slate-300 border-t-[#0F4C81] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500 font-semibold">Cargando cabañas...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {cabins.map((cabin) => (
                    <div key={cabin.id} className="bg-white rounded-2xl overflow-hidden border border-[#F5F0E1] shadow-lg flex flex-col group hover:shadow-xl transition-all duration-300">
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={cabin.images[0]} 
                          alt={cabin.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-[#0F4C81]">
                          👤 Máx {cabin.capacity} pers.
                        </div>
                      </div>
                      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-slate-800 font-serif leading-snug group-hover:text-[#0F4C81] transition-colors">{cabin.name}</h4>
                          <p className="text-xs text-[#5C946E] font-semibold">{cabin.rooms} Habitaciones · {cabin.area} m²</p>
                          <p className="text-slate-500 text-xs line-clamp-3 pt-1">{cabin.description}</p>
                        </div>
                        <div className="space-y-3 pt-2">
                          <div className="border-t border-slate-100 pt-3 flex justify-between items-end">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tarifa Base Baja</span>
                              <span className="text-lg font-black text-[#0F4C81]">${cabin.priceBaja.toLocaleString("es-AR")} <span className="text-xs font-normal text-slate-500">/noche</span></span>
                            </div>
                            <span className="text-xs text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg font-semibold uppercase">Directo</span>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedCabinId(cabin.id);
                              setActiveTab("booking");
                              setBookingStep(1);
                            }}
                            className="w-full bg-[#0F4C81] group-hover:bg-[#4EA8DE] text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Ver Disponibilidad & Cotizar <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mendoza Tour Guide & Experiences */}
            <div className="bg-[#F5F0E1]/50 rounded-3xl p-8 sm:p-12 border border-[#F5F0E1]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C946E] bg-[#5C946E]/10 px-3 py-1 rounded-full uppercase tracking-widest">
                    <MapPin className="w-3.5 h-3.5" /> Destino San Rafael, Mendoza
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-serif font-black text-[#0F4C81]">Viví experiencias únicas en la Cordillera</h3>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    San Rafael es un oasis de aventura, bodegas y naturaleza imponente. Nuestro complejo se ubica estratégicamente para brindarte acceso directo a las mejores actividades locales:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { title: "Rafting en el Río Atuel", desc: "Navegá los emocionantes rápidos de montaña." },
                      { title: "Valle Grande y Diques", desc: "Paseos en lancha, kayak y asombrosos miradores." },
                      { title: "Los Reyunos Turquesa", desc: "Tirobangi, pesca, windsurf y relax supremo." },
                      { title: "Ruta del Vino & Bodegas", desc: "Degustá los mejores Malbecs en visitas guiadas." }
                    ].map((exp, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                        <span className="text-lg">🏕️</span>
                        <div>
                          <h5 className="font-bold text-slate-800 text-xs">{exp.title}</h5>
                          <p className="text-[11px] text-slate-500">{exp.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#4EA8DE]/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[#5C946E]/10 rounded-full blur-2xl" />
                  
                  <div className="relative grid grid-cols-2 gap-4">
                    <img 
                      src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80" 
                      alt="Atuel Canyon" 
                      className="rounded-2xl shadow-md h-40 sm:h-48 w-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <img 
                      src="https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80" 
                      alt="Wine Tasting Mendoza" 
                      className="rounded-2xl shadow-md h-40 sm:h-48 w-full object-cover mt-6 hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* General Services & Amenity Badges */}
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h4 className="text-xl font-bold font-serif text-slate-800">Servicios Premium del Complejo</h4>
                <p className="text-slate-500 text-xs">Todo incluido para asegurar tu comodidad y paz total durante la estadía.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { name: "WiFi Alta Velocidad", icon: Wifi, desc: "Soporte de fibra óptica." },
                  { name: "Smart TV & Netflix", icon: Tv, desc: "Para noches de película." },
                  { name: "Aire Acondicionado", icon: Airplay, desc: "Frío/Calor en cada ambiente." },
                  { name: "Parrilla Individual", icon: Flame, desc: "Para tu asado privado." },
                  { name: "Desayuno de Campo", icon: Volume2, desc: "Canasta artesanal directa." },
                  { name: "Pet Friendly", icon: Heart, desc: "Tus pichichos son bienvenidos." }
                ].map((serv, idx) => {
                  const Icon = serv.icon;
                  return (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 text-center shadow-sm hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-[#0F4C81]/5 text-[#0F4C81] rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h5 className="font-bold text-xs text-slate-800 mb-1">{serv.name}</h5>
                      <p className="text-[10px] text-slate-400">{serv.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: BOOKING MOTOR ==================== */}
        {activeTab === "booking" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-serif font-black text-[#0F4C81]">Motor de Reservas Directas</h3>
              <p className="text-slate-500 text-sm">Evitá las comisiones de agencias externas. Cotizá en tiempo real y asegurá tu cabaña en 3 simples pasos.</p>
            </div>

            {/* Booking Steps Progress Indicator */}
            <div className="flex justify-center items-center gap-2 sm:gap-6 pb-4">
              {[
                { step: 1, name: "Fechas & Cabaña" },
                { step: 2, name: "Datos Personales" },
                { step: 3, name: "Confirmación" }
              ].map((s) => (
                <React.Fragment key={s.step}>
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      bookingStep >= s.step 
                        ? "bg-[#0F4C81] text-white shadow-md shadow-slate-200" 
                        : "bg-slate-200 text-slate-500"
                    }`}>
                      {s.step}
                    </span>
                    <span className={`text-xs font-semibold hidden sm:inline ${
                      bookingStep >= s.step ? "text-[#0F4C81]" : "text-slate-400"
                    }`}>
                      {s.name}
                    </span>
                  </div>
                  {s.step < 3 && <div className={`h-0.5 w-12 rounded-full ${bookingStep > s.step ? "bg-[#0F4C81]" : "bg-slate-200"}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Error Notification inside stepper */}
            {checkIn && checkOut && new Date(checkIn) >= new Date(checkOut) && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold text-center">
                ⚠️ Atención: La fecha de Check-Out debe ser posterior al Check-In. Por favor ajustá el rango.
              </div>
            )}

            {/* STEP 1: SELECT CABIN AND DATES */}
            {bookingStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Form controls */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-xl space-y-6">
                  <h4 className="font-serif font-bold text-slate-800 text-lg flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <span>📅</span> Parámetros de Estadía
                  </h4>

                  <div className="space-y-4">
                    {/* Cabin selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Seleccionar Cabaña</label>
                      <select 
                        value={selectedCabinId} 
                        onChange={(e) => setSelectedCabinId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-[#FDFBF7] font-semibold text-sm focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                      >
                        {cabins.map(c => (
                          <option key={c.id} value={c.id}>{c.name} (Máx {c.capacity} pers.)</option>
                        ))}
                      </select>
                    </div>

                    {/* Date picker inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Check-In (Entrada)</label>
                        <input 
                          type="date" 
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-[#FDFBF7] font-semibold text-sm focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Check-Out (Salida)</label>
                        <input 
                          type="date" 
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 bg-[#FDFBF7] font-semibold text-sm focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Guests count */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cantidad de Huéspedes</label>
                      <input 
                        type="number" 
                        min="1" 
                        max={selectedCabin?.capacity || 6}
                        value={guestsCount}
                        onChange={(e) => setGuestsCount(Math.min(selectedCabin?.capacity || 6, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-[#FDFBF7] font-semibold text-sm focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Capacidad máxima autorizada para esta cabaña: {selectedCabin?.capacity} personas.</span>
                    </div>
                  </div>

                  {/* Summary of active cabin features */}
                  {selectedCabin && (
                    <div className="bg-[#F5F0E1]/30 p-4 rounded-xl border border-[#F5F0E1] space-y-2">
                      <h5 className="font-bold text-xs text-[#0F4C81] flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Detalles de {selectedCabin.name}
                      </h5>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{selectedCabin.descriptionFull}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedCabin.services.slice(0, 4).map((s, i) => (
                          <span key={i} className="text-[9px] bg-[#5C946E]/10 text-[#5C946E] px-2 py-0.5 rounded-full font-bold">✓ {s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right stay quotation summary */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-xl flex-grow space-y-4">
                    <h4 className="font-serif font-bold text-slate-800 text-lg border-b border-slate-100 pb-3">
                      Resumen de Cotización
                    </h4>

                    {calculatingPrice ? (
                      <div className="py-12 text-center">
                        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#0F4C81] rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs text-slate-400">Recalculando tarifas oficiales...</p>
                      </div>
                    ) : pricingQuote ? (
                      <div className="space-y-4">
                        <div className="flex justify-between text-xs text-slate-500 font-bold uppercase">
                          <span>Detalle</span>
                          <span>Importe</span>
                        </div>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {pricingQuote.breakdown.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-50 pb-2">
                              <div>
                                <span className="font-semibold">{item.date}</span>
                                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  item.season === "alta" ? "bg-rose-50 text-rose-600" : item.season === "media" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                }`}>
                                  {item.season}
                                </span>
                              </div>
                              <span className="font-mono font-bold">${item.rate.toLocaleString("es-AR")}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Cantidad de noches</span>
                            <span className="font-bold text-sm text-slate-700">{pricingQuote.nights} noches</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Puntos de fidelidad</span>
                            <span className="text-xs text-[#5C946E] font-bold flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" /> +{Math.floor(pricingQuote.total / 1000)} pts
                            </span>
                          </div>
                          <div className="flex justify-between items-end pt-2 border-t border-dashed border-slate-100">
                            <span className="font-bold text-sm text-[#0F4C81]">Total Estimado</span>
                            <div className="text-right">
                              <span className="text-xl sm:text-2xl font-black text-[#0F4C81]">${pricingQuote.total.toLocaleString("es-AR")}</span>
                              <span className="text-[10px] text-slate-400 block font-bold">ARS (IVA Incluido)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-12">Por favor ingresá un rango válido de fechas para cotizar estadía.</p>
                    )}
                  </div>

                  <button
                    disabled={!pricingQuote || new Date(checkIn) >= new Date(checkOut)}
                    onClick={() => setBookingStep(2)}
                    className="w-full bg-[#0F4C81] hover:bg-[#4EA8DE] disabled:opacity-50 text-white py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Completar Datos Personales <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FILL GUEST INFO */}
            {bookingStep === 2 && (
              <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left personal data input */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-xl space-y-4">
                  <h4 className="font-serif font-bold text-slate-800 text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span>👤</span> Registro de Huésped Principal
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre Completo</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ej. Martín Rodríguez"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-[#FDFBF7] font-semibold text-sm focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-widest mb-1">Email de Confirmación</label>
                      <input 
                        type="email"
                        required
                        placeholder="Ej. martin.rodriguez@gmail.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-[#FDFBF7] font-semibold text-sm focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-widest mb-1">Celular / WhatsApp (Con código de área)</label>
                      <input 
                        type="tel"
                        required
                        placeholder="Ej. +54 9 261 555-1234"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-[#FDFBF7] font-semibold text-sm focus:ring-2 focus:ring-[#0F4C81] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-[#5C946E]/10 p-4 rounded-xl border border-[#5C946E]/20 text-xs text-[#5C946E] flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Política de Garantía & Cancelación:</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Reservás de forma directa. La cancelación es gratuita hasta 7 días antes del ingreso. Recibirás confirmación automática vía email y WhatsApp con un conserje asignado.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right pricing & Checkout trigger */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-xl space-y-4">
                    <h4 className="font-serif font-bold text-slate-800 text-lg border-b border-slate-100 pb-3">Detalle Final</h4>
                    
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Cabaña seleccionada:</span>
                        <span className="font-bold text-slate-800 text-right">{selectedCabin?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fechas de estadía:</span>
                        <span className="font-bold text-slate-800 text-right">{checkIn} al {checkOut}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Noches totales:</span>
                        <span className="font-bold text-slate-800">{pricingQuote?.nights} noches</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Huéspedes indicados:</span>
                        <span className="font-bold text-slate-800">{guestsCount} personas</span>
                      </div>
                      <div className="border-t border-slate-100 pt-3 flex justify-between items-end">
                        <span className="font-bold text-[#0F4C81]">Monto Total:</span>
                        <span className="text-xl font-black text-[#0F4C81]">${pricingQuote?.total.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={submittingBooking}
                      className="w-full bg-[#5C946E] hover:bg-[#467354] disabled:opacity-50 text-white py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submittingBooking ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Procesando Reserva...
                        </>
                      ) : (
                        <>
                          💳 Pagar con Mercado Pago / Confirmar <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Modificar Fechas / Cabaña
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: BOOKING SUCCESS & SHOW LOYALTY POINTS */}
            {bookingStep === 3 && bookingSuccessData && (
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#F5F0E1] shadow-2xl text-center max-w-xl mx-auto space-y-6">
                <div className="w-20 h-20 bg-emerald-50 text-[#5C946E] rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-12 h-12" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-2xl font-serif font-black text-[#0F4C81]">¡Reserva Registrada y Confirmada!</h4>
                  <p className="text-slate-500 text-xs">
                    ¡Listo, {bookingSuccessData.guestName}! Tu estadía ha sido reservada de forma directa. Tu identificador único de reserva es:
                  </p>
                  <span className="inline-block bg-[#0F4C81]/5 text-[#0F4C81] font-mono text-sm font-black px-4 py-1.5 rounded-lg border border-[#0F4C81]/15 tracking-widest">{bookingSuccessData.id}</span>
                </div>

                <div className="bg-[#F5F0E1]/50 p-5 rounded-2xl border border-[#F5F0E1] text-left text-xs space-y-3">
                  <h5 className="font-bold text-[#0F4C81] flex items-center gap-1">
                    <Award className="w-4 h-4" /> Resumen de Beneficios por Reserva Directa:
                  </h5>
                  <ul className="space-y-2 text-slate-600">
                    <li>🎯 <strong>Fidelización:</strong> Acumulaste <strong>{bookingSuccessData.pointsEarned} puntos</strong> (1 punto por cada $1000 ARS) canjeables en tu próximo viaje.</li>
                    <li>🎁 <strong>Nivel:</strong> Ascendiste automáticamente al nivel <strong>Viajero Explorador</strong> con prioridad de Late Check-Out.</li>
                    <li>📨 <strong>Notificación:</strong> Se envió un voucher PDF a <strong>{bookingSuccessData.guestEmail}</strong> y se habilitó tu asistente WhatsApp Santi.</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => {
                      setBookingStep(1);
                      setGuestName("");
                      setGuestEmail("");
                      setGuestPhone("");
                      setBookingSuccessData(null);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    Nueva Reserva
                  </button>
                  <button 
                    onClick={() => setActiveTab("chatbot")}
                    className="bg-[#5C946E] hover:bg-[#467354] text-white py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Hablar con Santi IA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: WHATSAPP CHATBOT SIMULATOR ==================== */}
        {activeTab === "chatbot" && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-serif font-black text-[#0F4C81]">Simulador de Chatbot WhatsApp</h3>
              <p className="text-slate-500 text-sm">
                Interactuá en tiempo real con <strong>Santi</strong>, el asistente conversacional con Inteligencia Artificial. Santi responde con voseo argentino y modismos mendocinos, usando los datos reales del complejo.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Config Panel */}
              <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-lg space-y-4">
                <h4 className="font-serif font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Configurar Perfil de Huésped</h4>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Nombre Simulador</label>
                    <input 
                      type="text" 
                      value={simulatedUserName} 
                      onChange={(e) => setSimulatedUserName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Teléfono / WhatsApp</label>
                    <input 
                      type="text" 
                      value={simulatedUserPhone} 
                      onChange={(e) => setSimulatedUserPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-sky-50 text-sky-800 p-4 rounded-xl border border-sky-100 text-[11px] leading-relaxed space-y-2">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Directiva de la IA:
                  </p>
                  <p className="text-slate-600">
                    Santi está programado con el SDK oficial <code>@google/genai</code> y el modelo <code>gemini-3.5-flash</code> para consultar disponibilidad, detallar tarifas y sugerir itinerarios de turismo aventura en San Rafael.
                  </p>
                </div>
              </div>

              {/* Right WhatsApp Simulator Interface */}
              <div className="lg:col-span-8 bg-[#ECE5DD] rounded-3xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col h-[520px]">
                {/* WhatsApp Chat Header */}
                <div className="bg-[#075E54] text-white p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#128C7E] rounded-full flex items-center justify-center font-bold text-sm text-white shadow-inner">
                      S
                    </div>
                    <div>
                      <h4 className="font-bold text-sm flex items-center gap-1.5">
                        Santi · Cabañas San Rafael 
                        <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block animate-pulse"></span>
                      </h4>
                      <p className="text-[10px] text-teal-100">Conserje Virtual IA • En Línea</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-white/80">
                    <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
                    <Info className="w-4 h-4 cursor-pointer hover:text-white" />
                  </div>
                </div>

                {/* WhatsApp Messages Canvas */}
                <div className="flex-grow p-4 overflow-y-auto space-y-3 flex flex-col scrollbar-thin">
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i}
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm flex flex-col space-y-1 ${
                        msg.role === "user"
                          ? "bg-[#DCF8C6] self-end rounded-tr-none text-slate-800"
                          : "bg-white self-start rounded-tl-none text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                      <span className="text-[9px] text-slate-400 self-end font-mono">{msg.timestamp}</span>
                    </div>
                  ))}

                  {sendingMessage && (
                    <div className="bg-white self-start max-w-[80%] p-3 rounded-2xl rounded-tl-none shadow-sm text-xs text-slate-400 flex items-center gap-2">
                      <div className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span>Santi está escribiendo...</span>
                    </div>
                  )}
                </div>

                {/* WhatsApp Message Input Area */}
                <form onSubmit={handleSendMessage} className="bg-[#F0F0F0] p-3 flex gap-2 border-t border-slate-200">
                  <input 
                    type="text"
                    placeholder="Escribile a Santi... (ej. ¿Qué cabañas tenés? ¿Tienen piscina?)"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={sendingMessage}
                    className="flex-grow p-3 rounded-full bg-white border border-slate-200 focus:outline-none text-xs text-slate-800 font-medium"
                  />
                  <button 
                    type="submit"
                    disabled={sendingMessage || !inputText.trim()}
                    className="w-11 h-11 bg-[#128C7E] hover:bg-[#075E54] disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: ADMIN PANEL ==================== */}
        {activeTab === "admin" && (
          <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-3xl font-serif font-black text-[#0F4C81]">Panel de Control Administrativo</h3>
                <p className="text-slate-500 text-sm">Monitoreo de ocupación de las cabañas, ingresos acumulados, base de huéspedes y conversaciones de la IA.</p>
              </div>
              <button 
                onClick={loadAdminData}
                disabled={loadingAdmin}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                🔄 Actualizar Datos
              </button>
            </div>

            {loadingAdmin ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0F4C81] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-semibold text-sm">Cargando base de datos en tiempo real...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* KPIs Dashboard Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Porcentaje de Ocupación", value: `${kpis.occupancyRate}%`, icon: Users, color: "text-[#4EA8DE] bg-[#4EA8DE]/10" },
                    { label: "Facturación Total (ARS)", value: `$${kpis.totalRevenue.toLocaleString("es-AR")}`, icon: DollarSign, color: "text-[#5C946E] bg-[#5C946E]/10" },
                    { label: "Huéspedes Activos", value: `${kpis.activeGuests} personas`, icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
                    { label: "Reservas Pendientes", value: `${kpis.pendingBookings} registros`, icon: Clock, color: "text-[#0F4C81] bg-[#0F4C81]/5" }
                  ].map((stat, idx) => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={idx} className="bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-lg flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{stat.label}</span>
                          <span className="text-2xl font-black text-slate-800">{stat.value}</span>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                          <StatIcon className="w-6 h-6" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Main section: Bookings Table & Live Chat logs */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Bookings table */}
                  <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-lg space-y-4">
                    <h4 className="font-serif font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-1.5">
                      <span>🏨</span> Registro de Reservas Recientes
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold">
                            <th className="pb-2">ID</th>
                            <th className="pb-2">Huésped</th>
                            <th className="pb-2">Cabaña</th>
                            <th className="pb-2">Noches</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                          {bookingsList.map((booking) => (
                            <tr key={booking.id} className="hover:bg-[#FDFBF7]/50">
                              <td className="py-2.5 font-mono text-[#0F4C81] font-bold">{booking.id}</td>
                              <td className="py-2.5">
                                <span className="block font-bold text-slate-800">{booking.guestName}</span>
                                <span className="block text-[10px] text-slate-400">{booking.guestPhone}</span>
                              </td>
                              <td className="py-2.5">{booking.cabinName}</td>
                              <td className="py-2.5">{booking.nights} noches</td>
                              <td className="py-2.5 text-right font-bold text-slate-800">${booking.totalAmount.toLocaleString("es-AR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Live Chat logs */}
                  <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-lg space-y-4">
                    <h4 className="font-serif font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                      Historial del Chatbot WhatsApp
                    </h4>

                    <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                      {chatLogs.map((log) => (
                        <div key={log.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-[10px] border-b border-slate-200/50 pb-1.5">
                            <span className="font-bold text-[#0F4C81]">{log.userName} ({log.userPhone})</span>
                            <span className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                          <div className="space-y-1 leading-relaxed">
                            <p className="text-slate-500"><strong className="text-slate-600">Mensaje:</strong> "{log.message}"</p>
                            <p className="text-[#5C946E] bg-[#5C946E]/5 p-2 rounded-lg mt-1 border border-[#5C946E]/10"><strong className="text-[#467354]">Santi IA:</strong> {log.response}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: CODE & BOILERPLATES ==================== */}
        {activeTab === "code" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-3xl font-serif font-black text-[#0F4C81]">Código Inicial Generado (Boilerplates)</h3>
              <p className="text-slate-500 text-sm">
                Explorá los 8 módulos de código listos para producción solicitados en la propuesta de arquitectura (Sección VI). Podés verlos e incorporarlos a tu estructura.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Selector List */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-[#F5F0E1] shadow-lg overflow-hidden divide-y divide-slate-100">
                {boilerplateFiles.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCodeIndex(idx)}
                    className={`w-full text-left p-4 transition-all flex flex-col space-y-1.5 cursor-pointer ${
                      selectedCodeIndex === idx 
                        ? "bg-[#0F4C81]/5 border-l-4 border-l-[#0F4C81]" 
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-800 font-serif">{file.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium block">{file.filename} ({file.language})</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{file.description}</span>
                  </button>
                ))}
              </div>

              {/* Right Code Display Viewer */}
              <div className="lg:col-span-8 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
                {/* Code Header */}
                <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-mono text-slate-400 ml-2">{boilerplateFiles[selectedCodeIndex].filename}</span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(boilerplateFiles[selectedCodeIndex].code, selectedCodeIndex)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all border border-slate-700"
                  >
                    {copiedIndex === selectedCodeIndex ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5" /> Copiar Código
                      </>
                    )}
                  </button>
                </div>

                {/* Description bar */}
                <div className="bg-slate-850 p-3.5 text-slate-300 text-[11px] leading-relaxed border-b border-slate-800 font-medium">
                  💡 <strong>Propósito:</strong> {boilerplateFiles[selectedCodeIndex].description}
                </div>

                {/* Code area */}
                <pre className="p-6 overflow-auto text-xs font-mono text-slate-100 max-h-[460px] leading-relaxed select-all">
                  <code>{boilerplateFiles[selectedCodeIndex].code}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: ROADMAP & SEO ==================== */}
        {activeTab === "roadmap" && (
          <div className="space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h3 className="text-3xl font-serif font-black text-[#0F4C81]">Estrategia SEO & Roadmap</h3>
              <p className="text-slate-500 text-sm">Cronograma detallado de fases del complejo turístico e implementación de posicionamiento orgánico en Google.</p>
            </div>

            {/* Visual Roadmap Cards */}
            <div className="space-y-6">
              <h4 className="text-xl font-serif font-bold text-[#0F4C81] border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>🗺️</span> Roadmap del Proyecto (Fases 1 a 4)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    title: "FASE 1: MVP Estable (Semana 1-8)",
                    badge: "En progreso",
                    badgeColor: "bg-amber-100 text-amber-800",
                    points: ["Sitio web adaptativo en Next.js", "Motor de reservas con calendario", "Pasarela Mercado Pago integrada", "Panel de administración básico"]
                  },
                  {
                    title: "FASE 2: Automatización (Semana 9-16)",
                    badge: "Pendiente",
                    badgeColor: "bg-slate-100 text-slate-800",
                    points: ["App móvil para huéspedes", "Chatbot de WhatsApp en producción", "Notificaciones de confirmación", "Registro (Check-In) digital"]
                  },
                  {
                    title: "FASE 3: Inteligencia (Semana 17-24)",
                    badge: "Planificado",
                    badgeColor: "bg-slate-100 text-slate-800",
                    points: ["Blog SEO local activo", "Sugerencias con guías de IA", "Módulo de fidelización con niveles", "Marketing automático por mail"]
                  },
                  {
                    title: "FASE 4: Escala (Continuo)",
                    badge: "Visión",
                    badgeColor: "bg-slate-100 text-slate-800",
                    points: ["Apertura domótica de portón", "Llave digital NFC", "Reserva directa de excursiones", "SaaS para otros complejos"]
                  }
                ].map((phase, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-[#F5F0E1] shadow-lg space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paso 0{i+1}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${phase.badgeColor}`}>{phase.badge}</span>
                      </div>
                      <h5 className="font-bold text-xs text-[#0F4C81] font-serif leading-snug">{phase.title}</h5>
                      <ul className="space-y-1 text-[10px] text-slate-500 list-disc list-inside">
                        {phase.points.map((p, idx) => <li key={idx}>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEO Strategy Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Keywords and URLs */}
              <div className="bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-lg space-y-4">
                <h5 className="font-serif font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-1.5">
                  🎯 SEO Local - Palabras Clave Estratégicas
                </h5>
                <p className="text-slate-500 text-xs">
                  Para dominar las búsquedas en Google y eliminar dependencia de Airbnb, priorizamos la indexación de las siguientes keywords en San Rafael, Mendoza:
                </p>

                <div className="space-y-2 text-xs">
                  {[
                    { keyword: "cabañas san rafael mendoza", volume: "Alta competitividad local", url: "/cabanas-san-rafael" },
                    { keyword: "alquiler cabaña atuel mendoza", volume: "Competitividad media-alta", url: "/cabanas/atuel" },
                    { keyword: "complejo turistico san rafael", volume: "Búsqueda institucional", url: "/" },
                    { keyword: "cabañas valle grande mendoza", volume: "Ubicación específica río", url: "/cabanas/vallegrande" },
                  ].map((kw, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-slate-700 block">"{kw.keyword}"</span>
                        <span className="text-[10px] text-slate-400">Ruta semántica sugerida: <code>{kw.url}</code></span>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">{kw.volume}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Audit check */}
              <div className="bg-white p-6 rounded-2xl border border-[#F5F0E1] shadow-lg space-y-4">
                <h5 className="font-serif font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-1.5">
                  🛡️ Auditoría Core Web Vitals & Schema
                </h5>
                
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Marcado de Datos Estructurados (Schema.org):</strong>
                      <p className="text-[11px] text-slate-500">Inyección de JSON-LD tipo <code>LodgingBusiness</code> y <code>HotelRoom</code> para cada cabaña para habilitar Rich Snippets en Google Search.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Carga Diferida e Imágenes WebP:</strong>
                      <p className="text-[11px] text-slate-500">Optimización de galería de fotos de las cabañas con compresión adaptativa, reduciendo la latencia de respuesta para móviles a menos de 1.2 segundos.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Generación Estática de Sitios (SSG con ISR):</strong>
                      <p className="text-[11px] text-slate-500">Renderizado inicial rápido desde Next.js App Router, actualizando el catálogo cada hora en segundo plano para reflejar cambios de tarifas.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 mt-12 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#4EA8DE]" />
                <span className="font-serif font-black text-lg">Cabañas San Rafael</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Desarrollo de plataforma digital integral para la hospitalidad de montaña en Mendoza, Argentina. Incrementando canales de venta directa y automatizando flujos con IA.
              </p>
            </div>
            
            <div className="space-y-3">
              <h5 className="font-serif font-bold text-sm">Contacto & Ubicación</h5>
              <p className="text-slate-400 text-xs">
                📍 Ruta Provincial 173, Km 18, Valle Grande, San Rafael, Mendoza, Argentina.<br />
                📞 +54 9 261 555-1234<br />
                📨 reservas@cabanas-sanrafael.com
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="font-serif font-bold text-sm">Destinos Recomendados</h5>
              <p className="text-slate-400 text-xs leading-relaxed">
                Cañón del Atuel • Valle Grande • Dique Los Reyunos • Dique El Nihuil • Bodegas Boutique de San Rafael • Turismo Aventura de Montaña.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-6 text-center text-slate-500 text-[11px]">
            <p>© 2026 Cabañas San Rafael. Todos los derechos reservados. Desarrollado con Inteligencia Artificial con soporte completo de pasarela de pagos.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
