import type { InventoryMovement, AuthResponse } from '../types';
import { authFetch } from './api';

export const fetchInventoryMovements = (
  session: AuthResponse | null,
  onLogout: () => void
) =>
  authFetch<InventoryMovement[]>('/api/v1/inventario/movimientos', session, onLogout);
