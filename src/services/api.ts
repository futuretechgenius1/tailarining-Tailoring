import {
  AlterationService,
  CategoryItem,
  CraftReelScene,
  DesignProduct,
  PlatformServiceItem,
  PromoOffer,
  ServiceLocality,
  StorefrontMediaMap,
  TailorPartner,
  TailorRatingBreakdown,
  TailorReviewItem,
  UserRole,
  UserSession,
} from '../types';

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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
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

  logout: () =>
    apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
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
  list: (page = 1, limit = 12) =>
    apiRequest<{
      unreadCount: number;
      notifications: NotificationItem[];
      pagination?: PaginationMeta;
    }>(`/api/notifications?page=${page}&limit=${limit}`),
  markRead: (id: number) =>
    apiRequest<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiRequest<{ success: boolean }>('/api/notifications/read-all', { method: 'PATCH' }),
};

export interface TailorPortfolioItem {
  id: number;
  title: string;
  category: 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear';
  caption: string;
  priceHint: number | null;
  turnaroundDays: number | null;
  mimeType?: string;
  isFeatured: boolean;
  isVisible?: boolean;
  imageUrl: string;
  createdAt?: string;
}

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
  logoUrl?: string | null;
  coverImageUrl?: string;
  distanceKm?: number;
  turnaroundText?: string;
  turnaroundDays?: number;
  startingPrice?: number;
  pickupSlots?: string[];
  recentReview?: {
    author: string;
    text: string;
    date: string;
  };
  services: {
    id: number;
    tailorId: number | null;
    title: string;
    category: string;
    description: string;
    basePrice: number;
    turnaroundDays: number;
  }[];
  portfolio: TailorPortfolioItem[];
}

export interface PublicTailorDetailItem extends PublicTailorItem {
  reviews: TailorReviewItem[];
  ratingBreakdown: TailorRatingBreakdown;
}

export interface PublicDesignItem {
  id: number;
  slug: string;
  tailorId: number | null;
  title: string;
  category: string;
  categoryId: string;
  gender: 'women' | 'men';
  boutique: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  views: number;
  turnaroundDays: number;
  trusted: boolean;
  rating: number;
  description: string;
  fabricNote: string;
  isTrending: boolean;
}

export interface PublicAlterationItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  unit: string;
  badge: string;
  badgeColor: string;
  section: 'garment' | 'saree';
  iconType: string;
}

export interface StorefrontBootstrapResponse {
  tailors: PublicTailorItem[];
  designs: PublicDesignItem[];
  alterations: PublicAlterationItem[];
  categories: CategoryItem[];
  promos: PromoOffer[];
  localities: ServiceLocality[];
  craftScenes: CraftReelScene[];
  platformServices: PlatformServiceItem[];
  media: StorefrontMediaMap;
  settings: {
    platformName: string;
    defaultHomeVisitFee: number;
    freeVisitMinOrder: number;
    maxServiceRadiusKm: number;
    requireQuoteApproval: boolean;
    supportEmail: string;
    supportPhone: string;
  };
}

const VALID_BADGE_COLORS: AlterationService['badgeColor'][] = [
  'amber',
  'orange',
  'blue',
  'emerald',
  'rose',
  'purple',
];

const VALID_ICON_TYPES: AlterationService['iconType'][] = [
  'button',
  'tear',
  'waist',
  'length',
  'zip-small',
  'sleeve',
  'slim-fit',
  'zip-large',
  'jeans',
  'double-stitch',
  'saree-fall',
  'saree-pleat',
];

export function mapPublicTailorToPartner(t: PublicTailorItem): TailorPartner {
  const pickupSlots =
    t.pickupSlots && t.pickupSlots.length > 0
      ? t.pickupSlots
      : ['10:00 AM – 12:00 PM', '12:30 PM – 02:30 PM', '03:30 PM – 05:30 PM', '06:00 PM – 08:00 PM'];
  const turnaroundDays = t.turnaroundDays ?? 4;
  const turnaroundText =
    t.turnaroundText || (turnaroundDays <= 1 ? '24 Hours' : `${turnaroundDays}–${turnaroundDays + 2} Days`);

  const services = t.services.map((s) => ({
    id: String(s.id),
    dbId: s.id,
    name: s.title,
    category: s.category.charAt(0).toUpperCase() + s.category.slice(1),
    price: s.basePrice,
    turnaround: s.turnaroundDays <= 1 ? '24 hrs' : `${s.turnaroundDays} days`,
    description: s.description || 'Tailored with precision fitting and fabric protection.',
  }));

  const portfolio = t.portfolio.map((p) => {
    const captionParts = (p.caption || '').split('·');
    const parsedTags =
      captionParts.length > 1
        ? captionParts[1]
            .split(',')
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean)
        : [p.category.toLowerCase()];
    return {
      id: String(p.id),
      title: p.title,
      category: captionParts[0]?.trim() || p.category,
      caption: p.caption || '',
      image: p.imageUrl,
      price: p.priceHint ?? t.startingPrice ?? 999,
      days: p.turnaroundDays ?? turnaroundDays,
      tags: parsedTags,
      isFeatured: Boolean(p.isFeatured),
    };
  });

  const minPrice =
    t.startingPrice ??
    (services.length > 0 ? Math.min(...services.map((s) => s.price)) : 499);

  return {
    id: String(t.id),
    dbId: t.id,
    shopName: t.shopName,
    masterTailor: t.masterTailor,
    locality: t.locality,
    address: t.address || undefined,
    distanceKm: Number(t.distanceKm ?? 2.0),
    rating: Number(t.rating || 4.8),
    reviewCount: Number(t.totalReviews || 0),
    completedOrders: Number(t.completedOrders || 0),
    yearsExperience: Number(t.experienceYears || 5),
    bio: t.bio || `Verified Tailering atelier in ${t.locality}.`,
    logoUrl: t.logoUrl || undefined,
    coverImage:
      t.coverImageUrl ||
      portfolio[0]?.image ||
      '/src/assets/images/design_bridal_blouse_1795271999750.jpg',
    specialties: t.specialties.length > 0 ? t.specialties : ['Custom Stitching', 'Alterations'],
    homeVisitFee: Number(t.homeVisitFee || 0),
    pickupAvailable: Boolean(t.pickupAvailable),
    nextPickupSlot: t.isAvailable ? `Today, ${pickupSlots[0].split('–')[0].trim()}` : 'Tomorrow, 10:00 AM',
    pickupSlots,
    workingHours: t.workingHours || '10:00 AM – 8:30 PM',
    openNow: Boolean(t.isAvailable),
    startingPrice: minPrice,
    verified: Boolean(t.isVerified),
    turnaround: turnaroundText,
    turnaroundDays,
    services,
    portfolio,
    recentReview: t.recentReview || {
      author: 'Verified Tailering Customer',
      text: `Prompt doorstep measurement and clean stitching finish from ${t.shopName}.`,
      date: 'Recently',
    },
  };
}

export function mapPublicDesignToProduct(d: PublicDesignItem): DesignProduct {
  return {
    id: d.slug || String(d.id),
    title: d.title,
    category: d.category,
    categoryId: d.categoryId,
    gender: d.gender,
    boutique: d.boutique,
    price: d.price,
    originalPrice: d.originalPrice,
    image: d.imageUrl,
    views: d.views,
    turnaroundDays: d.turnaroundDays,
    trusted: d.trusted,
    rating: d.rating,
    description: d.description,
    fabricNote: d.fabricNote,
    isTrending: d.isTrending,
  };
}

export function mapPublicAlterationToService(a: PublicAlterationItem): AlterationService {
  const badgeColor = VALID_BADGE_COLORS.includes(a.badgeColor as AlterationService['badgeColor'])
    ? (a.badgeColor as AlterationService['badgeColor'])
    : 'amber';
  const iconType = VALID_ICON_TYPES.includes(a.iconType as AlterationService['iconType'])
    ? (a.iconType as AlterationService['iconType'])
    : 'waist';
  return {
    id: a.slug || String(a.id),
    title: a.title,
    description: a.description,
    price: a.price,
    unit: a.unit,
    badge: a.badge,
    badgeColor,
    section: a.section,
    iconType,
  };
}

export const tailorPortfolioApi = {
  list: (page = 1, limit = 9, category = '') => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (category) params.set('category', category);
    return apiRequest<{
      items: TailorPortfolioItem[];
      stats: { totalCount: number; visibleCount: number; featuredCount: number };
      pagination?: PaginationMeta;
    }>(`/api/tailor/portfolio?${params.toString()}`);
  },
  create: (payload: {
    title: string;
    category: 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear';
    caption?: string;
    priceHint?: number | null;
    turnaroundDays?: number | null;
    isFeatured?: boolean;
    isVisible?: boolean;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    imageBase64: string;
  }) =>
    apiRequest<{ id: number; imageUrl: string; message: string }>('/api/tailor/portfolio', {
      method: 'POST',
      body: payload,
    }),
  update: (
    id: number,
    payload: {
      title?: string;
      category?: 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear';
      caption?: string | null;
      priceHint?: number | null;
      turnaroundDays?: number | null;
      isFeatured?: boolean;
      isVisible?: boolean;
    },
  ) =>
    apiRequest<{ message: string }>(`/api/tailor/portfolio/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  remove: (id: number) =>
    apiRequest<{ message: string }>(`/api/tailor/portfolio/${id}`, {
      method: 'DELETE',
    }),
};

export const tailorLogoApi = {
  upload: (payload: {
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    imageBase64: string;
  }) =>
    apiRequest<{ logoUrl: string; message: string }>('/api/tailor/logo', {
      method: 'POST',
      body: payload,
    }),
  remove: () =>
    apiRequest<{ message: string }>('/api/tailor/logo', {
      method: 'DELETE',
    }),
};

export const ownerTailorLogoApi = {
  upload: (
    tailorId: number,
    payload: {
      mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
      imageBase64: string;
    },
  ) =>
    apiRequest<{ logoUrl: string; message: string }>(`/api/owner/tailors/${tailorId}/logo`, {
      method: 'POST',
      body: payload,
    }),
  remove: (tailorId: number) =>
    apiRequest<{ message: string }>(`/api/owner/tailors/${tailorId}/logo`, {
      method: 'DELETE',
    }),
};

export const publicApi = {
  storefront: () =>
    apiRequest<StorefrontBootstrapResponse>('/api/public/storefront', { auth: false }),
  tailors: (q = '', locality = '', page = 1, limit = 12) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (locality) params.set('locality', locality);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return apiRequest<{ tailors: PublicTailorItem[]; pagination?: PaginationMeta }>(
      `/api/public/tailors?${params.toString()}`,
      { auth: false },
    );
  },
  tailorDetail: (tailorId: number) =>
    apiRequest<{ tailor: PublicTailorDetailItem }>(`/api/public/tailors/${tailorId}`, {
      auth: false,
    }),
  designs: (opts?: { gender?: string; category?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (opts?.gender) params.set('gender', opts.gender);
    if (opts?.category) params.set('category', opts.category);
    if (opts?.q) params.set('q', opts.q);
    const qs = params.toString();
    return apiRequest<{ designs: PublicDesignItem[] }>(
      `/api/public/designs${qs ? `?${qs}` : ''}`,
      { auth: false },
    );
  },
  alterations: (opts?: { section?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (opts?.section) params.set('section', opts.section);
    if (opts?.q) params.set('q', opts.q);
    const qs = params.toString();
    return apiRequest<{ alterations: PublicAlterationItem[] }>(
      `/api/public/alterations${qs ? `?${qs}` : ''}`,
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

export const customerReviewApi = {
  create: (
    tailorId: number,
    payload: {
      rating: number;
      serviceName?: string;
      comment: string;
    },
  ) =>
    apiRequest<{
      review: TailorReviewItem;
      rating: number;
      totalReviews: number;
      ratingBreakdown: TailorRatingBreakdown;
      message: string;
    }>(`/api/customer/tailors/${tailorId}/reviews`, {
      method: 'POST',
      body: payload,
    }),
};
