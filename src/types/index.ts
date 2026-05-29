export type UserRole = 'ADMINISTRADOR' | 'OPERADOR' | 'AUDITOR';
export type ModuleId = 'resumen' | 'inventario' | 'entregas' | 'qr' | 'reportes' | 'auditoria' | 'usuarios';

export interface AuthResponse {
  token: string;
  username: string;
  fullName: string;
  role: UserRole;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface SizeStock {
  id: number;
  talla: string;
  stock: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  type: string;
  talla?: string;
  color?: string;
  photoUrl?: string;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  active: boolean;
  category: Category;
  sizeStocks: SizeStock[];
}

export interface SizeStockPayload {
  talla: string;
  stock: number;
}

export interface ProductPayload {
  sku: string;
  name: string;
  type: string;
  color?: string;
  photoUrl?: string;
  stockMinimo: number;
  stockMaximo: number;
  sizeStocks: SizeStockPayload[];
  categoryName: string;
  categoryDescription?: string;
}

export interface InventoryMovement {
  id: number;
  quantity: number;
  movementType: 'INBOUND' | 'OUTBOUND' | 'RETURN_ADJUSTMENT' | 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  reason: string;
  referenceId?: string;
  createdBy: string;
  createdAt: string;
  product: Product;
}

export interface StockAlert {
  id: number;
  message: string;
  resolved: boolean;
  createdAt: string;
  product: Product;
}

export interface ReturnTicket {
  id: number;
  employee: { id: number; username: string; fullName: string };
  product: Product;
  quantity: number;
  reason: string;
  status: 'OPEN' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  reintegratedToInventory: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface DeliveryResultResponse {
  deliveryId: number;
  actaId: number;
  actaNumber: string;
  employeeEmail?: string;
}

export interface QrTokenResponse {
  token: string;
  expiresAt: string;
}

export interface DashboardDemandResponse {
  topProducts: Array<{ productName: string; quantity: number }>;
  movementsCurrentMonth: number;
}

export interface AuditLog {
  id: number;
  actorUsername: string;
  action: string;
  entityName: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface AppUser {
  id: number;
  username: string;
  document?: string;
  fullName: string;
  role: UserRole;
  active?: boolean;
}

export interface UpdateUserPayload {
  document: string;
  fullName: string;
  password?: string;
  role: UserRole;
}

export interface ProductFormState {
  sku: string;
  name: string;
  type: string;
  talla: string;
  color: string;
  stock: string;
  stockMinimo: string;
  stockMaximo: string;
  categoryName: string;
  categoryDescription: string;
}

export interface MovementFormState {
  productId: string;
  quantity: string;
  reason: string;
  referenceId: string;
}

export interface DeliveryItemState {
  productId: string;
  quantity: string;
}

export interface MovementPayload {
  productId: number;
  quantity: number;
  reason: string;
  referenceId?: string;
}

export interface ReturnFormState {
  employeeId: string;
  productId: string;
  quantity: string;
  reason: string;
}

export interface UserProfile {
  id: string;
  usuarioId: string;
  nombreCompleto: string;
  apodo?: string;
  fotoAvatar?: string;
  fotoPortada?: string;
  puestoTrabajo?: string;
  biografia?: string;
  estadoActual: 'DISPONIBLE' | 'EN_RUTA' | 'ALMUERZO' | 'AUSENTE';
  creadoEn: string;
  actualizadoEn: string;
  usuario?: {
    correo: string;
    rol: UserRole;
    sedeId: string | null;
  };
}

export interface UpdatePerfilPayload {
  nombreCompleto?: string;
  apodo?: string;
  puestoTrabajo?: string;
  biografia?: string;
}

export interface Receptor {
  id: string;
  documentoIdentidad: string;
  nombreCompleto: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}

export interface EntregaItem {
  productoId: string | number;
  cantidad: number;
}

export interface Entrega {
  id: string;
  idUnicoRastreo: string;
  estado: string;
  sedeId: string;
  receptorId: string;
  operadorId: string;
  tipoEvidencia: string;
  urlEvidencia?: string;
  urlActaPdf?: string;
  inventarioItems: EntregaItem[];
  creadoEn: string;
  actualizadoEn: string;
  receptor?: Receptor;
  operador?: {
    correo: string;
    perfil?: {
      nombreCompleto: string;
    };
  };
}
