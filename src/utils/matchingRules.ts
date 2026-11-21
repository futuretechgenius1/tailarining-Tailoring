import { OrderLifecycleStage, OrderRecord } from '../types';

export type ServiceSpecialtyRule =
  | 'all'
  | 'blouse-maggam'
  | 'alterations'
  | 'mens-tailoring'
  | 'uniforms';

export interface MatchingRulesConfig {
  maxRadiusKm: number; // Business plan default: 3–5 km pilot zone
  minRating: number; // Minimum quality threshold (e.g., 4.0★)
  requireOpenNow: boolean; // Live open status filter
  requireOperational: boolean; // Must have OPERATIONAL business status
  serviceType: ServiceSpecialtyRule;
  topKBroadcastCount: number; // Route request to top 3 eligible tailors
  autoRerouteSeconds: number; // Auto re-route timer if unaccepted
  homeVisitFeeInr: number; // Configurable ₹49–₹99 visit fee
  minOrderForFreeVisitInr: number; // Credit visit fee against qualifying order
  maskAddressUntilAccepted: boolean; // Hide customer street address before acceptance
}

export const DEFAULT_MATCHING_RULES: MatchingRulesConfig = {
  maxRadiusKm: 5,
  minRating: 4.0,
  requireOpenNow: false,
  requireOperational: true,
  serviceType: 'all',
  topKBroadcastCount: 3,
  autoRerouteSeconds: 15,
  homeVisitFeeInr: 49,
  minOrderForFreeVisitInr: 799,
  maskAddressUntilAccepted: true,
};

export interface LiveTailorPlace {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating: number | null;
  userRatingCount: number;
  businessStatus: string | null;
  isOpenNow: boolean | null;
  openingHoursText: string[];
  googleMapsURI?: string;
  primaryType?: string;
  photoUri?: string;
  photoAttribution?: string;
  phoneNumber?: string;
}

export interface RuleCheckOutcome {
  ruleId:
    | 'OPERATIONAL_STATUS'
    | 'SERVICE_RADIUS'
    | 'MIN_RATING'
    | 'OPEN_NOW'
    | 'SERVICE_CAPABILITY';
  label: string;
  passed: boolean;
  detail: string;
}

export interface EvaluatedTailorShop {
  place: LiveTailorPlace;
  distanceKm: number;
  eligible: boolean;
  matchScore: number; // Deterministic 0–100 score
  scoreBreakdown: {
    proximity: number; // Max 45
    rating: number; // Max 30
    trustVolume: number; // Max 15
    availability: number; // Max 10
  };
  ruleChecks: RuleCheckOutcome[];
  failedReasons: string[];
  dispatchWave: 1 | 2 | null; // 1 = Top-K primary broadcast, 2 = Auto Re-route backup, null = ineligible
  rank: number | null;
}

export const SERVICE_QUERY_TERMS: Record<ServiceSpecialtyRule, string> = {
  all: 'tailor boutique alteration stitching shop',
  'blouse-maggam': 'ladies tailor designer blouse maggam work boutique',
  alterations: 'clothing alteration tailor repair shop',
  'mens-tailoring': 'mens tailor bespoke suit shirt stitching',
  uniforms: 'uniform tailor stitching shop',
};

/**
 * Great-circle Haversine distance in kilometers between two coordinates.
 */
export function calculateDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function matchesServiceCapability(
  place: LiveTailorPlace,
  serviceType: ServiceSpecialtyRule,
): { passed: boolean; detail: string } {
  if (serviceType === 'all') {
    return { passed: true, detail: 'Matches general tailoring & alteration services' };
  }
  const haystack = `${place.name} ${place.primaryType ?? ''} ${place.address}`.toLowerCase();
  const keywordMap: Record<Exclude<ServiceSpecialtyRule, 'all'>, string[]> = {
    'blouse-maggam': ['boutique', 'ladies', 'blouse', 'maggam', 'designer', 'women', 'bridal', 'tailor'],
    alterations: ['alter', 'tailor', 'stitch', 'repair', 'boutique'],
    'mens-tailoring': ['men', 'gents', 'bespoke', 'suit', 'raymond', 'tailor'],
    uniforms: ['uniform', 'tailor', 'stitch', 'garment', 'textile'],
  };
  const matched = keywordMap[serviceType].some((kw) => haystack.includes(kw));
  return matched
    ? { passed: true, detail: `Supports ${serviceType.replace('-', ' ')} category` }
    : { passed: false, detail: `No ${serviceType.replace('-', ' ')} specialty match in listing` };
}

/**
 * Evaluates a list of live Google Maps places against Tailering's matching & ranking rules.
 * - Filters by operational status, configurable radius (3–10 km), min rating, open-now, and service capability.
 * - Ranks eligible shops deterministically by proximity, rating, review trust volume, and live availability.
 * - Partitions eligible shops into Wave 1 (Top-K broadcast) and Wave 2 (Auto Re-Route pool).
 */
export function evaluateAndRankShops(
  places: LiveTailorPlace[],
  userLocation: { lat: number; lng: number },
  rules: MatchingRulesConfig,
): EvaluatedTailorShop[] {
  const evaluated = places.map((place): EvaluatedTailorShop => {
    const distanceKm = calculateDistanceKm(userLocation, place.location);

    const isOperational =
      !place.businessStatus || place.businessStatus === 'OPERATIONAL';
    const operationalCheck: RuleCheckOutcome = {
      ruleId: 'OPERATIONAL_STATUS',
      label: 'Active Business Status',
      passed: !rules.requireOperational || isOperational,
      detail: isOperational
        ? 'Operational on Google Maps'
        : `Status: ${place.businessStatus}`,
    };

    const withinRadius = distanceKm <= rules.maxRadiusKm;
    const radiusCheck: RuleCheckOutcome = {
      ruleId: 'SERVICE_RADIUS',
      label: `Within ${rules.maxRadiusKm} km Zone`,
      passed: withinRadius,
      detail: withinRadius
        ? `${distanceKm.toFixed(2)} km (inside ${rules.maxRadiusKm} km limit)`
        : `${distanceKm.toFixed(2)} km (exceeds ${rules.maxRadiusKm} km limit)`,
    };

    const effectiveRating = place.rating ?? 0;
    const ratingPassed =
      rules.minRating <= 0 || (place.rating !== null && place.rating >= rules.minRating);
    const ratingCheck: RuleCheckOutcome = {
      ruleId: 'MIN_RATING',
      label: `Min ${rules.minRating.toFixed(1)}★ Quality Rule`,
      passed: ratingPassed,
      detail:
        place.rating !== null
          ? `${place.rating.toFixed(1)}★ (${place.userRatingCount} reviews)`
          : 'Unrated on Google Maps',
    };

    const openPassed = !rules.requireOpenNow || place.isOpenNow === true;
    const openCheck: RuleCheckOutcome = {
      ruleId: 'OPEN_NOW',
      label: 'Live Open-Now Availability',
      passed: openPassed,
      detail:
        place.isOpenNow === true
          ? 'Open right now'
          : place.isOpenNow === false
            ? 'Currently closed'
            : 'Hours unavailable',
    };

    const serviceMatch = matchesServiceCapability(place, rules.serviceType);
    const serviceCheck: RuleCheckOutcome = {
      ruleId: 'SERVICE_CAPABILITY',
      label: 'Service Capability Match',
      passed: serviceMatch.passed,
      detail: serviceMatch.detail,
    };

    const ruleChecks = [
      operationalCheck,
      radiusCheck,
      ratingCheck,
      openCheck,
      serviceCheck,
    ];
    const failedReasons = ruleChecks.filter((r) => !r.passed).map((r) => r.detail);
    const eligible = failedReasons.length === 0;

    // Deterministic weighted match score (0–100)
    const proximityRatio = Math.max(0, 1 - distanceKm / Math.max(rules.maxRadiusKm, 1));
    const proximityScore = Math.round(proximityRatio * 45);
    const ratingScore = Math.round((Math.min(effectiveRating, 5) / 5) * 30);
    const trustVolumeScore = Math.round(
      (Math.min(Math.log10(place.userRatingCount + 1), 2.5) / 2.5) * 15,
    );
    const availabilityScore =
      place.isOpenNow === true ? 10 : place.isOpenNow === null ? 5 : 0;

    const matchScore = Math.min(
      100,
      proximityScore + ratingScore + trustVolumeScore + availabilityScore,
    );

    return {
      place,
      distanceKm,
      eligible,
      matchScore,
      scoreBreakdown: {
        proximity: proximityScore,
        rating: ratingScore,
        trustVolume: trustVolumeScore,
        availability: availabilityScore,
      },
      ruleChecks,
      failedReasons,
      dispatchWave: null,
      rank: null,
    };
  });

  // Sort eligible first by matchScore DESC, then distance ASC; ineligible sorted by distance ASC
  evaluated.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.eligible && b.eligible) {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.distanceKm - b.distanceKm;
    }
    return a.distanceKm - b.distanceKm;
  });

  let eligibleCounter = 0;
  return evaluated.map((item) => {
    if (!item.eligible) return item;
    eligibleCounter += 1;
    const dispatchWave: 1 | 2 =
      eligibleCounter <= rules.topKBroadcastCount ? 1 : 2;
    return {
      ...item,
      rank: eligibleCounter,
      dispatchWave,
    };
  });
}

/**
 * Operating Rule: Home Visit Fee & Credit against minimum order value (₹49–₹99).
 */
export function evaluateHomeVisitFee(
  estimatedOrderInr: number,
  rules: MatchingRulesConfig,
): { payableVisitFee: number; creditedBack: boolean; explanation: string } {
  if (estimatedOrderInr >= rules.minOrderForFreeVisitInr) {
    return {
      payableVisitFee: 0,
      creditedBack: true,
      explanation: `₹${rules.homeVisitFeeInr} visit fee credited back (order ≥ ₹${rules.minOrderForFreeVisitInr})`,
    };
  }
  const shortfall = rules.minOrderForFreeVisitInr - estimatedOrderInr;
  return {
    payableVisitFee: rules.homeVisitFeeInr,
    creditedBack: false,
    explanation: `₹${rules.homeVisitFeeInr} doorstep visit fee applies (add ₹${shortfall} to waive)`,
  };
}

/**
 * Privacy Rule: Mask customer's full street address until a tailor accepts the booking.
 */
export function formatMaskedCustomerAddress(
  fullAddress: string,
  locality: string,
  stage: OrderLifecycleStage,
  maskEnabled: boolean,
): { visibleAddress: string; isMasked: boolean } {
  const unlockedStages: OrderLifecycleStage[] = [
    'Tailor Accepted',
    'Visit Scheduled',
    'Measurements Completed',
    'Quotation Submitted',
    'Customer Approved',
    'Stitching Started',
    'Quality Check',
    'Ready for Delivery',
    'Delivered',
  ];

  if (!maskEnabled || unlockedStages.includes(stage)) {
    return { visibleAddress: fullAddress, isMasked: false };
  }

  return {
    visibleAddress: `${locality} (Exact flat/street address hidden until Tailor Accepted)`,
    isMasked: true,
  };
}

/**
 * Strict Order Lifecycle Transition Rules (Business Plan Section 9.4).
 */
export const ORDER_LIFECYCLE_FLOW: OrderLifecycleStage[] = [
  'Booking Created',
  'Searching for Tailors',
  'Tailor Accepted',
  'Visit Scheduled',
  'Measurements Completed',
  'Quotation Submitted',
  'Customer Approved',
  'Stitching Started',
  'Quality Check',
  'Ready for Delivery',
  'Delivered',
];

export const VALID_ORDER_TRANSITIONS: Record<
  OrderLifecycleStage,
  OrderLifecycleStage[]
> = {
  'Booking Created': ['Searching for Tailors', 'Tailor Accepted'],
  'Searching for Tailors': ['Tailor Accepted'],
  'Tailor Accepted': ['Visit Scheduled'],
  'Visit Scheduled': ['Measurements Completed'],
  'Measurements Completed': ['Quotation Submitted'],
  'Quotation Submitted': ['Customer Approved'],
  'Customer Approved': ['Stitching Started'],
  'Stitching Started': ['Quality Check'],
  'Quality Check': ['Ready for Delivery'],
  'Ready for Delivery': ['Delivered'],
  Delivered: [],
};

export function validateOrderTransition(
  order: Pick<OrderRecord, 'stage' | 'quoteApproved'>,
  targetStage: OrderLifecycleStage,
): { allowed: boolean; reason: string } {
  const allowedNext = VALID_ORDER_TRANSITIONS[order.stage] ?? [];
  if (!allowedNext.includes(targetStage)) {
    return {
      allowed: false,
      reason: `Rule Violation: Cannot jump directly from "${order.stage}" to "${targetStage}".`,
    };
  }

  // Hard Business Rule: Stitching MUST NOT start before explicit customer quote approval
  if (targetStage === 'Stitching Started' && !order.quoteApproved) {
    return {
      allowed: false,
      reason:
        'Rule Blocked: Stitching cannot begin until the customer explicitly approves the final quotation, measurements, and delivery date.',
    };
  }

  if (targetStage === 'Customer Approved' && !order.quoteApproved) {
    return {
      allowed: false,
      reason:
        'Rule Blocked: Only the customer can confirm final quotation approval before stitching starts.',
    };
  }

  return {
    allowed: true,
    reason: `Transition "${order.stage}" → "${targetStage}" satisfies all Tailering operating rules.`,
  };
}

export function getNextValidStage(
  current: OrderLifecycleStage,
): OrderLifecycleStage | null {
  const nextList = VALID_ORDER_TRANSITIONS[current];
  if (!nextList || nextList.length === 0) return null;
  return nextList[0];
}
