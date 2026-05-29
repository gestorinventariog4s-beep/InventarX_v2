// --- AUDITORÍA ---
import type { AuditLog } from '../types';

// Carga logs de auditoría entre dos fechas (ISO string)
export const fetchAuditLogs = (
  from: string,
  to: string,
  session: AuthResponse | null,
  onLogout: () => void
) =>
  authFetch<AuditLog[]>(`/api/audit/logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, session, onLogout);
import type { AppUser, AuthResponse, DeliveryResultResponse, Product, ProductPayload, StockAlert, UpdateUserPayload, UserRole } from '../types';

const STORAGE_KEY = 'gestion-dotacion-auth';
const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SIZE_STOCK_CACHE_KEY = 'gestion-dotacion-size-stocks-cache';

type CachedSizeStock = { talla: string; stock: number };
type CachedSizeStockStore = Record<string, CachedSizeStock[]>;

const normalizeSizeLabel = (size: string) => {
  const normalized = (size || '').trim().toUpperCase();
  if (normalized === 'METRO') return 'M';
  if (normalized === 'SG') return 'XL';
  return normalized;
};

const normalizeSizeStocks = (sizeStocks: Array<{ talla: string; stock: number }>) => {
  const grouped = new Map<string, number>();
  sizeStocks.forEach((item) => {
    const talla = normalizeSizeLabel(item.talla);
    grouped.set(talla, (grouped.get(talla) ?? 0) + (item.stock ?? 0));
  });
  return Array.from(grouped.entries()).map(([talla, stock]) => ({ talla, stock }));
};

const buildInventoryPayload = (payload: ProductPayload) => {
  const totalStock = (payload.sizeStocks ?? []).reduce((sum, item) => sum + (item.stock ?? 0), 0);
  const talla = (payload.sizeStocks ?? []).map((item) => item.talla).join(', ');

  // Keep backward compatibility with older backend DTOs that still require stock/talla.
  return {
    ...payload,
    stock: totalStock,
    talla,
  };
};

const readSizeStockCache = (): CachedSizeStockStore => {
  try {
    const raw = localStorage.getItem(SIZE_STOCK_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CachedSizeStockStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeSizeStockCache = (store: CachedSizeStockStore) => {
  try {
    localStorage.setItem(SIZE_STOCK_CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota/security errors.
  }
};

const cacheSizeStocks = (productId: number | undefined, sku: string | undefined, sizeStocks: CachedSizeStock[]) => {
  if (!sizeStocks?.length) return;
  const normalized = normalizeSizeStocks(sizeStocks);
  const store = readSizeStockCache();
  if (productId != null) store[`id:${productId}`] = normalized;
  if (sku) store[`sku:${sku}`] = normalized;
  writeSizeStockCache(store);
};

const getCachedSizeStocks = (product: Product): CachedSizeStock[] => {
  const store = readSizeStockCache();
  const byId = product.id != null ? store[`id:${product.id}`] : undefined;
  if (byId?.length) return byId;
  const bySku = product.sku ? store[`sku:${product.sku}`] : undefined;
  return bySku?.length ? bySku : [];
};

const parseLegacySizeStocks = (product: Product) => {
  const rawTallas = (product.talla ?? '')
    .split(',')
    .map((item) => normalizeSizeLabel(item.trim()))
    .filter(Boolean);

  if (rawTallas.length === 0) return [];

  const uniqueTallas = Array.from(new Set(rawTallas));

  // Legacy APIs may not provide stock by size. Preserve sizes but do not invent quantities.
  return uniqueTallas.map((talla, idx) => ({
    id: -(product.id * 100 + idx + 1),
    talla,
    stock: 0,
  }));
};

const normalizeProduct = (product: Product): Product => {
  const current = Array.isArray(product.sizeStocks) ? product.sizeStocks : [];
  if (current.length > 0) {
    const normalized = normalizeSizeStocks(current.map((s) => ({ talla: s.talla, stock: s.stock })));
    cacheSizeStocks(product.id, product.sku, normalized);
    return {
      ...product,
      sizeStocks: normalized.map((s, idx) => ({
        id: current[idx]?.id ?? -(product.id * 100 + idx + 1),
        talla: s.talla,
        stock: s.stock,
      })),
    };
  }

  const cached = getCachedSizeStocks(product);
  if (cached.length > 0) {
    const normalizedCached = normalizeSizeStocks(cached);
    return {
      ...product,
      sizeStocks: normalizedCached.map((s, idx) => ({
        id: -(product.id * 100 + idx + 1),
        talla: s.talla,
        stock: s.stock,
      })),
    };
  }

  return {
    ...product,
    sizeStocks: parseLegacySizeStocks(product),
  };
};

const normalizeProducts = (products: Product[]) => products.map(normalizeProduct);
const onlyActiveProducts = (products: Product[]) => products.filter((p) => p.active !== false);

export const readSession = (): AuthResponse | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    if (parsed.token && parsed.username && parsed.role) return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

export const parseApiError = (errorPayload: unknown, fallback: string): string => {
  if (!errorPayload || typeof errorPayload !== 'object') return fallback;
  const message = (errorPayload as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

export const authFetch = async <T>(path: string, session: AuthResponse | null, onLogout: () => void, options?: globalThis.RequestInit): Promise<T> => {
  if (!session) throw new Error('Sesión no disponible.');

  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${session.token}`);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    onLogout();
    throw new Error('Sesión expirada o no autorizada. Ingresa nuevamente.');
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo completar la solicitud.'));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const downloadFile = async (path: string, filename: string, session: AuthResponse | null) => {
  if (!session) return;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!response.ok) throw new Error('No se pudo descargar el archivo.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

// Login estándar con usuario y contraseña
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    if (response.status === 401) throw new Error('Usuario o clave incorrecta.');
    throw new Error(parseApiError(payload, 'No se pudo iniciar sesión.'));
  }

  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

// WebAuthn Biometric Login Endpoints
export const getLoginChallenge = async (email: string) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/biometric/login-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo iniciar biometría.'));
  }
  return response.json();
};

export const verifyLoginChallenge = async (email: string, credential: any): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/biometric/login-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, credential }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'Verificación biométrica fallida.'));
  }
  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

export const publicFetch = async <T>(path: string, options?: globalThis.RequestInit): Promise<T> => {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo completar la solicitud.'));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const fetchPublicProducts = async () => {
  const products = await publicFetch<Product[]>('/api/v1/public/products');
  return onlyActiveProducts(normalizeProducts(products));
};

export const fetchInventoryProducts = async (session: AuthResponse | null, onLogout: () => void) => {
  const products = await authFetch<Product[]>('/api/v1/inventory/products', session, onLogout);
  return onlyActiveProducts(normalizeProducts(products));
};

export const fetchInventoryAlerts = (session: AuthResponse | null, onLogout: () => void) =>
  authFetch<StockAlert[]>('/api/v1/inventory/alerts', session, onLogout);

export const createInventoryProduct = async (
  payload: ProductPayload,
  session: AuthResponse | null,
  onLogout: () => void,
) => {
  const product = await authFetch<Product>('/api/v1/inventory/products', session, onLogout, {
    method: 'POST',
    body: JSON.stringify(buildInventoryPayload(payload)),
  });
  cacheSizeStocks(product.id, product.sku ?? payload.sku, payload.sizeStocks);
  return normalizeProduct(product);
};

export const updateInventoryProduct = async (
  id: number,
  payload: ProductPayload,
  session: AuthResponse | null,
  onLogout: () => void,
) => {
  const product = await authFetch<Product>(`/api/inventory/products/${id}`, session, onLogout, {
    method: 'PUT',
    body: JSON.stringify(buildInventoryPayload(payload)),
  });
  cacheSizeStocks(product.id ?? id, product.sku ?? payload.sku, payload.sizeStocks);
  return normalizeProduct(product);
};

export const deleteInventoryProduct = (
  id: number,
  mode: 'soft' | 'hard',
  session: AuthResponse | null,
  onLogout: () => void,
) =>
  authFetch<void>(`/api/inventory/products/${id}?mode=${mode}`, session, onLogout, {
    method: 'DELETE',
  });

export const confirmPublicQrDelivery = (payload: {
  qrToken: string;
  employeeFullName: string;
  employeeDocument: string;
  employeeEmail: string;
  employeeCargo: string;
  notes: string;
  items: Array<{ productId: number; quantity: number }>;
  signatureDataUrl: string;
  evidencePhotos?: string[];
  giverSignatureDataUrl?: string;
  giverFullName?: string;
}) => publicFetch<DeliveryResultResponse>('/api/v1/public/deliveries/confirm', {
  method: 'POST',
  body: JSON.stringify(payload),
});

// Delivery Session Endpoints
export interface DeliverySession {
  id: number;
  employeeDocument: string;
  status: 'CREATED' | 'EVIDENCE_READY' | 'SIGNED' | 'COMPLETED' | 'ABANDONED';
  itemsJson: string;
  photosJson: string;
  giverSignature: string;
  receiverSignature: string;
  giverFullName: string;
}

export const startDeliverySession = (document: string) => 
  publicFetch<DeliverySession>('/api/v1/public/delivery-sessions/start', {
    method: 'POST',
    body: JSON.stringify({ employeeDocument: document })
  });

export const getActiveDeliverySession = (document: string) => 
  publicFetch<DeliverySession>(`/api/public/delivery-sessions/active/${document}`);

export const updateSessionItems = (id: number, itemsJson: string) => 
  publicFetch<DeliverySession>(`/api/public/delivery-sessions/${id}/items`, {
    method: 'PATCH',
    body: JSON.stringify({ itemsJson })
  });

export const updateSessionEvidence = (id: number, data: { itemsJson: string, photosJson: string, giverSignature: string, giverFullName: string }) => 
  publicFetch<DeliverySession>(`/api/public/delivery-sessions/${id}/evidence`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });

export const employeeSignSession = (id: number, signature: string) => 
  publicFetch<DeliverySession>(`/api/public/delivery-sessions/${id}/sign`, {
    method: 'PATCH',
    body: JSON.stringify({ signature })
  });

export const completeDeliverySession = (id: number) => 
  publicFetch<DeliverySession>(`/api/public/delivery-sessions/${id}/complete`, {
    method: 'POST'
  });

export const getActaData = (actaId: number, token: string) => 
  publicFetch<any>(`/api/public/acta/${actaId}?token=${token}`);

export const downloadPublicActa = async (actaId: number, qrToken: string) => {
  const response = await fetch(`${API_BASE}/api/public/acta/${actaId}/pdf?token=${encodeURIComponent(qrToken)}`);
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo descargar el acta.'));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `acta-${actaId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const getEmployee = (document: string) => 
  publicFetch<EmployeeProfile>(`/api/public/employees/${document}`);

export const saveEmployee = (profile: EmployeeProfile) => 
  publicFetch<EmployeeProfile>('/api/v1/public/employees', {
    method: 'POST',
    body: JSON.stringify(profile),
  });

export const getPendingDelivery = (document: string) => 
  publicFetch<any>(`/api/public/employees/${document}/pending`);

export const savePendingDelivery = (document: string, items: Array<{ productId: number; quantity: number; talla: string }>) => 
  publicFetch<any>(`/api/public/employees/${document}/pending`, {
    method: 'POST',
    body: JSON.stringify(items),
  });

export const products = () =>
  publicFetch<any[]>('/api/v1/public/products');

export const createPendingDelivery = (payload: { employeeDocument: string; items: Array<{ productId: number; quantity: number }> }, session: AuthResponse | null, onLogout: () => void) => 
  authFetch<any>('/api/v1/deliveries/pending', session, onLogout, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const resendDeliveryEmail = (document: string, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<void>(`/api/deliveries/resend-email/${document}`, session, onLogout, {
    method: 'POST',
  });

export const listUsers = (session: AuthResponse | null, onLogout: () => void) =>
  authFetch<AppUser[]>('/api/v1/admin/users', session, onLogout);

export const registerUser = (
  payload: { document: string; fullName: string; password: string; role: UserRole },
  session: AuthResponse | null,
  onLogout: () => void,
) =>
  authFetch<{ id: number; username: string; document: string; fullName: string; role: UserRole }>('/api/v1/auth/register', session, onLogout, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateUser = (
  id: number,
  payload: UpdateUserPayload,
  session: AuthResponse | null,
  onLogout: () => void,
) =>
  authFetch<AppUser>(`/api/admin/users/${id}`, session, onLogout, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const suspendUser = (id: number, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<AppUser>(`/api/admin/users/${id}/suspend`, session, onLogout, {
    method: 'PATCH',
  });

export const deleteUser = (id: number, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<void>(`/api/admin/users/${id}`, session, onLogout, {
    method: 'DELETE',
  });

export interface EmployeeProfile {
  fullName: string;
  document: string;
  email: string;
  cargo: string;
}

export const getPendingEmployees = (session: AuthResponse | null, onLogout: () => void) =>
  authFetch<any[]>('/api/v1/employee/pending', session, onLogout);

export const getAllEmployees = (session: AuthResponse | null, onLogout: () => void) =>
  authFetch<any[]>('/api/v1/employee/all', session, onLogout);

export const updateEmployeeState = (id: number, state: string, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<any>(`/api/employee/${id}/state?state=${state}`, session, onLogout, {
    method: 'PUT'
  });

export const registerEmployeeAdmin = (payload: any, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<any>('/api/v1/employee/register', session, onLogout, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
