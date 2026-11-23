export type PageRoute =
  | 'home'
  | 'designs'
  | 'custom-stitching'
  | 'fabric-calculator'
  | 'alterations'
  | 'uniforms'
  | 'measurements'
  | 'nearby-shops'
  | 'auth'
  | 'partner'
  | 'dashboard';

export interface FabricBookingPreset {
  garmentOptionId: string;
  garmentLabel: string;
  includeLining: boolean;
  summaryNote: string;
}

export type AuthMode = 'login' | 'signup';

export type UserRole = 'owner' | 'tailor' | 'customer';

export interface UserSession {
  id: number;
  name: string;
  phone?: string | null;
  email: string;
  role: UserRole;
  status?: 'active' | 'suspended' | 'pending';
  locality: string;
  address?: string | null;
  tailorProfileId?: number | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  gender: 'women' | 'men';
  image: string;
  startingPrice: number;
  designCount: number;
}

export interface DesignProduct {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  gender: 'women' | 'men';
  boutique: string;
  price: number;
  originalPrice?: number;
  image: string;
  views: number;
  turnaroundDays: number;
  trusted: boolean;
  rating: number;
  description: string;
  fabricNote: string;
  isTrending?: boolean;
}

export interface AlterationService {
  id: string;
  title: string;
  description: string;
  price: number;
  unit: string;
  badge: string;
  badgeColor: 'orange' | 'blue' | 'emerald' | 'rose' | 'purple' | 'amber';
  section: 'garment' | 'saree';
  iconType:
    | 'button'
    | 'tear'
    | 'waist'
    | 'length'
    | 'zip-small'
    | 'sleeve'
    | 'slim-fit'
    | 'zip-large'
    | 'jeans'
    | 'double-stitch'
    | 'saree-fall'
    | 'saree-pleat';
}

export interface CartItem {
  id: string;
  type: 'design' | 'alteration' | 'custom' | 'uniform';
  title: string;
  subtitle: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface PromoOffer {
  code: string;
  title: string;
  description: string;
  tag: string;
  discountAmount: number;
  minOrder: number;
  gradient: string;
}

export type OrderLifecycleStage =
  | 'Booking Created'
  | 'Searching for Tailors'
  | 'Tailor Accepted'
  | 'Visit Scheduled'
  | 'Measurements Completed'
  | 'Quotation Submitted'
  | 'Customer Approved'
  | 'Stitching Started'
  | 'Quality Check'
  | 'Ready for Delivery'
  | 'Delivered';

export interface OrderRecord {
  id: string;
  dbId?: number;
  serviceTitle: string;
  type: 'alteration' | 'custom' | 'design' | 'uniform';
  tailorName: string;
  tailorId?: number | null;
  serviceId?: number | null;
  locality: string;
  createdAt: string;
  deliveryDate: string;
  amount: number;
  stage: OrderLifecycleStage;
  itemsSummary: string;
  quoteApproved: boolean;
  pickupMode?: 'doorstep_pickup' | 'shop_visit';
  pickupDate?: string;
  pickupSlot?: string;
  pickupAddress?: string;
}

export interface MeasurementProfile {
  id: string;
  dbId?: number;
  label: string;
  garmentType: 'Blouse' | 'Kurti / Salwar' | 'Men Shirt / Kurta' | 'Trousers / Bottom';
  ownerName: string;
  updatedAt: string;
  consentSaved: boolean;
  measuredBy: string;
  values: Record<string, string>;
}

export interface TailorServiceItem {
  id: string;
  dbId?: number;
  name: string;
  category: string;
  price: number;
  turnaround: string;
  description: string;
}

export interface TailorPortfolioWork {
  id: string;
  title: string;
  category: string;
  caption?: string;
  image: string;
  price: number;
  days: number;
  tags: string[];
  isFeatured?: boolean;
}

export interface TailorReviewItem {
  id: number;
  tailorId: number;
  reviewerName: string;
  reviewerLocality: string;
  serviceName: string | null;
  rating: number;
  comment: string;
  isVerifiedBooking: boolean;
  createdAt: string;
}

export type TailorRatingBreakdown = Record<'5' | '4' | '3' | '2' | '1', number>;

export interface ServiceLocality {
  id: number;
  name: string;
  city: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

export interface CraftReelScene {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  durationSec: number;
  image: string;
  intentId: string;
  motionVariant: 'zoom' | 'pan';
}

export interface PlatformServiceItem {
  id: number;
  title: string;
  category: string;
  description: string;
  basePrice: number;
  turnaroundDays: number;
}

export type StorefrontMediaMap = Record<string, string>;

export interface TailorPartner {
  id: string;
  dbId?: number;
  shopName: string;
  masterTailor: string;
  locality: string;
  address?: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  yearsExperience: number;
  bio: string;
  logoUrl?: string;
  coverImage: string;
  specialties: string[];
  homeVisitFee: number;
  pickupAvailable: boolean;
  nextPickupSlot: string;
  pickupSlots: string[];
  workingHours: string;
  openNow: boolean;
  startingPrice: number;
  verified: boolean;
  turnaround: string;
  turnaroundDays: number;
  services: TailorServiceItem[];
  portfolio: TailorPortfolioWork[];
  recentReview: {
    author: string;
    text: string;
    date: string;
  };
}

