/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cabin {
  id: string;
  name: string;
  description: string;
  capacity: number; // max guests
  priceBaja: number; // Low season price (ARS)
  priceMedia: number; // Mid season price (ARS)
  priceAlta: number; // High season price (ARS)
  services: string[];
  images: string[];
  area: number; // m²
  rooms: number;
  descriptionFull: string;
}

export interface Booking {
  id: string;
  cabinId: string;
  cabinName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  guestsCount: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  pointsEarned: number;
  createdAt: string;
  paymentUrl?: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ChatbotLog {
  id: string;
  userPhone: string;
  userName: string;
  message: string;
  response: string;
  timestamp: string;
}

export interface KPIs {
  occupancyRate: number;
  totalRevenue: number;
  activeGuests: number;
  pendingBookings: number;
}
