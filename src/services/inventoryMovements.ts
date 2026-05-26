import type { InventoryMovement, AuthResponse } from '../types';
import { authFetch } from './api';

export const fetchInventoryMovements = (
  session: AuthResponse | null,
  onLogout: () => void
) =>
  authFetch<InventoryMovement[]>('/api/inventory/movements', session, onLogout);
