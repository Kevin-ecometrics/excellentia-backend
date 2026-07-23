export interface User {
  id: number;
  email: string;
  name: string | null;
  password: string;
  refresh_token: string | null;
  refresh_token_expires_at: number | null;
  role: 'admin' | 'operator';
  qb_class_id: string | null;
  created_at: Date;
}

export interface Product {
  id: number;
  barcode: string | null;
  name: string;
  price: number;
  min_price: number | null;
  category: string | null;
  brand: string | null;
  stock: number;
  hidden: number;
  description: string | null;
  unit: string | null;
  qty: number;
  weight_per_unit: number | null;
  qb_item_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ScanEntry {
  id: number;
  barcode: string;
  product_id: number | null;
  device_id: number | null;
  scanned_by: number | null;
  created_at: Date;
}

export interface Order {
  id: number;
  barcode: string;
  product_name: string;
  price: number;
  quantity: number;
  total: number;
  batch_id: string | null;
  device_id: number | null;
  user_id: number | null;
  customer_id: string | null;
  customer_name: string | null;
  qb_invoice_id: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  error_log: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: number;
  name: string | null;
  model: string | null;
  serial_number: string | null;
  last_connection: Date | null;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  created_at: Date;
}

export interface SyncLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  qb_status: 'SUCCESS' | 'FAILED';
  qb_id: string | null;
  error: string | null;
  created_at: Date;
}

export interface SyncMeta {
  id: number;
  entity: string;
  last_sync_at: string;
  created_at: Date;
  updated_at: Date;
}

export class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
