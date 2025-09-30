export type Role = "client" | "driver";

export interface UserProfile {
  uid: string;
  role: Role;
  name: string;
  phone?: string;
  email?: string;
  photoURL?: string;
  rating?: number;
}

export interface Vehicle {
  id: string;
  ownerUid: string;
  model: string;
  capacityKg: number;
  plate: string;
  color?: string;
  boxDims?: { length: number; width: number; height: number };
  photoURL?: string;
}

export interface MoveRequest {
  id: string;
  clientUid: string;
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  dateISO: string;
  needHelpers: boolean;
  items: Array<{ name: string; qty: number }>;
  status: "open" | "awarded" | "cancelled" | "completed";
  expiresAt?: number;
}

export interface Proposal {
  id: string;
  requestId: string;
  driverUid: string;
  vehicleId: string;
  totalValue: number;
  trips: number;
  hasHelpers: boolean;
  availableSlots: string[]; // "2025-09-01T10:00:00Z"
  createdAt: number;
}
