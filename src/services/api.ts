import { UserRole, UserSession } from '../types';

// Keep JWT token strictly in JS memory (never in localStorage or sessionStorage)
let inMemoryAuthToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryAuthToken;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    auth?: boolean;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false && inMemoryAuthToken) {
    headers.Authorization = `Bearer ${inMemoryAuthToken}`;
  }

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { error: text || `Request failed (${res.status})` };
  }

  if (!res.ok) {
    const err = new Error(
      typeof data.error === 'string' ? data.error : `Request failed with status ${res.status}`,
    ) as ApiError;
    err.status = res.status;
    if (typeof data.code === 'string') {
      err.code = data.code;
    }
    throw err;
  }

  return data as T;
}

export interface BackendAuthUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  locality: string;
  address: string | null;
  tailorProfileId?: number | null;
}

export function mapAuthUserToSession(u: BackendAuthUser): UserSession {
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    locality: u.locality,
    address: u.address,
    tailorProfileId: u.tailorProfileId ?? null,
  };
}

export interface BootstrapStatusResponse {
  dbConfigured: boolean;
  dbConnected: boolean;
  hasAppOwner: boolean;
  requiresSetupCode: boolean;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: 'order' | 'payment' | 'system' | 'account';
  isRead: boolean;
  relatedOrderId: number | null;
  createdAt: string;
}

export const authApi = {
  bootstrapStatus: () =>
    apiRequest<BootstrapStatusResponse>('/api/auth/bootstrap-status', { auth: false }),

  bootstrapOwner: (payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    setupCode?: string;
  }) =>
    apiRequest<{ token: string; user: BackendAuthUser }>('/api/auth/bootstrap-owner', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  register: (payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role: 'customer' | 'tailor';
    locality: string;
    address?: string;
    shopName?: string;
    specialties?: string[];
    workingHours?: string;
    experienceYears?: number;
    homeVisitFee?: number;
  }) =>
    apiRequest<{ token: string; user: BackendAuthUser }>('/api/auth/register', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  login: (identifier: string, password: string) =>
    apiRequest<{ token: string; user: BackendAuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { identifier, password },
      auth: false,
    }),

  me: () => apiRequest<{ user: BackendAuthUser }>('/api/auth/me'),

  updateProfile: (payload: {
    fullName?: string;
    phone?: string;
    locality?: string;
    address?: string;
  }) =>
    apiRequest<{ user: BackendAuthUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: payload,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};

export const notificationApi = {
  list: () =>
    apiRequest<{ unreadCount: number; notifications: NotificationItem[] }>('/api/notifications'),
  markRead: (id: number) =>
    apiRequest<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiRequest<{ success: boolean }>('/api/notifications/read-all', { method: 'PATCH' }),
};

export interface PublicTailorItem {
  id: number;
  shopName: string;
  masterTailor: string;
  bio: string;
  locality: string;
  address: string;
  specialties: string[];
  workingHours: string;
  experienceYears: number;
  homeVisitFee: number;
  pickupAvailable: boolean;
  isAvailable: boolean;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  completedOrders: number;
  phone: string | null;
  services: {
    id: number;
    tailorId: number | null;
    title: string;
    category: string;
    description: string;
    basePrice: number;
    turnaroundDays: number;
  }[];
}

export const publicApi = {
  tailors: (q = '', locality = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (locality) params.set('locality', locality);
    return apiRequest<{ tailors: PublicTailorItem[] }>(
      `/api/public/tailors${params.toString() ? `?${params.toString()}` : ''}`,
      { auth: false },
    );
  },
  services: () =>
    apiRequest<{
      services: {
        id: number;
        tailorId: number | null;
        tailorShopName: string;
        title: string;
        category: string;
        description: string;
        basePrice: number;
        turnaroundDays: number;
      }[];
    }>('/api/public/services', { auth: false }),
};
