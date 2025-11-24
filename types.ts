
export enum UserRole {
  ADMIN = '管理员',
  STAFF = '员工',
}

export enum ParcelStatus {
  RECEIVED = '已揽收',
  BAGGED = '已打包',
  SHIPPED = '已发货',
  CUSTOMS = '清关中',
  ARRIVED = '已到达',
  DELIVERED = '已派送',
}

export enum BagStatus {
  OPEN = '进行中',
  CLOSED = '已封包',
  SHIPPED = '已发货', // Included in a shipped container
  LOADED = '已装柜', // Assigned to a container (Planning or Shipped)
}

export type ContainerStatus = 'PLANNING' | 'ORIGIN_PORT' | 'IN_TRANSIT' | 'DESTINATION_PORT' | 'UNLOADED';

export interface SalesRepresentative {
  id: string;
  name: string;
  prefix: string; // e.g., 'YAL'
}

export interface Staff {
  id: string;
  name: string;
  role: UserRole;
  prefixCode: string;
}

export interface Customer {
  id: string; // Generated: Prefix (YAK/YAL...) + Sequence
  name: string;
  phone: string;
  email?: string;
  salesRepId: string; // Link to SalesRepresentative.id
  address?: string;
  totalParcels: number;
}

export interface Parcel {
  id: string; // Tracking Number is now ID
  trackingNumber: string;
  customerId: string;
  description: string;
  pieces: number; // New field
  weight: number; // kg
  volume?: number; // cbm (Optional for courier)
  status: ParcelStatus;
  bagId?: string;
  intakeDate: string;
  notes?: string;
  images: string[];
}

export interface Bag {
  id: string;
  bagNumber: string;
  status: BagStatus;
  bagSize: 'LARGE' | 'SMALL'; // New field
  volume: number; // 0.5 or 0.2
  weight: number;
  parcelCount: number;
  destination: string;
  createdDate: string;
  containerId?: string;
}

export interface Cargo {
  id: string; // Entry No / Reference is now ID
  trackingNumber: string; 
  customerId: string;
  commodity: string;
  pieces: number; // New field (mapped from quantity or specific pieces field)
  quantity: number; // Keeping for compatibility, but 'pieces' is the UI label
  volume: number; // CBM
  weight: number; // KG
  marking: string;
  status: 'RECEIVED' | 'LOADED' | 'SHIPPED' | 'ARRIVED';
  containerId?: string;
  intakeDate: string;
  notes?: string;
  images: string[];
}

export interface ManifestItem {
  type: 'BAG' | 'CARGO';
  id: string;
}

export interface Container {
  id: string;
  sequenceNumber: string; // Auto-generated sequence (e.g., 001)
  containerNumber?: string; // Optional
  shippingCompany?: string; // Optional
  sealNumber?: string; // Optional
  vesselName?: string; // Optional
  loadingDate?: string; // New: Date when loading started
  etd?: string; // Optional
  eta?: string; // Optional
  arrivalDate?: string; 
  status: ContainerStatus;
  manifest: ManifestItem[]; // Ordered list of items
  createdDate: string;
  totalVolume?: number; 
}

export interface Shipment {
  id: string;
  trackingCode: string;
  bagIds: string[];
  status: 'IN_TRANSIT' | 'COMPLETED';
  departureDate: string;
}
