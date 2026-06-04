import type { AuthResponse } from '../types';
import { authFetch } from './api';

export const fetchInventoryMovements = async (
  session: AuthResponse | null,
  onLogout: () => void
) => {
  const response: any = await authFetch('/api/v1/inventario/movimientos', session, onLogout);
  return Array.isArray(response) ? response : (response.data || []);
};
