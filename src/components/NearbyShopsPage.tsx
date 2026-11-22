import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Footprints,
  Lock,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Scissors,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Unlock,
  X,
  XCircle,
} from 'lucide-react';
import { ASSETS } from '../data/catalogData';
import { OrderLifecycleStage, OrderRecord } from '../types';
import {
  DEFAULT_MATCHING_RULES,
  EvaluatedTailorShop,
  LiveTailorPlace,
  MatchingRulesConfig,
  SERVICE_QUERY_TERMS,
  ServiceSpecialtyRule,
  evaluateAndRankShops,
  evaluateHomeVisitFee,
  formatMaskedCustomerAddress,
  validateOrderTransition,
} from '../utils/matchingRules';
import { SafeImage } from './SafeImage';
import { MapBookingFlowPanel, MapBookingStep } from './MapBookingFlowPanel';
import {
  MapRouteSummary,
  MapShopDetailModal,
  getShopFallbackImage,
} from './MapShopModals';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

const HYDERABAD_ZONES: { label: string; center: { lat: number; lng: number } }[] = [
  { label: 'Alkapur Township, Manikonda', center: { lat: 17.3984, lng: 78.3746 } },
  { label: 'Gachibowli, Hyderabad', center: { lat: 17.4401, lng: 78.3489 } },
  { label: 'Kondapur, Hyderabad', center: { lat: 17.4622, lng: 78.3568 } },
  { label: 'Jubilee Hills, Hyderabad', center: { lat: 17.4326, lng: 78.4071 } },
  { label: 'Madhapur, Hyderabad', center: { lat: 17.4483, lng: 78.3915 } },
];

const SPECIALTY_TABS: { id: ServiceSpecialtyRule; label: string }[] = [
  { id: 'all', label: 'All Tailors & Boutiques' },
  { id: 'blouse-maggam', label: 'Blouses & Maggam' },
  { id: 'alterations', label: 'Express Alterations' },
  { id: 'mens-tailoring', label: "Men's Bespoke & Suits" },
  { id: 'uniforms', label: 'Uniforms & Institutional' },
];

const HERO_BACKDROP_SCENES = [
  ASSETS.atelierBespokeChalk,
  ASSETS.atelierHeroStitching,
  ASSETS.atelierMaggamCraft,
];

type TravelModeOption = 'DRIVING' | 'TWO_WHEELER' | 'WALKING';

interface NearbyShopsPageProps {
  locality: string;
  onUpdateLocality: (newLocality: string) => void;
  onCreateOrder: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}

function isQuotaExhaustedError(err: unknown): boolean {
  if (!err) return false;
  const text =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? `${err.name} ${err.message}`
        : JSON.stringify(err);
  return (
    text.includes('429') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('QuotaExceeded') ||
    text.includes('OverQuota')
  );
}

function notifyQuotaExceededIfApplicable(err: unknown): boolean {
  if (isQuotaExhaustedError(err)) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

function formatDurationMinutes(durationMillis: number): string {
  const mins = Math.max(1, Math.round(durationMillis / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// --- Map Child: Service Radius Ring ---
const ServiceRadiusCircle: React.FC<{
  center: { lat: number; lng: number };
  radiusKm: number;
}> = ({ center, radiusKm }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.Circle) return;
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }
    const circle = new google.maps.Circle({
      map,
      center,
      radius: radiusKm * 1000,
      strokeColor: '#0B7285',
      strokeOpacity: 0.72,
      strokeWeight: 2,
      fillColor: '#0B7285',
      fillOpacity: 0.08,
      clickable: false,
    });
    circleRef.current = circle;

    return () => {
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map, center, radiusKm]);

  return null;
};

// --- Map Child: Smooth Camera Sync ---
const MapCameraController: React.FC<{
  center: { lat: number; lng: number };
  radiusKm: number;
}> = ({ center, radiusKm }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    const targetZoom = radiusKm <= 3 ? 13.5 : radiusKm <= 5 ? 12.8 : radiusKm <= 8 ? 12 : 11.4;
    map.setZoom(targetZoom);
  }, [map, center, radiusKm]);

  return null;
};

// --- Map Child: Modern Routes API Polyline Renderer (Zero Legacy DirectionsService) ---
const LiveRoutePolyline: React.FC<{
  origin: { lat: number; lng: number };
  selectedShop: EvaluatedTailorShop | null;
  travelMode: TravelModeOption;
  onRouteCalculated: (summary: MapRouteSummary | null) => void;
  onRouteLoading: (loading: boolean) => void;
  onRouteError: (msg: string | null) => void;
}> = ({
  origin,
  selectedShop,
  travelMode,
  onRouteCalculated,
  onRouteLoading,
  onRouteError,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteError(null);

    if (!map || !routesLib || !selectedShop) {
      onRouteCalculated(null);
      onRouteLoading(false);
      return;
    }

    let cancelled = false;
    onRouteLoading(true);

    // Modern Routes API via Maps JS SDK wrapper: Route.computeRoutes()
    // Docs: https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_mcp_codeassist_v1_aistudio
    const routeCtor = (
      routesLib as unknown as {
        Route?: { computeRoutes: (req: unknown) => Promise<{ routes?: unknown[] }> };
      }
    ).Route;
    if (!routeCtor || typeof routeCtor.computeRoutes !== 'function') {
      onRouteLoading(false);
      onRouteError('Routes library is initializing. Please try selecting the shop again.');
      return;
    }

    const request = {
      origin,
      destination: selectedShop.place.location,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    routeCtor
      .computeRoutes(request)
      .then((res) => {
        if (cancelled) return;
        onRouteLoading(false);

        const routes = res?.routes;
        if (!routes || routes.length === 0) {
          onRouteCalculated(null);
          onRouteError('No drivable route returned for this destination.');
          return;
        }

        const primaryRoute = routes[0] as {
          distanceMeters?: number;
          durationMillis?: number;
          viewport?: google.maps.LatLngBounds;
          createPolylines?: () => google.maps.Polyline[];
        };

        if (typeof primaryRoute.createPolylines === 'function') {
          const lines = primaryRoute.createPolylines();
          lines.forEach((poly) => {
            poly.setOptions({
              strokeColor: '#0B7285',
              strokeOpacity: 0.92,
              strokeWeight: 5,
            });
            poly.setMap(map);
          });
          polylinesRef.current = lines;
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 64);
        }

        onRouteCalculated({
          shopId: selectedShop.place.id,
          shopName: selectedShop.place.name,
          distanceMeters: primaryRoute.distanceMeters ?? Math.round(selectedShop.distanceKm * 1000),
          durationMillis:
            primaryRoute.durationMillis ?? Math.round((selectedShop.distanceKm / 22) * 3600000),
          travelMode,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        onRouteLoading(false);
        onRouteCalculated(null);
        if (notifyQuotaExceededIfApplicable(err)) {
          onRouteError('Live route lookup paused due to Google Maps quota limit.');
        } else {
          onRouteError('Unable to compute live route right now. Showing straight-line distance.');
        }
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    map,
    routesLib,
    origin,
    selectedShop,
    travelMode,
    onRouteCalculated,
    onRouteLoading,
    onRouteError,
  ]);

  return null;
};

// --- Map Child: Anchored Shop AdvancedMarker + InfoWindow ---
const ShopAdvancedMarker: React.FC<{
  shop: EvaluatedTailorShop;
  isSelected: boolean;
  routeSummary: MapRouteSummary | null;
  onSelect: (shop: EvaluatedTailorShop) => void;
  onCloseInfo: () => void;
  onInspectShop: (shop: EvaluatedTailorShop) => void;
  onBookShop: (shop: EvaluatedTailorShop) => void;
}> = ({
  shop,
  isSelected,
  routeSummary,
  onSelect,
  onCloseInfo,
  onInspectShop,
  onBookShop,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const isTopWave = shop.eligible && shop.dispatchWave === 1;
  const markerClasses = !shop.eligible
    ? 'bg-[#64748B] border-[#CBD5E1] text-white'
    : isSelected
      ? 'bg-[#0B1F3A] border-[#E2B14B] text-white scale-110 shadow-xl ring-4 ring-[#0B7285]/35'
      : isTopWave
        ? 'bg-[#0B7285] border-white text-white shadow-lg hover:scale-105'
        : 'bg-[#C8922A] border-white text-white shadow-md hover:scale-105';
  const pointerColor = !shop.eligible
    ? 'border-t-[#64748B]'
    : isSelected
      ? 'border-t-[#0B1F3A]'
      : isTopWave
        ? 'border-t-[#0B7285]'
        : 'border-t-[#C8922A]';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={shop.place.location}
        title={shop.place.name}
        zIndex={isSelected ? 60 : isTopWave ? 30 : shop.eligible ? 20 : 10}
        onClick={() => onSelect(shop)}
      >
        <div className="relative flex flex-col items-center cursor-pointer select-none group">
          {isSelected && (
            <span className="absolute -inset-2 rounded-full bg-[#0B7285]/25 animate-ping pointer-events-none" />
          )}
          <div
            className={`relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 transition-all duration-150 tabular-nums ${markerClasses}`}
          >
            <span className="text-[11px] font-extrabold leading-none">
              {shop.rank !== null ? `#${shop.rank}` : '×'}
            </span>
            {shop.eligible && shop.place.rating !== null && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold leading-none opacity-95">
                <span className="opacity-50">·</span>
                {shop.place.rating.toFixed(1)}★
              </span>
            )}
          </div>
          <span
            className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] -mt-0.5 ${pointerColor}`}
          />
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={310} onCloseClick={onCloseInfo}>
          <div className="p-1 text-[#0B1F3A] space-y-2.5 font-sans">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-extrabold leading-snug text-[#0B1F3A]">
                  {shop.place.name}
                </p>
                <p className="text-[11px] text-[#475569] leading-snug mt-0.5 line-clamp-2">
                  {shop.place.address}
                </p>
              </div>
              {shop.eligible ? (
                <span className="shrink-0 text-[10px] font-extrabold text-[#0B7285] tabular-nums">
                  {shop.matchScore}/100
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-extrabold text-rose-700">
                  Filtered
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#334155] tabular-nums">
              {shop.place.rating !== null && (
                <span className="inline-flex items-center gap-0.5 font-bold">
                  <Star className="w-3 h-3 fill-[#C8922A] text-[#C8922A]" />
                  {shop.place.rating.toFixed(1)} ({shop.place.userRatingCount})
                </span>
              )}
              <span>·</span>
              <span className="font-semibold">{shop.distanceKm.toFixed(2)} km</span>
              {shop.place.isOpenNow !== null && (
                <>
                  <span>·</span>
                  <span
                    className={`font-bold ${
                      shop.place.isOpenNow ? 'text-[#059669]' : 'text-[#DC2626]'
                    }`}
                  >
                    {shop.place.isOpenNow ? 'Open now' : 'Closed'}
                  </span>
                </>
              )}
            </div>

            {routeSummary && routeSummary.shopId === shop.place.id && (
              <div className="bg-[#F0F9FA] border border-[#CBE7EC] rounded-lg px-2.5 py-1.5 text-[11px] text-[#0B1F3A] flex items-center justify-between tabular-nums">
                <span className="font-bold">
                  Route: {(routeSummary.distanceMeters / 1000).toFixed(2)} km
                </span>
                <span className="font-extrabold text-[#0B7285]">
                  ~{formatDurationMinutes(routeSummary.durationMillis)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => onInspectShop(shop)}
                className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] hover:border-[#0B7285] text-[11px] font-bold text-[#0B1F3A] cursor-pointer"
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => onBookShop(shop)}
                className="flex-1 bg-[#0B7285] hover:bg-[#085463] text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg cursor-pointer inline-flex items-center justify-center gap-1"
              >
                Choose Service
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

// --- Places API (New) Search & Autocomplete Controller (inside APIProvider) ---
interface InnerLocatorProps extends NearbyShopsPageProps {
  rules: MatchingRulesConfig;
  setRules: React.Dispatch<React.SetStateAction<MatchingRulesConfig>>;
}

const NearbyShopsWorkbench: React.FC<InnerLocatorProps> = ({
  locality,
  onUpdateLocality,
  onCreateOrder,
  onNotifyToast,
  rules,
  setRules,
}) => {
  const placesLib = useMapsLibrary('places');

  // Subtle hero cinema backdrop cycle
  const [heroSceneIdx, setHeroSceneIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroSceneIdx((prev) => (prev + 1) % HERO_BACKDROP_SCENES.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  // Real-time location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(
    HYDERABAD_ZONES[0].center,
  );
  const [locationSource, setLocationSource] = useState<'zone' | 'gps' | 'search'>('zone');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Places Autocomplete (Modern AutocompleteSuggestion + SessionToken)
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Live Google Places results
  const [rawPlaces, setRawPlaces] = useState<LiveTailorPlace[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Selected shop, Inline Map Booking Flow Step & Live Route
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<MapBookingStep>(1);
  const [travelMode, setTravelMode] = useState<TravelModeOption>('DRIVING');
  const [routeSummary, setRouteSummary] = useState<MapRouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [detailModalShop, setDetailModalShop] = useState<EvaluatedTailorShop | null>(null);

  const mapSectionRef = useRef<HTMLElement | null>(null);

  // Rules & Simulator Tabs
  const [activeRightTab, setActiveRightTab] = useState<'shops' | 'rules' | 'dispatch'>('shops');
  const [estimatedOrderInr, setEstimatedOrderInr] = useState(650);
  const [sampleCustomerAddress, setSampleCustomerAddress] = useState(
    'Flat 402, Sai Residency, Road No. 4, Alkapur Township',
  );

  // Top-3 Dispatch & Auto Re-Route Simulator State
  const [dispatchStatus, setDispatchStatus] = useState<
    'idle' | 'wave1' | 'wave2' | 'accepted' | 'exhausted'
  >('idle');
  const [dispatchCountdown, setDispatchCountdown] = useState<number>(rules.autoRerouteSeconds);
  const [acceptedShop, setAcceptedShop] = useState<EvaluatedTailorShop | null>(null);

  // Lifecycle Transition Rule Guard Tester State
  const [simOrderStage, setSimOrderStage] = useState<OrderLifecycleStage>('Quotation Submitted');
  const [simQuoteApproved, setSimQuoteApproved] = useState<boolean>(false);
  const [guardFeedback, setGuardFeedback] = useState<{ allowed: boolean; reason: string } | null>(
    null,
  );

  // Evaluate & rank live places against active Tailering rules
  const evaluatedShops = useMemo(
    () => evaluateAndRankShops(rawPlaces, userLocation, rules),
    [rawPlaces, userLocation, rules],
  );

  const eligibleShops = useMemo(
    () => evaluatedShops.filter((s) => s.eligible),
    [evaluatedShops],
  );
  const wave1Shops = useMemo(
    () => eligibleShops.filter((s) => s.dispatchWave === 1),
    [eligibleShops],
  );
  const wave2Shops = useMemo(
    () => eligibleShops.filter((s) => s.dispatchWave === 2),
    [eligibleShops],
  );

  const selectedShop = useMemo(
    () => evaluatedShops.find((s) => s.place.id === selectedShopId) ?? null,
    [evaluatedShops, selectedShopId],
  );

  const visitFeeEval = useMemo(
    () => evaluateHomeVisitFee(estimatedOrderInr, rules),
    [estimatedOrderInr, rules],
  );

  const privacyAddressPreview = useMemo(() => {
    const effectiveStage: OrderLifecycleStage =
      dispatchStatus === 'accepted' ? 'Tailor Accepted' : 'Searching for Tailors';
    return formatMaskedCustomerAddress(
      sampleCustomerAddress,
      locality,
      effectiveStage,
      rules.maskAddressUntilAccepted,
    );
  }, [sampleCustomerAddress, locality, dispatchStatus, rules.maskAddressUntilAccepted]);

  // --- Fetch Live Nearby Tailor Shops using Places API (New) Place.searchByText ---
  const fetchNearbyTailors = useCallback(
    async (center: { lat: number; lng: number }, specialty: ServiceSpecialtyRule) => {
      if (!placesLib) return;
      setSearchingPlaces(true);
      setPlacesError(null);

      try {
        const { Place } = placesLib;
        // Modern Places API (New) Text Search with explicit field mask
        // Docs: https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_mcp_codeassist_v1_aistudio
        const request = {
          textQuery: SERVICE_QUERY_TERMS[specialty],
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'businessStatus',
            'regularOpeningHours',
            'googleMapsURI',
            'primaryTypeDisplayName',
            'photos',
            'nationalPhoneNumber',
          ],
          locationBias: {
            center,
            radius: Math.min(rules.maxRadiusKm * 1000 + 2000, 15000),
          },
          maxResultCount: 18,
          language: 'en',
          region: 'IN',
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        };

        const response = await Place.searchByText(
          request as unknown as google.maps.places.SearchByTextRequest,
        );
        const places = response?.places ?? [];

        const mapped: LiveTailorPlace[] = await Promise.all(
          places
            .filter((p) => Boolean(p.location))
            .map(async (p) => {
              let openNow: boolean | null = null;
              try {
                if (typeof p.isOpen === 'function') {
                  const res = await p.isOpen();
                  openNow = typeof res === 'boolean' ? res : null;
                }
              } catch {
                openNow = null;
              }

              const loc = p.location!;
              const lat =
                typeof loc.lat === 'function' ? loc.lat() : (loc as unknown as { lat: number }).lat;
              const lng =
                typeof loc.lng === 'function' ? loc.lng() : (loc as unknown as { lng: number }).lng;

              let photoUri: string | undefined;
              let photoAttribution: string | undefined;
              try {
                const firstPhoto = p.photos?.[0];
                if (firstPhoto && typeof firstPhoto.getURI === 'function') {
                  photoUri = firstPhoto.getURI({ maxWidth: 640 });
                  photoAttribution = firstPhoto.authorAttributions?.[0]?.displayName ?? undefined;
                }
              } catch {
                photoUri = undefined;
              }

              return {
                id: p.id || `${lat}-${lng}-${p.displayName || 'shop'}`,
                name: p.displayName || 'Tailor Shop',
                address: p.formattedAddress || 'Address unavailable on Google Maps',
                location: { lat, lng },
                rating: typeof p.rating === 'number' ? p.rating : null,
                userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
                businessStatus: p.businessStatus ? String(p.businessStatus) : null,
                isOpenNow: openNow,
                openingHoursText: p.regularOpeningHours?.weekdayDescriptions ?? [],
                googleMapsURI: p.googleMapsURI ?? undefined,
                primaryType: p.primaryTypeDisplayName ?? undefined,
                photoUri,
                photoAttribution,
                phoneNumber: p.nationalPhoneNumber ?? undefined,
              };
            }),
        );

        setRawPlaces(mapped);
        setLastSyncedAt(
          new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        );

        if (mapped.length === 0) {
          setPlacesError(
            'No tailor shops returned by Google Maps in this area. Try expanding the radius or switching locality.',
          );
        }
      } catch (err: unknown) {
        if (notifyQuotaExceededIfApplicable(err)) {
          setPlacesError(
            'Google Maps Places quota reached. Please review your Maps billing or quota settings.',
          );
        } else {
          setPlacesError(
            'Could not load live tailor shops from Google Maps. Please check network or API key permissions.',
          );
        }
      } finally {
        setSearchingPlaces(false);
      }
    },
    [placesLib, rules.maxRadiusKm],
  );

  useEffect(() => {
    if (!placesLib) return;
    void fetchNearbyTailors(userLocation, rules.serviceType);
  }, [placesLib, userLocation, rules.serviceType, fetchNearbyTailors]);

  // --- Modern AutocompleteSuggestion with AutocompleteSessionToken ---
  useEffect(() => {
    if (!placesLib) return;
    const trimmed = locationQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['in'],
          locationBias: userLocation,
        });
        setSuggestions(res?.suggestions ?? []);
        setSuggestionsOpen(true);
      } catch (err: unknown) {
        notifyQuotaExceededIfApplicable(err);
        setSuggestions([]);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [placesLib, locationQuery, userLocation]);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion,
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      if (place.location) {
        const loc = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const label = place.displayName || place.formattedAddress || locationQuery;
        setUserLocation(loc);
        setLocationSource('search');
        setLocationQuery(label);
        setSuggestions([]);
        setSuggestionsOpen(false);
        setSelectedShopId(null);
        setBookingStep(1);
        onUpdateLocality(label);
        onNotifyToast(`Searching real-time tailor shops near ${label}`);
      }
    } catch (err: unknown) {
      notifyQuotaExceededIfApplicable(err);
      onNotifyToast('Unable to fetch coordinates for that location.');
    } finally {
      sessionTokenRef.current = null;
    }
  };

  // --- Real-Time GPS Geolocation (Explicit User Consent) ---
  const handleLocateOnce = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationSource('gps');
        setSelectedShopId(null);
        setBookingStep(1);
        onUpdateLocality(`Live GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        onNotifyToast('Locked onto your real-time GPS location! Finding nearest tailor shops...');
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. You can search any area or pick a Hyderabad zone below.'
            : 'Unable to determine your GPS position right now.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  };

  const handleToggleLiveTrack = () => {
    if (liveTracking) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLiveTracking(false);
      onNotifyToast('Live GPS tracking paused.');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsError(null);
    setLiveTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocationSource('gps');
      },
      () => {
        setLiveTracking(false);
        setGpsError('Live GPS tracking could not access your device location.');
      },
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    onNotifyToast('Live GPS tracking enabled — distances update as you move.');
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // --- Top-3 Broadcast & Auto Re-Route Countdown Timer ---
  useEffect(() => {
    if (dispatchStatus !== 'wave1' && dispatchStatus !== 'wave2') return;
    if (dispatchCountdown <= 0) {
      if (dispatchStatus === 'wave1') {
        if (wave2Shops.length > 0) {
          setDispatchStatus('wave2');
          setDispatchCountdown(rules.autoRerouteSeconds);
          onNotifyToast(
            `No response from Top ${rules.topKBroadcastCount} shops — auto re-routing to Wave 2 backup shops!`,
          );
        } else {
          setDispatchStatus('exhausted');
          onNotifyToast(
            'No remaining eligible shops in current radius. Try expanding the radius rule.',
          );
        }
      } else {
        setDispatchStatus('exhausted');
        onNotifyToast('Auto re-route window expired. Expand radius or relax rating filter.');
      }
      return;
    }

    const t = setTimeout(() => setDispatchCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [
    dispatchStatus,
    dispatchCountdown,
    wave2Shops.length,
    rules.autoRerouteSeconds,
    rules.topKBroadcastCount,
    onNotifyToast,
  ]);

  const handleStartTopKDispatch = () => {
    if (wave1Shops.length === 0) {
      onNotifyToast('No shops pass the active matching rules. Expand radius or adjust filters.');
      return;
    }
    setAcceptedShop(null);
    setDispatchStatus('wave1');
    setDispatchCountdown(rules.autoRerouteSeconds);
    setActiveRightTab('dispatch');
    onNotifyToast(
      `Broadcast sent to Top ${wave1Shops.length} rule-matched shops. Customer street address masked!`,
    );
  };

  const handleBookingComplete = (order: OrderRecord, bookedShop: EvaluatedTailorShop) => {
    onCreateOrder(order);
    setAcceptedShop(bookedShop);
    setDispatchStatus('accepted');
  };

  const handleSelectShopOnMap = (shop: EvaluatedTailorShop) => {
    setSelectedShopId(shop.place.id);
    if (bookingStep === 4) {
      setBookingStep(1);
    }
  };

  const handleStartBookingForShop = (shop: EvaluatedTailorShop, scrollToMap = false) => {
    setSelectedShopId(shop.place.id);
    setBookingStep(2);
    setActiveRightTab('shops');
    if (scrollToMap) {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFocusShopOnMap = (shop: EvaluatedTailorShop) => {
    setSelectedShopId(shop.place.id);
    if (bookingStep === 4) {
      setBookingStep(1);
    }
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTestTransitionGuard = (targetStage: OrderLifecycleStage) => {
    const result = validateOrderTransition(
      { stage: simOrderStage, quoteApproved: simQuoteApproved },
      targetStage,
    );
    setGuardFeedback(result);
    if (result.allowed) {
      setSimOrderStage(targetStage);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* SECTION 1: CINEMATIC CENTERED LUXURY HERO FOR REAL-TIME MAP DISCOVERY */}
      <section className="relative bg-[#0B1F3A] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none">
          <AnimatePresence mode="sync">
            <motion.div
              key={heroSceneIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <SafeImage
                src={HERO_BACKDROP_SCENES[heroSceneIdx]}
                alt=""
                className="w-full h-full object-cover object-center animate-ken-burns"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-[#071529]/84 via-[#0B1F3A]/75 to-[#0B1F3A]/96" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,114,133,0.22)_0%,transparent_68%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-11 sm:pt-14 sm:pb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <svg aria-hidden="true" viewBox="0 0 220 16" className="w-40 h-3.5 mb-2.5 opacity-85">
              <path
                d="M 4 8 Q 55 2, 110 8 T 216 8"
                fill="none"
                stroke="#E2B14B"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="animate-stitch-flow"
              />
            </svg>
            <p className="text-xs sm:text-[13px] font-medium tracking-wide text-[#5EEAD4]">
              Live Google Maps Discovery · Real-Time Road ETA · Instant Pickup &amp; Studio Booking
            </p>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif-accent text-3xl sm:text-5xl font-bold leading-[1.13] tracking-[-0.01em] text-balance mt-2.5 max-w-3xl mx-auto"
          >
            Find the Nearest Tailor Shop in Real Time
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base text-white/80 mt-3 max-w-2xl mx-auto leading-relaxed"
          >
            Pinpoint verified boutiques around your live GPS or neighborhood, compare road routes
            and opening hours, and book your doorstep pickup or shop appointment in one flow.
          </motion.p>

          {/* CENTERED FLOATING LOCATION SEARCH & LIVE GPS BAR */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-4xl mx-auto relative"
          >
            <div className="bg-white rounded-2xl p-2 shadow-2xl ring-1 ring-white/25 flex flex-col md:flex-row items-stretch md:items-center gap-1.5">
              {/* Places Autocomplete Input */}
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-[#0B7285] absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                  placeholder="Search street, landmark, apartment, or pincode via Google Places..."
                  className="w-full pl-11 pr-9 py-3 rounded-xl text-sm text-[#0B1F3A] placeholder:text-[#64748B] focus:outline-none"
                />
                {locationQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationQuery('');
                      setSuggestions([]);
                      setSuggestionsOpen(false);
                    }}
                    aria-label="Clear location search"
                    className="absolute right-2.5 p-1 text-[#64748B] hover:text-[#0B1F3A] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="hidden md:block w-px h-8 bg-[#E2E8F0]" aria-hidden="true" />

              {/* Radius Quick Selector */}
              <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-xl p-1 shrink-0">
                {[3, 5, 8, 10].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setRules((r) => ({ ...r, maxRadiusKm: km }))}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums whitespace-nowrap ${
                      rules.maxRadiusKm === km
                        ? 'bg-[#0B1F3A] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#0B1F3A]'
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>

              {/* Live GPS CTA */}
              <button
                type="button"
                onClick={handleLocateOnce}
                disabled={gpsLoading}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-sm font-semibold transition-colors shrink-0 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                {gpsLoading ? 'Locating...' : 'Use Live GPS'}
              </button>
            </div>

            {/* Places Autocomplete Dropdown */}
            {suggestionsOpen && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl z-40 max-h-64 overflow-y-auto divide-y divide-[#F1F5F9] text-left">
                {suggestions.map((sug, idx) => (
                  <li key={`${sug.placePrediction?.placeId ?? idx}`}>
                    <button
                      type="button"
                      onClick={() => void handleSelectSuggestion(sug)}
                      className="w-full text-left px-4 py-3 text-xs sm:text-sm text-[#0B1F3A] hover:bg-[#F0F9FA] hover:text-[#0B7285] flex items-center gap-2.5 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-[#0B7285] shrink-0" />
                      <span className="truncate">{sug.placePrediction?.text.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* CENTERED SPECIALTY FILTER TABS */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {SPECIALTY_TABS.map((tab) => {
              const active = rules.serviceType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRules((r) => ({ ...r, serviceType: tab.id }))}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#C8922A] border-[#C8922A] text-white shadow-sm'
                      : 'bg-white/10 border-white/15 text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-xs'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* CENTERED QUICK HYDERABAD ZONES + LIVE TRACK TOGGLE */}
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs">
            <span className="text-white/65 font-medium">Quick zones:</span>
            {HYDERABAD_ZONES.map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => {
                  setUserLocation(z.center);
                  setLocationSource('zone');
                  setSelectedShopId(null);
                  setBookingStep(1);
                  onUpdateLocality(z.label);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  locality === z.label
                    ? 'bg-white text-[#0B1F3A]'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                {z.label.split(',')[0]}
              </button>
            ))}

            <span className="text-white/25 hidden sm:inline" aria-hidden="true">
              |
            </span>

            <button
              type="button"
              onClick={handleToggleLiveTrack}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                liveTracking
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                  : 'text-[#5EEAD4] hover:text-white hover:bg-white/10'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${liveTracking ? 'animate-pulse' : ''}`} />
              {liveTracking ? 'Live Tracking ON' : 'Enable Live Track'}
            </button>

            <button
              type="button"
              onClick={() => void fetchNearbyTailors(userLocation, rules.serviceType)}
              disabled={searchingPlaces}
              className="inline-flex items-center gap-1 text-white/80 hover:text-white px-2 py-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${searchingPlaces ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {gpsError && (
            <div className="mt-4 max-w-xl mx-auto flex items-center justify-center gap-2 text-xs text-amber-100 bg-amber-500/20 border border-amber-300/35 rounded-xl px-3.5 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: REAL-TIME GOOGLE MAP + SELECTED SHOP SPOTLIGHT + LIVE WORKBENCH */}
      <section
        ref={mapSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 sm:pt-9 space-y-6"
      >
        {/* Clean Live Status Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-[#475569]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
            <span className="font-semibold text-[#0B1F3A]">{locality}</span>
            <span className="text-[#CBD5E1]" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-[#0B7285]">
              {eligibleShops.length} rule-matched / {evaluatedShops.length} live shops
            </span>
            <span className="text-[#CBD5E1]" aria-hidden="true">
              ·
            </span>
            <span>Radius: {rules.maxRadiusKm} km</span>
            {lastSyncedAt && (
              <>
                <span className="text-[#CBD5E1] hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline text-[#64748B]">Synced {lastSyncedAt}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartTopKDispatch}
            disabled={wave1Shops.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] disabled:bg-[#CBD5E1] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
            Auto-Broadcast Top {rules.topKBroadcastCount} Shops
          </button>
        </div>

        {/* INTERACTIVE 3-STEP MAP BOOKING PROGRESS BAR */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
            {(
              [
                {
                  num: 1 as MapBookingStep,
                  title: '1. Select Shop',
                  sub: selectedShop ? selectedShop.place.name : 'Tap any map marker',
                  enabled: true,
                },
                {
                  num: 2 as MapBookingStep,
                  title: '2. Choose Service',
                  sub: selectedShop ? 'Stitching & pickup mode' : 'Select a shop first',
                  enabled: Boolean(selectedShop),
                },
                {
                  num: 3 as MapBookingStep,
                  title: '3. Schedule',
                  sub:
                    bookingStep === 4
                      ? 'Appointment confirmed'
                      : 'Date, slot & confirm',
                  enabled: Boolean(selectedShop),
                },
              ] as const
            ).map((s) => {
              const isCompleted =
                bookingStep === 4 ||
                (s.num === 1 && Boolean(selectedShop) && bookingStep >= 2) ||
                bookingStep > s.num;
              const isActive = bookingStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={!s.enabled}
                  onClick={() => {
                    if (s.enabled) setBookingStep(s.num);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'border-[#0B7285] bg-[#F0F9FA] shadow-2xs cursor-pointer'
                      : isCompleted
                        ? 'border-[#CBE7EC] bg-white hover:border-[#0B7285] cursor-pointer'
                        : s.enabled
                          ? 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] cursor-pointer'
                          : 'border-[#F1F5F9] bg-[#F8FAFC] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                      isCompleted
                        ? 'bg-[#0B7285] text-white'
                        : isActive
                          ? 'bg-[#0B1F3A] text-white'
                          : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-bold truncate ${
                        isActive ? 'text-[#0B1F3A]' : 'text-[#334155]'
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="block text-[11px] text-[#64748B] truncate">{s.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedShop && bookingStep === 1 && (
            <button
              type="button"
              onClick={() => handleStartBookingForShop(selectedShop)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
            >
              Continue with {selectedShop.place.name.split(' ').slice(0, 2).join(' ')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {bookingStep >= 2 && (
            <button
              type="button"
              onClick={() => setBookingStep(1)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] hover:border-[#0B7285] text-xs font-semibold text-[#0B1F3A] hover:text-[#0B7285] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              Browse All Shops
            </button>
          )}
        </div>

        {/* Main Split Workspace: Interactive Google Map (Left) + Inline Booking / Workbench (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Real-Time Map + Selected Shop Action Spotlight */}
          <div className="lg:col-span-7 space-y-4">
            {/* Explicit CSS height container to guarantee zero map collapse */}
            <div className="relative w-full h-[390px] sm:h-[480px] lg:h-[560px] rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-md bg-[#F1F5F9]">
              <GoogleMap
                defaultCenter={HYDERABAD_ZONES[0].center}
                defaultZoom={13}
                mapId="DEMO_MAP_ID"
                gestureHandling="greedy"
                streetViewControl={false}
                mapTypeControl={false}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <MapCameraController center={userLocation} radiusKm={rules.maxRadiusKm} />
                <ServiceRadiusCircle center={userLocation} radiusKm={rules.maxRadiusKm} />
                <LiveRoutePolyline
                  origin={userLocation}
                  selectedShop={selectedShop}
                  travelMode={travelMode}
                  onRouteCalculated={setRouteSummary}
                  onRouteLoading={setRouteLoading}
                  onRouteError={setRouteError}
                />

                {/* Customer Real-Time Position Pin */}
                <AdvancedMarker
                  position={userLocation}
                  title={locationSource === 'gps' ? 'Your Real-Time GPS Location' : locality}
                  zIndex={100}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-8 h-8 rounded-full bg-[#0B7285]/25 animate-ping" />
                    <span className="relative w-4 h-4 rounded-full bg-[#0B1F3A] border-2 border-white shadow-md" />
                  </div>
                </AdvancedMarker>

                {/* Live Google Places Shop Markers */}
                {evaluatedShops.map((shop) => (
                  <ShopAdvancedMarker
                    key={shop.place.id}
                    shop={shop}
                    isSelected={selectedShopId === shop.place.id}
                    routeSummary={routeSummary}
                    onSelect={handleSelectShopOnMap}
                    onCloseInfo={() => {
                      setSelectedShopId(null);
                      setBookingStep(1);
                    }}
                    onInspectShop={(s) => setDetailModalShop(s)}
                    onBookShop={(s) => handleStartBookingForShop(s)}
                  />
                ))}
              </GoogleMap>

              {/* Map Legend Overlay */}
              <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-[#E2E8F0] rounded-xl px-3 py-2 shadow-md flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#334155]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B1F3A]" /> You
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B7285]" /> Top{' '}
                  {rules.topKBroadcastCount} Match
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8922A]" /> Backup Queue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" /> Rule Excluded
                </span>
              </div>

              {searchingPlaces && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-[#0B1F3A]/95 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5EEAD4]" />
                  Scanning live tailor shops on Google Maps...
                </div>
              )}
            </div>

            {/* SELECTED SHOP ACTION SPOTLIGHT & LIVE ROUTE BAR */}
            <AnimatePresence mode="wait">
              {selectedShop ? (
                <motion.div
                  key={selectedShop.place.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-white rounded-2xl border border-[#0B7285]/40 shadow-md overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="w-full sm:w-28 h-32 sm:h-24 rounded-xl overflow-hidden bg-[#F1F5F9] shrink-0">
                      <SafeImage
                        src={
                          selectedShop.place.photoUri || getShopFallbackImage(selectedShop.place.id)
                        }
                        alt={selectedShop.place.name}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        {selectedShop.rank !== null && (
                          <span className="font-bold text-[#0B7285] tabular-nums">
                            #{selectedShop.rank} Best Match · Score {selectedShop.matchScore}/100
                          </span>
                        )}
                        {selectedShop.place.isOpenNow !== null && (
                          <>
                            <span className="text-[#CBD5E1]">·</span>
                            <span
                              className={`font-semibold ${
                                selectedShop.place.isOpenNow ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {selectedShop.place.isOpenNow ? 'Open Now' : 'Closed'}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-serif-accent text-lg font-bold text-[#0B1F3A] truncate">
                        {selectedShop.place.name}
                      </h3>

                      <p className="text-xs text-[#475569] line-clamp-1">
                        {selectedShop.place.address}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                        {selectedShop.place.rating !== null && (
                          <span className="inline-flex items-center gap-1 font-bold text-[#0B1F3A]">
                            <Star className="w-3.5 h-3.5 fill-[#C8922A] text-[#C8922A]" />
                            {selectedShop.place.rating.toFixed(1)} (
                            {selectedShop.place.userRatingCount})
                          </span>
                        )}
                        <span className="text-[#CBD5E1]">·</span>
                        {routeLoading ? (
                          <span className="text-[#64748B]">Computing road route &amp; ETA...</span>
                        ) : routeSummary && routeSummary.shopId === selectedShop.place.id ? (
                          <span className="font-semibold text-[#0B7285]">
                            {(routeSummary.distanceMeters / 1000).toFixed(2)} km road route ·{' '}
                            {formatDurationMinutes(routeSummary.durationMillis)} ETA
                          </span>
                        ) : (
                          <span className="text-[#64748B]">
                            {routeError || `${selectedShop.distanceKm.toFixed(2)} km away`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Control Strip: Travel Mode + Direct Appointment Actions */}
                  <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center bg-white border border-[#E2E8F0] p-0.5 rounded-xl">
                      {(
                        [
                          { id: 'DRIVING', label: 'Car', icon: Car },
                          { id: 'TWO_WHEELER', label: '2-Wheeler', icon: Bike },
                          { id: 'WALKING', label: 'Walk', icon: Footprints },
                        ] as const
                      ).map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setTravelMode(m.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                              travelMode === m.id
                                ? 'bg-[#0B1F3A] text-white'
                                : 'text-[#475569] hover:text-[#0B1F3A]'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailModalShop(selectedShop)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:border-[#0B7285] text-xs font-semibold text-[#0B1F3A] hover:text-[#0B7285] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details &amp; Hours
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartBookingForShop(selectedShop)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {bookingStep === 1
                          ? 'Choose Service & Book'
                          : bookingStep === 2
                            ? 'Selecting Service (Step 2)'
                            : bookingStep === 3
                              ? 'Scheduling Slot (Step 3)'
                              : 'Book Again'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] flex items-center justify-center shrink-0">
                      <RouteIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#0B1F3A]">
                        Click any shop pin on the map to preview route, hours &amp; instant booking
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Live Google Maps Routes API · Active radius: {rules.maxRadiusKm} km
                      </p>
                    </div>
                  </div>

                  {eligibleShops[0] && (
                    <button
                      type="button"
                      onClick={() => setSelectedShopId(eligibleShops[0].place.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                    >
                      Select #1 Nearest Shop
                    </button>
                  )}
                </div>
              )}
            </AnimatePresence>

            {/* Google Maps End User Disclosure & Privacy Notice */}
            <p className="text-[11px] text-[#64748B] px-1 leading-relaxed">
              Location data is accessed only with your consent to rank nearby tailor shops in real
              time. Map tiles, place search, and routing are provided by Google Maps Platform
              subject to the{' '}
              <a
                href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#0B7285]"
              >
                Google Maps/Google Earth Additional Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#0B7285]"
              >
                Google Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* RIGHT COLUMN: Inline 3-Step Map Booking Flow OR Ranked Live Shops / Rules / Dispatch */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            {bookingStep >= 2 && selectedShop ? (
              <MapBookingFlowPanel
                step={bookingStep}
                selectedShop={selectedShop}
                routeSummary={routeSummary}
                locality={locality}
                rules={rules}
                defaultAddress={sampleCustomerAddress}
                onChangeStep={setBookingStep}
                onInspectShop={(s) => setDetailModalShop(s)}
                onConfirmOrder={handleBookingComplete}
                onNotifyToast={onNotifyToast}
                onResetFlow={() => {
                  setBookingStep(1);
                  setSelectedShopId(null);
                }}
              />
            ) : (
              <>
                {/* Tab Header */}
                <div className="grid grid-cols-3 border-b border-[#E2E8F0] bg-[#F8FAFC] p-1.5 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('shops')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeRightTab === 'shops'
                        ? 'bg-[#0B1F3A] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#0B1F3A]'
                    }`}
                  >
                    Nearest ({eligibleShops.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('rules')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                      activeRightTab === 'rules'
                        ? 'bg-[#0B1F3A] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#0B1F3A]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Rules Engine
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('dispatch')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                      activeRightTab === 'dispatch'
                        ? 'bg-[#0B1F3A] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#0B1F3A]'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Top-{rules.topKBroadcastCount} Dispatch
                  </button>
                </div>

                {/* TAB 1: LIVE RANKED SHOPS */}
                {activeRightTab === 'shops' && (
                  <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto">
                    {placesError && (
                      <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3 text-xs text-[#991B1B]">
                        {placesError}
                      </div>
                    )}

                {evaluatedShops.length === 0 && !searchingPlaces && !placesError && (
                  <div className="text-center py-10 text-xs text-[#64748B]">
                    No tailor shops loaded yet. Click Refresh or choose a locality above.
                  </div>
                )}

                {evaluatedShops.map((shop) => {
                  const isSelected = selectedShopId === shop.place.id;
                  const thumbSrc = shop.place.photoUri || getShopFallbackImage(shop.place.id);
                  return (
                    <div
                      key={shop.place.id}
                      onClick={() => setSelectedShopId(shop.place.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedShopId(shop.place.id);
                      }}
                      className={`rounded-xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0B7285] bg-[#F0F9FA]/70 shadow-sm'
                          : shop.eligible
                            ? 'border-[#E2E8F0] bg-white hover:border-[#0B7285]/45'
                            : 'border-[#E2E8F0] bg-[#F8FAFC] opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F1F5F9] shrink-0 border border-[#E2E8F0]">
                          <SafeImage
                            src={thumbSrc}
                            alt={shop.place.name}
                            className="w-full h-full object-cover object-center"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                            <span
                              className={`font-bold ${
                                shop.rank !== null
                                  ? shop.dispatchWave === 1
                                    ? 'text-[#0B7285]'
                                    : 'text-[#A67418]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              {shop.rank !== null
                                ? `#${shop.rank} · Score ${shop.matchScore}`
                                : 'Rule Excluded'}
                            </span>
                            <span className="font-bold text-[#0B1F3A]">
                              {shop.distanceKm.toFixed(2)} km
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-[#0B1F3A] truncate mt-0.5">
                            {shop.place.name}
                          </h3>

                          <p className="text-[11px] text-[#64748B] truncate">{shop.place.address}</p>

                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 tabular-nums text-[#475569]">
                              <span className="inline-flex items-center gap-0.5 font-bold text-[#0B1F3A]">
                                <Star className="w-3 h-3 fill-[#C8922A] text-[#C8922A]" />
                                {shop.place.rating !== null ? shop.place.rating.toFixed(1) : 'New'}
                              </span>
                              <span>({shop.place.userRatingCount})</span>
                              {shop.place.isOpenNow !== null && (
                                <>
                                  <span>·</span>
                                  <span
                                    className={
                                      shop.place.isOpenNow
                                        ? 'font-semibold text-emerald-700'
                                        : 'font-semibold text-rose-600'
                                    }
                                  >
                                    {shop.place.isOpenNow ? 'Open' : 'Closed'}
                                  </span>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartBookingForShop(shop);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0B1F3A] hover:bg-[#0B7285] text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
                            >
                              Select
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {shop.failedReasons.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#E2E8F0] space-y-0.5">
                          {shop.failedReasons.map((reason) => (
                            <p
                              key={reason}
                              className="text-[10.5px] font-semibold text-rose-700 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3 shrink-0" />
                              {reason}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: TAILERING MATCHING & OPERATING RULES ENGINE */}
            {activeRightTab === 'rules' && (
              <div className="p-4 space-y-4 max-h-[640px] overflow-y-auto">
                <div className="space-y-3">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0B7285]">
                    1. Hyperlocal Matching Rules
                  </h2>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#0B1F3A] mb-1">
                      <span>Max Service Radius (Pilot: 3–5 km)</span>
                      <span className="text-[#0B7285] tabular-nums">{rules.maxRadiusKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      step={1}
                      value={rules.maxRadiusKm}
                      onChange={(e) =>
                        setRules((r) => ({ ...r, maxRadiusKm: Number(e.target.value) }))
                      }
                      className="w-full accent-[#0B7285]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#0B1F3A] mb-1">
                      <span>Minimum Google Rating Gate</span>
                      <span className="text-[#0B7285] tabular-nums">
                        {rules.minRating === 0 ? 'Any' : `${rules.minRating.toFixed(1)}★`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0, 3.5, 4.0, 4.5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRules((r) => ({ ...r, minRating: val }))}
                          className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            rules.minRating === val
                              ? 'bg-[#F0F9FA] border-[#0B7285] text-[#0B7285]'
                              : 'bg-white border-[#E2E8F0] text-[#475569]'
                          }`}
                        >
                          {val === 0 ? 'Any' : `${val.toFixed(1)}★+`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#0B1F3A]">Require &quot;Open Now&quot;</p>
                      <p className="text-[10.5px] text-[#64748B]">
                        Exclude closed shops using real-time Google hours
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={rules.requireOpenNow}
                      onChange={(e) =>
                        setRules((r) => ({ ...r, requireOpenNow: e.target.checked }))
                      }
                      className="w-4 h-4 accent-[#0B7285]"
                    />
                  </label>

                  <label className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#0B1F3A]">
                        Mask Customer Address Until Accepted
                      </p>
                      <p className="text-[10.5px] text-[#64748B]">
                        Privacy rule: hide flat/street until a tailor accepts
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={rules.maskAddressUntilAccepted}
                      onChange={(e) =>
                        setRules((r) => ({ ...r, maskAddressUntilAccepted: e.target.checked }))
                      }
                      className="w-4 h-4 accent-[#0B7285]"
                    />
                  </label>
                </div>

                {/* Rule Group 2: Home Visit Fee & Minimum Order Waiver */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0B7285]">
                    2. Home Visit Fee &amp; Waiver Rule (₹49–₹99)
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-[#64748B] mb-1">
                        Simulated Order Value (₹)
                      </label>
                      <input
                        type="number"
                        min={100}
                        step={50}
                        value={estimatedOrderInr}
                        onChange={(e) => setEstimatedOrderInr(Math.max(0, Number(e.target.value)))}
                        className="w-full border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B1F3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-[#64748B] mb-1">
                        Free Visit Threshold (₹)
                      </label>
                      <input
                        type="number"
                        min={200}
                        step={100}
                        value={rules.minOrderForFreeVisitInr}
                        onChange={(e) =>
                          setRules((r) => ({
                            ...r,
                            minOrderForFreeVisitInr: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className="w-full border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B1F3A]"
                      />
                    </div>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                      visitFeeEval.creditedBack
                        ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                        : 'bg-[#FBF5E6] text-[#926515] border border-[#F0DFA8]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{visitFeeEval.explanation}</span>
                  </div>
                </div>

                {/* Rule Group 3: Strict Order Lifecycle Transition Guard Tester */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0B7285]">
                    3. Order Transition Rule Guard
                  </h2>
                  <p className="text-[11px] text-[#475569]">
                    Test Tailering&apos;s hard rule: stitching <strong>cannot</strong> start before
                    explicit customer quote approval.
                  </p>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B] font-semibold">Current Stage:</span>
                      <span className="font-bold text-[#0B7285]">{simOrderStage}</span>
                    </div>

                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="font-bold text-[#0B1F3A]">
                        Customer Approved Final Quote?
                      </span>
                      <input
                        type="checkbox"
                        checked={simQuoteApproved}
                        onChange={(e) => {
                          setSimQuoteApproved(e.target.checked);
                          setGuardFeedback(null);
                        }}
                        className="w-4 h-4 accent-[#059669]"
                      />
                    </label>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleTestTransitionGuard('Customer Approved')}
                        className="text-[11px] font-bold bg-white border border-[#CBD5E1] hover:border-[#0B7285] text-[#0B1F3A] px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Try: Customer Approved
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestTransitionGuard('Stitching Started')}
                        className="text-[11px] font-bold bg-[#0B1F3A] hover:bg-[#15325B] text-white px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Try: Start Stitching
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSimOrderStage('Quotation Submitted');
                          setSimQuoteApproved(false);
                          setGuardFeedback(null);
                        }}
                        className="text-[11px] font-semibold text-[#64748B] hover:text-[#0B1F3A] px-2 py-1.5 cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    {guardFeedback && (
                      <div
                        className={`rounded-lg p-2.5 text-[11px] font-semibold flex items-start gap-2 ${
                          guardFeedback.allowed
                            ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                        }`}
                      >
                        {guardFeedback.allowed ? (
                          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{guardFeedback.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRules(DEFAULT_MATCHING_RULES);
                    onNotifyToast(
                      'Matching & operating rules reset to Tailering Hyderabad defaults.',
                    );
                  }}
                  className="w-full text-xs font-bold text-[#475569] hover:text-[#0B7285] py-2 border border-[#E2E8F0] rounded-xl cursor-pointer transition-colors"
                >
                  Reset Rules to Pilot Defaults (5 km, 4.0★)
                </button>
              </div>
            )}

            {/* TAB 3: TOP-3 REQUEST ROUTING & AUTO RE-ROUTE SIMULATOR */}
            {activeRightTab === 'dispatch' && (
              <div className="p-4 space-y-4 max-h-[640px] overflow-y-auto">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                      {privacyAddressPreview.isMasked ? (
                        <Lock className="w-3.5 h-3.5 text-[#0B7285]" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-[#059669]" />
                      )}
                      Tailor-Visible Address (Privacy Rule)
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        privacyAddressPreview.isMasked ? 'text-[#0B7285]' : 'text-[#047857]'
                      }`}
                    >
                      {privacyAddressPreview.isMasked ? 'Masked' : 'Unlocked'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#0B1F3A]">
                    {privacyAddressPreview.visibleAddress}
                  </p>
                  <input
                    type="text"
                    value={sampleCustomerAddress}
                    onChange={(e) => setSampleCustomerAddress(e.target.value)}
                    aria-label="Customer street address"
                    className="w-full text-[11px] bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[#334155]"
                  />
                </div>

                {dispatchStatus === 'idle' && (
                  <div className="bg-[#F0F9FA] border border-[#CBE7EC] rounded-xl p-4 text-center space-y-2.5">
                    <p className="text-sm font-bold text-[#0B1F3A] font-serif-accent">
                      Ready to Route to Top {Math.min(rules.topKBroadcastCount, wave1Shops.length)}{' '}
                      Eligible Shops
                    </p>
                    <p className="text-xs text-[#475569]">
                      Tailering broadcasts to the highest-ranked shops inside {rules.maxRadiusKm} km
                      and automatically re-routes to Wave 2 ({wave2Shops.length} backup shops) if no
                      one accepts within {rules.autoRerouteSeconds}s.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartTopKDispatch}
                      disabled={wave1Shops.length === 0}
                      className="w-full bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      Start Real-Time Top-{rules.topKBroadcastCount} Broadcast
                    </button>
                  </div>
                )}

                {(dispatchStatus === 'wave1' || dispatchStatus === 'wave2') && (
                  <div className="space-y-3">
                    <div className="bg-[#0B1F3A] text-white rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-extrabold text-[#E2B14B]">
                          {dispatchStatus === 'wave1'
                            ? `WAVE 1: BROADCASTING TO TOP ${wave1Shops.length} SHOPS`
                            : `WAVE 2 AUTO RE-ROUTE: ${wave2Shops.length} BACKUP SHOPS`}
                        </p>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Auto re-route triggers if unaccepted when timer hits 0s
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg text-sm font-extrabold tabular-nums">
                        <Clock className="w-4 h-4 text-[#5EEAD4]" />
                        {dispatchCountdown}s
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(dispatchStatus === 'wave1' ? wave1Shops : wave2Shops).map((shop) => (
                        <div
                          key={shop.place.id}
                          className="rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between gap-2 bg-white"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-[#0B1F3A] truncate">
                              #{shop.rank} {shop.place.name}
                            </p>
                            <p className="text-[11px] text-[#64748B] tabular-nums">
                              {shop.distanceKm.toFixed(2)} km · Score {shop.matchScore}/100
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartBookingForShop(shop)}
                            className="bg-[#0B7285] hover:bg-[#085463] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer transition-colors"
                          >
                            Accept &amp; Schedule
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDispatchCountdown(0)}
                      className="w-full text-xs font-bold text-[#0B7285] border border-[#CBE7EC] bg-[#F0F9FA] py-2 rounded-xl cursor-pointer hover:bg-[#E2F4F7] transition-colors"
                    >
                      Simulate Timeout → Trigger Auto Re-Route Now
                    </button>
                  </div>
                )}

                {dispatchStatus === 'accepted' && acceptedShop && (
                  <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-[#047857]">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="text-sm font-extrabold">Appointment Booked &amp; Confirmed!</p>
                    </div>
                    <p className="text-xs text-[#065F46]">
                      <strong>{acceptedShop.place.name}</strong> (
                      {acceptedShop.distanceKm.toFixed(2)} km away) is assigned. Your booking is
                      live in <strong>Alterations → History</strong> and the Partner Portal.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDispatchStatus('idle');
                        setAcceptedShop(null);
                      }}
                      className="text-xs font-bold text-[#047857] underline cursor-pointer"
                    >
                      Run Another Dispatch
                    </button>
                  </div>
                )}

                {dispatchStatus === 'exhausted' && (
                  <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-2 text-center">
                    <p className="text-xs font-extrabold text-[#991B1B]">
                      All Eligible Shops Timed Out in {rules.maxRadiusKm} km Zone
                    </p>
                    <p className="text-[11px] text-[#7F1D1D]">
                      Expand the service radius rule to 8–10 km or lower the minimum rating filter
                      to discover additional nearby tailor shops.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRules((r) => ({ ...r, maxRadiusKm: Math.min(10, r.maxRadiusKm + 3) }));
                        setDispatchStatus('idle');
                      }}
                      className="bg-[#0B1F3A] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Expand Radius +3 km &amp; Retry
                    </button>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: CLEAN, VISUAL 3-COLUMN DIRECTORY OF LIVE MAP SHOPS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
          <div>
            <p className="text-xs font-semibold text-[#0B7285]">
              Real-Time Google Maps Directory · Ranked by Tailering Rules
            </p>
            <h2 className="font-serif-accent text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-0.5">
              All Discovered Tailor Shops Near {locality.split(',')[0]}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] tabular-nums">
            Showing <strong className="text-[#0B1F3A]">{evaluatedShops.length}</strong> live
            listings ({eligibleShops.length} eligible within {rules.maxRadiusKm} km)
          </p>
        </div>

        {evaluatedShops.length === 0 ? (
          <div className="mt-8 bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center max-w-xl mx-auto">
            <Scissors className="w-8 h-8 text-[#0B7285] mx-auto mb-3" />
            <h3 className="font-serif-accent text-xl font-bold text-[#0B1F3A]">
              {searchingPlaces ? 'Scanning nearby tailor shops...' : 'No live shops loaded yet'}
            </h3>
            <p className="text-sm text-[#475569] mt-1.5">
              {placesError ||
                'Search a neighborhood above, pick one of the quick zones, or click Use Live GPS.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {evaluatedShops.map((shop, idx) => {
              const isSelected = selectedShopId === shop.place.id;
              const coverSrc = shop.place.photoUri || getShopFallbackImage(shop.place.id);
              const isLiveRoute = routeSummary && routeSummary.shopId === shop.place.id;

              return (
                <motion.article
                  key={shop.place.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(idx * 0.035, 0.25),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`group bg-white rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'border-[#0B7285] ring-1 ring-[#0B7285]/30 shadow-lg'
                      : shop.eligible
                        ? 'border-[#E2E8F0] hover:shadow-lg hover:border-[#CBD5E1]'
                        : 'border-[#E2E8F0] opacity-80'
                  }`}
                >
                  <div>
                    {/* Visual Shop Cover Photo Header */}
                    <div
                      onClick={() => setDetailModalShop(shop)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailModalShop(shop);
                        }
                      }}
                      className="relative h-40 bg-[#0B1F3A] overflow-hidden cursor-pointer"
                    >
                      <SafeImage
                        src={coverSrc}
                        alt={shop.place.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/95 via-[#0B1F3A]/35 to-[#0B1F3A]/20" />

                      {/* Top Clean Metrics Row */}
                      <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between text-xs text-white tabular-nums">
                        <span className="inline-flex items-center gap-1.5 bg-[#0B1F3A]/75 backdrop-blur-xs px-2.5 py-1 rounded-lg font-semibold">
                          <Star className="w-3.5 h-3.5 fill-[#E2B14B] text-[#E2B14B]" />
                          {shop.place.rating !== null ? shop.place.rating.toFixed(1) : 'New'}
                          <span className="text-white/70 font-normal">
                            ({shop.place.userRatingCount})
                          </span>
                          <span className="text-white/35">·</span>
                          <span>{shop.distanceKm.toFixed(2)} km</span>
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold backdrop-blur-xs ${
                            shop.rank !== null
                              ? shop.dispatchWave === 1
                                ? 'bg-[#0B7285]/90 text-white'
                                : 'bg-[#C8922A]/90 text-white'
                              : 'bg-[#0B1F3A]/80 text-slate-300'
                          }`}
                        >
                          {shop.rank !== null ? `#${shop.rank} Match` : 'Filtered'}
                        </span>
                      </div>

                      {/* Bottom Shop Name & Address */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="font-serif-accent text-lg font-bold text-white leading-snug truncate">
                          {shop.place.name}
                        </h3>
                        <p className="text-xs text-white/80 mt-0.5 truncate">
                          {shop.place.address}
                        </p>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* Zero-pill status line */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums">
                        {shop.place.isOpenNow !== null && (
                          <span
                            className={`font-semibold ${
                              shop.place.isOpenNow ? 'text-[#0B7285]' : 'text-rose-700'
                            }`}
                          >
                            {shop.place.isOpenNow ? 'Open Now' : 'Currently Closed'}
                          </span>
                        )}
                        {shop.place.isOpenNow !== null && (
                          <span className="text-[#CBD5E1]" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <span className="font-semibold text-[#0B1F3A]">
                          Score {shop.matchScore}/100
                        </span>
                        <span className="text-[#CBD5E1]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#64748B]">
                          {isLiveRoute
                            ? `~${formatDurationMinutes(routeSummary.durationMillis)} ETA`
                            : shop.dispatchWave === 1
                              ? 'Wave 1 Priority'
                              : shop.dispatchWave === 2
                                ? 'Wave 2 Backup'
                                : 'Outside Rules'}
                        </span>
                      </div>

                      {/* Rule Breakdown or Exclusion Reasons */}
                      {shop.failedReasons.length > 0 ? (
                        <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                          {shop.failedReasons.map((reason) => (
                            <p
                              key={reason}
                              className="text-xs font-medium text-rose-700 flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              {reason}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-2.5 border-t border-[#E2E8F0] grid grid-cols-4 gap-1.5 text-center text-[11px] tabular-nums">
                          <div>
                            <span className="text-[#64748B] block">Dist</span>
                            <span className="font-bold text-[#0B1F3A]">
                              {shop.scoreBreakdown.proximity}/45
                            </span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block">Rating</span>
                            <span className="font-bold text-[#0B1F3A]">
                              {shop.scoreBreakdown.rating}/30
                            </span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block">Trust</span>
                            <span className="font-bold text-[#0B1F3A]">
                              {shop.scoreBreakdown.trustVolume}/15
                            </span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block">Avail</span>
                            <span className="font-bold text-[#0B1F3A]">
                              {shop.scoreBreakdown.availability}/10
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Action Footer */}
                  <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFocusShopOnMap(shop)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold border border-[#CBD5E1] bg-white text-[#334155] hover:border-[#0B7285] hover:text-[#0B7285] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <RouteIcon className="w-3.5 h-3.5" />
                        Route
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailModalShop(shop)}
                        className="px-2.5 py-2 rounded-lg text-xs font-semibold border border-[#CBD5E1] bg-white text-[#0B1F3A] hover:border-[#0B7285] hover:text-[#0B7285] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Details
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartBookingForShop(shop, true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      Book &amp; Schedule
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* LIVE MAP SHOP DETAIL MODAL */}
      <MapShopDetailModal
        shop={detailModalShop}
        routeSummary={routeSummary}
        onClose={() => setDetailModalShop(null)}
        onBookShop={(shop) => {
          setDetailModalShop(null);
          handleStartBookingForShop(shop, true);
        }}
      />
    </div>
  );
};

export const NearbyShopsPage: React.FC<NearbyShopsPageProps> = (props) => {
  const [rules, setRules] = useState<MatchingRulesConfig>(DEFAULT_MATCHING_RULES);

  if (!MAPS_API_KEY) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#0B7285] mx-auto" />
          <h1 className="text-xl font-bold text-[#0B1F3A] font-serif-accent">
            Google Maps API Key Not Configured
          </h1>
          <p className="text-xs sm:text-sm text-[#475569]">
            Configure{' '}
            <code className="bg-[#F0F9FA] text-[#0B7285] px-1.5 py-0.5 rounded font-mono">
              VITE_GOOGLE_MAPS_API_KEY
            </code>{' '}
            in your environment to enable real-time nearby tailor discovery and live routing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      language="en"
      region="IN"
      libraries={['places', 'marker', 'routes']}
    >
      <NearbyShopsWorkbench {...props} rules={rules} setRules={setRules} />
    </APIProvider>
  );
};
