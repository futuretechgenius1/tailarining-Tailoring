export type PageRoute =
  | 'home'
  | 'designs'
  | 'custom-stitching'
  | 'alterations'
  | 'uniforms'
  | 'measurements'
  | 'nearby-shops'
  | 'auth'
  | 'partner';

export type AuthMode = 'login' | 'signup';

export type UserRole = 'customer' | 'tailor' | 'admin';

export interface UserSession {
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  locality: string;
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
  serviceTitle: string;
  type: 'alteration' | 'custom' | 'design' | 'uniform';
  tailorName: string;
  locality: string;
  createdAt: string;
  deliveryDate: string;
  amount: number;
  stage: OrderLifecycleStage;
  itemsSummary: string;
  quoteApproved: boolean;
}

export interface MeasurementProfile {
  id: string;
  label: string;
  garmentType: 'Blouse' | 'Kurti / Salwar' | 'Men Shirt / Kurta' | 'Trousers / Bottom';
  ownerName: string;
  updatedAt: string;
  consentSaved: boolean;
  measuredBy: string;
  values: Record<string, string>;
}

export interface TailorPartner {
  id: string;
  shopName: string;
  masterTailor: string;
  locality: string;
  distanceKm: number;
  rating: number;
  completedOrders: number;
  specialties: string[];
  homeVisitFee: number;
  verified: boolean;
  turnaround: string;
}
