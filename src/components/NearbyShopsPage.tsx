import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertCircle,
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Footprints,
  Lock,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Unlock,
  XCircle,
} from 'lucide-react';
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

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

const HYDERABAD_ZONES: { label: string; center: { lat: number; lng: number } }[] = [
  { label: 'Alkapur Township, Manikonda', center: { lat: 17.3984, lng: 78.3746 } },
  { label: 'Gachibowli, Hyderabad', center: { lat: 17.4401, lng: 78.3489 } },
  { label: 'Kondapur, Hyderabad', center: { lat: 17.4622, lng: 78.3568 } },
  { label: 'Jubilee Hills, Hyderabad', center: { lat: 17.4326, lng: 78.4071 } },
  { label: 'Madhapur, Hyderabad', center: { lat: 17.4483, lng: 78.3915 } },
];

type TravelModeOption = 'DRIVING' | 'TWO_WHEELER' | 'WALKING';

interface RouteSummary {
  shopId: string;
  shopName: string;
  distanceMeters: number;
  durationMillis: number;
  travelMode: TravelModeOption;
}

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
      strokeColor: '#EA580C',
      strokeOpacity: 0.65,
      strokeWeight: 2,
      fillColor: '#F97316',
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
  onRouteCalculated: (summary: RouteSummary | null) => void;
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
    // Cleanup prior polylines
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
    const routeCtor = (routesLib as unknown as { Route?: { computeRoutes: (req: unknown) => Promise<{ routes?: unknown[] }> } }).Route;
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
              strokeColor: '#EA580C',
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
          durationMillis: primaryRoute.durationMillis ?? Math.round((selectedShop.distanceKm / 22) * 3600000),
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
  routeSummary: RouteSummary | null;
  onSelect: (shop: EvaluatedTailorShop) => void;
  onCloseInfo: () => void;
  onRequestShop: (shop: EvaluatedTailorShop) => void;
}> = ({ shop, isSelected, routeSummary, onSelect, onCloseInfo, onRequestShop }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const isTopWave = shop.eligible && shop.dispatchWave === 1;
  const pinBg = !shop.eligible
    ? '#94A3B8'
    : isSelected
      ? '#1C1917'
      : isTopWave
        ? '#EA580C'
        : '#F59E0B';
  const pinBorder = !shop.eligible ? '#64748B' : isTopWave ? '#9A3412' : '#B45309';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={shop.place.location}
        title={shop.place.name}
        zIndex={isSelected ? 50 : isTopWave ? 30 : shop.eligible ? 20 : 10}
        onClick={() => onSelect(shop)}
      >
        <Pin
          background={pinBg}
          borderColor={pinBorder}
          glyphColor="#FFFFFF"
          scale={isSelected ? 1.25 : isTopWave ? 1.1 : 0.92}
        >
          <span className="text-[11px] font-extrabold">
            {shop.rank !== null ? `#${shop.rank}` : '×'}
          </span>
        </Pin>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={290} onCloseClick={onCloseInfo}>
          <div className="p-1 text-[#1C1917] space-y-2 font-sans">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold leading-snug text-[#1C1917]">
                  {shop.place.name}
                </p>
                <p className="text-[11px] text-[#57534E] leading-snug mt-0.5">
                  {shop.place.address}
                </p>
              </div>
              {shop.eligible ? (
                <span className="shrink-0 text-[10px] font-extrabold bg-[#ECFDF5] text-[#047857] px-1.5 py-0.5 rounded">
                  Score {shop.matchScore}
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-extrabold bg-[#FEF2F2] text-[#B91C1C] px-1.5 py-0.5 rounded">
                  Filtered
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#44403C]">
              {shop.place.rating !== null && (
                <span className="inline-flex items-center gap-0.5 font-bold">
                  <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
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
              <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg px-2.5 py-1.5 text-[11px] text-[#9A3412] flex items-center justify-between">
                <span className="font-bold">
                  Live Route: {(routeSummary.distanceMeters / 1000).toFixed(2)} km
                </span>
                <span className="font-extrabold">
                  ~{formatDurationMinutes(routeSummary.durationMillis)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {shop.eligible && (
                <button
                  type="button"
                  onClick={() => onRequestShop(shop)}
                  className="flex-1 bg-[#EA580C] hover:bg-[#C2410C] text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg cursor-pointer"
                >
                  Book Doorstep Visit
                </button>
              )}
              {shop.place.googleMapsURI && (
                <a
                  href={shop.place.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EA580C] hover:underline px-2 py-1.5"
                >
                  Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
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

  // Selected shop & Live Route
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelModeOption>('DRIVING');
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

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

  // Evaluate & rank live places against active StitchMate rules
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
          ],
          locationBias: {
            center,
            radius: Math.min(rules.maxRadiusKm * 1000 + 2000, 15000),
          },
          maxResultCount: 16,
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
              const lat = typeof loc.lat === 'function' ? loc.lat() : (loc as unknown as { lat: number }).lat;
              const lng = typeof loc.lng === 'function' ? loc.lng() : (loc as unknown as { lng: number }).lng;

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
          setPlacesError('No tailor shops returned by Google Maps in this area. Try expanding the radius or switching locality.');
        }
      } catch (err: unknown) {
        if (notifyQuotaExceededIfApplicable(err)) {
          setPlacesError('Google Maps Places quota reached. Please review your Maps billing or quota settings.');
        } else {
          setPlacesError('Could not load live tailor shops from Google Maps. Please check network or API key permissions.');
        }
      } finally {
        setSearchingPlaces(false);
      }
    },
    [placesLib, rules.maxRadiusKm],
  );

  // Trigger live Places fetch when Places library is ready, location changes, or service specialty changes
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
        onUpdateLocality(label);
        onNotifyToast(`Searching real-time tailor shops near ${label}`);
      }
    } catch (err: unknown) {
      notifyQuotaExceededIfApplicable(err);
      onNotifyToast('Unable to fetch coordinates for that location.');
    } finally {
      // CRITICAL: Always reset AutocompleteSessionToken after fetchFields
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

  // Toggle live continuous GPS watchPosition
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
          onNotifyToast('No remaining eligible shops in current radius. Try expanding the radius rule.');
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

  const handleAcceptOrderForShop = (shop: EvaluatedTailorShop) => {
    setAcceptedShop(shop);
    setDispatchStatus('accepted');
    const newOrder: OrderRecord = {
      id: `STM-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceTitle:
        rules.serviceType === 'all'
          ? 'Doorstep Tailoring & Measurement Visit'
          : `Custom ${rules.serviceType.replace('-', ' ')} Booking`,
      type: rules.serviceType === 'alterations' ? 'alteration' : 'custom',
      tailorName: shop.place.name,
      locality,
      createdAt: 'Just now (Live Map Match)',
      deliveryDate: 'In 5 days',
      amount: estimatedOrderInr + visitFeeEval.payableVisitFee,
      stage: 'Tailor Accepted',
      itemsSummary: `Matched via StitchMate Rules (Score ${shop.matchScore}/100 · ${shop.distanceKm.toFixed(2)} km)`,
      quoteApproved: false,
    };
    onCreateOrder(newOrder);
    onNotifyToast(
      `${shop.place.name} accepted (${newOrder.id})! Exact address unlocked & visit scheduled.`,
    );
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
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#EA580C] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1 rounded-full">
            <Compass className="w-3.5 h-3.5" />
            REAL-TIME GOOGLE MAPS + STITCHMATE MATCHING RULES
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight">
            Find the Nearest Tailor Shop in Real Time
          </h1>
          <p className="text-xs sm:text-sm text-[#57534E] mt-1 max-w-2xl">
            Live Google Maps shop discovery, real-time road routing &amp; ETA, and automated
            StitchMate matching rules (radius gate, quality threshold, Top-3 dispatch, auto
            re-route, address masking, and quote-approval guards).
          </p>
        </div>

        {/* Live GPS + Refresh Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLocateOnce}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            {gpsLoading ? 'Locating GPS...' : 'Use My Live GPS'}
          </button>

          <button
            type="button"
            onClick={handleToggleLiveTrack}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
              liveTracking
                ? 'bg-[#ECFDF5] border-[#6EE7B7] text-[#047857]'
                : 'bg-white border-[#E7DDD2] text-[#44403C] hover:border-[#EA580C] hover:text-[#EA580C]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${liveTracking ? 'animate-pulse text-[#059669]' : ''}`} />
            {liveTracking ? 'Live Tracking ON' : 'Live Track'}
          </button>

          <button
            type="button"
            onClick={() => void fetchNearbyTailors(userLocation, rules.serviceType)}
            disabled={searchingPlaces}
            className="inline-flex items-center gap-1.5 bg-white border border-[#E7DDD2] hover:border-[#EA580C] text-[#44403C] hover:text-[#EA580C] text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${searchingPlaces ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Quick Zone Bar */}
      <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Modern Places Autocomplete Input */}
          <div className="lg:col-span-6 relative">
            <div className="flex items-center bg-[#FDFBF9] border border-[#E7DDD2] focus-within:border-[#EA580C] rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-[#A8A29E] shrink-0 mr-2" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                placeholder="Search any street, landmark, or pincode via Google Places..."
                className="w-full text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] bg-transparent focus:outline-none"
              />
            </div>

            {suggestionsOpen && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#EFE6DC] rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-[#F5EFE8]">
                {suggestions.map((sug, idx) => (
                  <li key={`${sug.placePrediction?.placeId ?? idx}`}>
                    <button
                      type="button"
                      onClick={() => void handleSelectSuggestion(sug)}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-[#292524] hover:bg-[#FFF7ED] hover:text-[#EA580C] flex items-center gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                      <span className="truncate">{sug.placePrediction?.text.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Service Specialty Rule Filter */}
          <div className="lg:col-span-3">
            <select
              aria-label="Service specialty rule"
              value={rules.serviceType}
              onChange={(e) =>
                setRules((r) => ({ ...r, serviceType: e.target.value as ServiceSpecialtyRule }))
              }
              className="w-full bg-[#FDFBF9] border border-[#E7DDD2] focus:border-[#EA580C] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-[#1C1917] focus:outline-none"
            >
              <option value="all">All Tailors &amp; Boutiques</option>
              <option value="blouse-maggam">Blouse &amp; Maggam Specialists</option>
              <option value="alterations">Express Alterations &amp; Repair</option>
              <option value="mens-tailoring">Men&apos;s Bespoke Suits &amp; Shirts</option>
              <option value="uniforms">Institutional &amp; Uniform Tailors</option>
            </select>
          </div>

          {/* Radius Quick Selector (3 / 5 / 8 / 10 km) */}
          <div className="lg:col-span-3 flex items-center justify-between gap-1 bg-[#FFF9F2] border border-[#F3E8DC] rounded-xl p-1">
            {[3, 5, 8, 10].map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setRules((r) => ({ ...r, maxRadiusKm: km }))}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  rules.maxRadiusKm === km
                    ? 'bg-[#EA580C] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#EA580C]'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        {/* Hyderabad Locality Quick Chips & Active Rule Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F5EFE8]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#A8A29E] mr-1">
              Quick Zones:
            </span>
            {HYDERABAD_ZONES.map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => {
                  setUserLocation(z.center);
                  setLocationSource('zone');
                  setSelectedShopId(null);
                  onUpdateLocality(z.label);
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  locality === z.label
                    ? 'bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]'
                    : 'bg-white border-[#EFE6DC] text-[#57534E] hover:border-[#FED7AA]'
                }`}
              >
                {z.label.split(',')[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#78716C]">
            <span className="font-semibold text-[#047857]">
              {eligibleShops.length} eligible / {evaluatedShops.length} live shops
            </span>
            {lastSyncedAt && <span className="hidden sm:inline">Synced {lastSyncedAt}</span>}
          </div>
        </div>

        {gpsError && (
          <div className="flex items-center gap-2 text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}
      </div>

      {/* Main Split Workspace: Interactive Google Map (Left) + Rules & Live Shops Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Real-Time Google Map + Live Route Bar */}
        <div className="lg:col-span-7 space-y-3">
          {/* Explicit CSS height container to guarantee zero map collapse (CF2) */}
          <div className="relative w-full h-[380px] sm:h-[470px] lg:h-[580px] rounded-2xl overflow-hidden border border-[#EFE6DC] shadow-sm bg-[#F5EFE8]">
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
                  <span className="absolute w-8 h-8 rounded-full bg-[#2563EB]/25 animate-ping" />
                  <span className="relative w-4 h-4 rounded-full bg-[#2563EB] border-2 border-white shadow-md" />
                </div>
              </AdvancedMarker>

              {/* Live Google Places Shop Markers */}
              {evaluatedShops.map((shop) => (
                <ShopAdvancedMarker
                  key={shop.place.id}
                  shop={shop}
                  isSelected={selectedShopId === shop.place.id}
                  routeSummary={routeSummary}
                  onSelect={(s) => setSelectedShopId(s.place.id)}
                  onCloseInfo={() => setSelectedShopId(null)}
                  onRequestShop={handleAcceptOrderForShop}
                />
              ))}
            </GoogleMap>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-[#EFE6DC] rounded-xl px-3 py-2 shadow-md flex flex-wrap items-center gap-3 text-[10.5px] font-bold text-[#44403C]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> You
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" /> Top {rules.topKBroadcastCount} Match
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Backup Queue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" /> Rule Excluded
              </span>
            </div>

            {searchingPlaces && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-[#1C1917]/90 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F97316]" />
                Scanning live tailor shops...
              </div>
            )}
          </div>

          {/* Live Route & Travel Mode Control Bar */}
          <div className="bg-white rounded-2xl border border-[#EFE6DC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
                <RouteIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                {selectedShop ? (
                  <>
                    <p className="text-xs font-extrabold text-[#1C1917] truncate">
                      Route to {selectedShop.place.name}
                    </p>
                    {routeLoading ? (
                      <p className="text-[11px] text-[#78716C]">Computing live route &amp; ETA...</p>
                    ) : routeSummary && routeSummary.shopId === selectedShop.place.id ? (
                      <p className="text-[11px] font-semibold text-[#047857]">
                        {(routeSummary.distanceMeters / 1000).toFixed(2)} km road distance ·{' '}
                        {formatDurationMinutes(routeSummary.durationMillis)} ETA ({travelMode.replace('_', ' ')})
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#78716C]">
                        {routeError || `${selectedShop.distanceKm.toFixed(2)} km straight-line distance`}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs font-extrabold text-[#1C1917]">
                      Select any tailor pin to compute real-time route &amp; ETA
                    </p>
                    <p className="text-[11px] text-[#78716C]">
                      Powered by Google Maps Routes API · Active zone radius: {rules.maxRadiusKm} km
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Travel Mode Switcher */}
            <div className="inline-flex items-center bg-[#FAF7F5] border border-[#EFE6DC] p-1 rounded-xl shrink-0">
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
                        ? 'bg-[#EA580C] text-white'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google Maps End User Disclosure & Privacy Notice */}
          <p className="text-[10.5px] text-[#78716C] px-1 leading-relaxed">
            Location data is accessed only with your consent to rank nearby tailor shops in real
            time. Map tiles, place search, and routing are provided by Google Maps Platform subject
            to the{' '}
            <a
              href="https://maps.google.com/help/terms_maps/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#EA580C]"
            >
              Google Maps/Google Earth Additional Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#EA580C]"
            >
              Google Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* RIGHT COLUMN: Ranked Live Shops / Matching Rules / Dispatch & Guard Simulator */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EFE6DC] shadow-sm overflow-hidden">
          {/* Tab Header */}
          <div className="grid grid-cols-3 border-b border-[#EFE6DC] bg-[#FFF9F2] p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setActiveRightTab('shops')}
              className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeRightTab === 'shops'
                  ? 'bg-white text-[#EA580C] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Nearest ({eligibleShops.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('rules')}
              className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeRightTab === 'rules'
                  ? 'bg-white text-[#EA580C] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Rules Engine
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('dispatch')}
              className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeRightTab === 'dispatch'
                  ? 'bg-white text-[#EA580C] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Top-{rules.topKBroadcastCount} Dispatch
            </button>
          </div>

          {/* TAB 1: LIVE RANKED SHOPS */}
          {activeRightTab === 'shops' && (
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {/* Quick Broadcast CTA */}
              <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-[#9A3412]">
                    Auto-Match Top {rules.topKBroadcastCount} Shops
                  </p>
                  <p className="text-[11px] text-[#78716C]">
                    Broadcasts with auto re-route ({rules.autoRerouteSeconds}s) &amp; masked address
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartTopKDispatch}
                  disabled={wave1Shops.length === 0}
                  className="bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-[#D6D3D1] text-white text-xs font-bold px-3.5 py-2 rounded-xl shrink-0 cursor-pointer"
                >
                  Dispatch Now
                </button>
              </div>

              {placesError && (
                <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3 text-xs text-[#991B1B]">
                  {placesError}
                </div>
              )}

              {evaluatedShops.length === 0 && !searchingPlaces && !placesError && (
                <div className="text-center py-8 text-xs text-[#78716C]">
                  No tailor shops loaded yet. Click Refresh or pick a locality.
                </div>
              )}

              {evaluatedShops.map((shop) => {
                const isSelected = selectedShopId === shop.place.id;
                return (
                  <div
                    key={shop.place.id}
                    onClick={() => setSelectedShopId(shop.place.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedShopId(shop.place.id);
                    }}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#EA580C] bg-[#FFF9F2] shadow-sm'
                        : shop.eligible
                          ? 'border-[#EFE6DC] bg-white hover:border-[#FED7AA]'
                          : 'border-[#E7E5E4] bg-[#FAFAF9] opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {shop.rank !== null ? (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                shop.dispatchWave === 1
                                  ? 'bg-[#EA580C] text-white'
                                  : 'bg-[#FEF3C7] text-[#92400E]'
                              }`}
                            >
                              #{shop.rank} · {shop.dispatchWave === 1 ? 'Top-3 Wave 1' : 'Wave 2 Backup'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full">
                              Filtered Out
                            </span>
                          )}
                          {shop.place.isOpenNow === true && (
                            <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                              Open Now
                            </span>
                          )}
                          {shop.place.isOpenNow === false && (
                            <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full">
                              Closed
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-extrabold text-[#1C1917] mt-1.5 truncate">
                          {shop.place.name}
                        </h3>
                        <p className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
                          {shop.place.address}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-[#1C1917] tabular-nums">
                          {shop.distanceKm.toFixed(2)} km
                        </p>
                        {shop.eligible && (
                          <p className="text-[10.5px] font-bold text-[#EA580C] tabular-nums">
                            Score {shop.matchScore}/100
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#57534E]">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 font-bold text-[#1C1917]">
                          <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                          {shop.place.rating !== null ? shop.place.rating.toFixed(1) : 'New'}
                        </span>
                        <span>({shop.place.userRatingCount} reviews)</span>
                      </div>
                      <span className="text-[#EA580C] font-bold">View Route →</span>
                    </div>

                    {/* Rule Check Summary */}
                    {shop.failedReasons.length > 0 ? (
                      <div className="mt-2 pt-2 border-t border-[#E7E5E4] space-y-1">
                        {shop.failedReasons.map((reason) => (
                          <p
                            key={reason}
                            className="text-[10.5px] font-semibold text-[#B91C1C] flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3 shrink-0" />
                            {reason}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-[#F5EFE8] grid grid-cols-4 gap-1 text-center text-[10px]">
                        <div className="bg-[#FDFBF9] rounded-md py-1">
                          <span className="text-[#78716C] block">Dist</span>
                          <span className="font-extrabold text-[#1C1917]">
                            {shop.scoreBreakdown.proximity}/45
                          </span>
                        </div>
                        <div className="bg-[#FDFBF9] rounded-md py-1">
                          <span className="text-[#78716C] block">Rating</span>
                          <span className="font-extrabold text-[#1C1917]">
                            {shop.scoreBreakdown.rating}/30
                          </span>
                        </div>
                        <div className="bg-[#FDFBF9] rounded-md py-1">
                          <span className="text-[#78716C] block">Trust</span>
                          <span className="font-extrabold text-[#1C1917]">
                            {shop.scoreBreakdown.trustVolume}/15
                          </span>
                        </div>
                        <div className="bg-[#FDFBF9] rounded-md py-1">
                          <span className="text-[#78716C] block">Avail</span>
                          <span className="font-extrabold text-[#1C1917]">
                            {shop.scoreBreakdown.availability}/10
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: STITCHMATE MATCHING & OPERATING RULES ENGINE */}
          {activeRightTab === 'rules' && (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Rule Group 1: Discovery & Eligibility Filters */}
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                  1. Hyperlocal Matching Rules
                </h2>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#1C1917] mb-1">
                    <span>Max Service Radius (Pilot: 3–5 km)</span>
                    <span className="text-[#EA580C] tabular-nums">{rules.maxRadiusKm} km</span>
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
                    className="w-full accent-[#EA580C]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#1C1917] mb-1">
                    <span>Minimum Google Rating Gate</span>
                    <span className="text-[#EA580C] tabular-nums">
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
                            ? 'bg-[#FFF7ED] border-[#EA580C] text-[#EA580C]'
                            : 'bg-white border-[#E7E5E4] text-[#57534E]'
                        }`}
                      >
                        {val === 0 ? 'Any' : `${val.toFixed(1)}★+`}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between bg-[#FDFBF9] border border-[#EFE6DC] rounded-xl px-3 py-2.5 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#1C1917]">Require &quot;Open Now&quot;</p>
                    <p className="text-[10.5px] text-[#78716C]">
                      Exclude closed shops using real-time Google hours
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules.requireOpenNow}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, requireOpenNow: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#EA580C]"
                  />
                </label>

                <label className="flex items-center justify-between bg-[#FDFBF9] border border-[#EFE6DC] rounded-xl px-3 py-2.5 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#1C1917]">
                      Mask Customer Address Until Accepted
                    </p>
                    <p className="text-[10.5px] text-[#78716C]">
                      Privacy rule: hide flat/street until a tailor accepts
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules.maskAddressUntilAccepted}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, maskAddressUntilAccepted: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#EA580C]"
                  />
                </label>
              </div>

              {/* Rule Group 2: Home Visit Fee & Minimum Order Waiver */}
              <div className="pt-3 border-t border-[#EFE6DC] space-y-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                  2. Home Visit Fee &amp; Waiver Rule (₹49–₹99)
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-bold text-[#78716C] mb-1">
                      Simulated Order Value (₹)
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={50}
                      value={estimatedOrderInr}
                      onChange={(e) => setEstimatedOrderInr(Math.max(0, Number(e.target.value)))}
                      className="w-full border border-[#E7E5E4] rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-[#78716C] mb-1">
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
                      className="w-full border border-[#E7E5E4] rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                    visitFeeEval.creditedBack
                      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                      : 'bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{visitFeeEval.explanation}</span>
                </div>
              </div>

              {/* Rule Group 3: Strict Order Lifecycle Transition Guard Tester */}
              <div className="pt-3 border-t border-[#EFE6DC] space-y-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#EA580C]">
                  3. Order Transition Rule Guard
                </h2>
                <p className="text-[11px] text-[#57534E]">
                  Test StitchMate&apos;s hard rule: stitching <strong>cannot</strong> start before
                  explicit customer quote approval.
                </p>

                <div className="bg-[#FDFBF9] border border-[#EFE6DC] rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#78716C] font-semibold">Current Stage:</span>
                    <span className="font-extrabold text-[#1C1917] bg-[#FFF7ED] text-[#9A3412] px-2.5 py-0.5 rounded-full">
                      {simOrderStage}
                    </span>
                  </div>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="font-bold text-[#1C1917]">
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
                      className="text-[11px] font-bold bg-white border border-[#E7DDD2] hover:border-[#EA580C] px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      Try: Customer Approved
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestTransitionGuard('Stitching Started')}
                      className="text-[11px] font-bold bg-[#EA580C] hover:bg-[#C2410C] text-white px-2.5 py-1.5 rounded-lg cursor-pointer"
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
                      className="text-[11px] font-semibold text-[#78716C] hover:text-[#1C1917] px-2 py-1.5 cursor-pointer"
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
                  onNotifyToast('Matching & operating rules reset to StitchMate Hyderabad defaults.');
                }}
                className="w-full text-xs font-bold text-[#57534E] hover:text-[#EA580C] py-2 border border-[#EFE6DC] rounded-xl cursor-pointer"
              >
                Reset Rules to Pilot Defaults (5 km, 4.0★)
              </button>
            </div>
          )}

          {/* TAB 3: TOP-3 REQUEST ROUTING & AUTO RE-ROUTE SIMULATOR */}
          {activeRightTab === 'dispatch' && (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Privacy Address Masking Live Preview */}
              <div className="rounded-xl border border-[#EFE6DC] bg-[#FDFBF9] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#57534E] flex items-center gap-1.5">
                    {privacyAddressPreview.isMasked ? (
                      <Lock className="w-3.5 h-3.5 text-[#EA580C]" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-[#059669]" />
                    )}
                    Tailor-Visible Address (Privacy Rule)
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      privacyAddressPreview.isMasked
                        ? 'bg-[#FFF7ED] text-[#9A3412]'
                        : 'bg-[#ECFDF5] text-[#047857]'
                    }`}
                  >
                    {privacyAddressPreview.isMasked ? 'Masked' : 'Unlocked'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#1C1917]">
                  {privacyAddressPreview.visibleAddress}
                </p>
                <input
                  type="text"
                  value={sampleCustomerAddress}
                  onChange={(e) => setSampleCustomerAddress(e.target.value)}
                  aria-label="Customer street address"
                  className="w-full text-[11px] bg-white border border-[#E7E5E4] rounded-lg px-2.5 py-1.5 text-[#57534E]"
                />
              </div>

              {/* Dispatch Status Card */}
              {dispatchStatus === 'idle' && (
                <div className="bg-[#FFF9F2] border border-[#FED7AA] rounded-xl p-4 text-center space-y-2.5">
                  <p className="text-sm font-extrabold text-[#1C1917]">
                    Ready to Route to Top {Math.min(rules.topKBroadcastCount, wave1Shops.length)} Eligible Shops
                  </p>
                  <p className="text-xs text-[#57534E]">
                    StitchMate broadcasts to the highest-ranked shops inside {rules.maxRadiusKm} km
                    and automatically re-routes to Wave 2 ({wave2Shops.length} backup shops) if no
                    one accepts within {rules.autoRerouteSeconds}s.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartTopKDispatch}
                    disabled={wave1Shops.length === 0}
                    className="w-full bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-extrabold py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Start Real-Time Top-{rules.topKBroadcastCount} Broadcast
                  </button>
                </div>
              )}

              {(dispatchStatus === 'wave1' || dispatchStatus === 'wave2') && (
                <div className="space-y-3">
                  <div className="bg-[#1C1917] text-white rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-[#FDBA74]">
                        {dispatchStatus === 'wave1'
                          ? `WAVE 1: BROADCASTING TO TOP ${wave1Shops.length} SHOPS`
                          : `WAVE 2 AUTO RE-ROUTE: ${wave2Shops.length} BACKUP SHOPS`}
                      </p>
                      <p className="text-[11px] text-white/75 mt-0.5">
                        Auto re-route triggers if unaccepted when timer hits 0s
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg text-sm font-extrabold tabular-nums">
                      <Clock className="w-4 h-4 text-[#F97316]" />
                      {dispatchCountdown}s
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(dispatchStatus === 'wave1' ? wave1Shops : wave2Shops).map((shop) => (
                      <div
                        key={shop.place.id}
                        className="rounded-xl border border-[#EFE6DC] p-3 flex items-center justify-between gap-2 bg-white"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-[#1C1917] truncate">
                            #{shop.rank} {shop.place.name}
                          </p>
                          <p className="text-[11px] text-[#78716C]">
                            {shop.distanceKm.toFixed(2)} km · Score {shop.matchScore}/100
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptOrderForShop(shop)}
                          className="bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                        >
                          Simulate Accept
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDispatchCountdown(0)}
                    className="w-full text-xs font-bold text-[#EA580C] border border-[#FED7AA] bg-[#FFF7ED] py-2 rounded-xl cursor-pointer"
                  >
                    Simulate Timeout → Trigger Auto Re-Route Now
                  </button>
                </div>
              )}

              {dispatchStatus === 'accepted' && acceptedShop && (
                <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#047857]">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-sm font-extrabold">Tailor Accepted &amp; Order Created!</p>
                  </div>
                  <p className="text-xs text-[#065F46]">
                    <strong>{acceptedShop.place.name}</strong> ({acceptedShop.distanceKm.toFixed(2)}{' '}
                    km away) accepted the doorstep visit. Customer street address is now unlocked for
                    the assigned tailor, and the booking is live in the Partner Portal &amp; Orders
                    tab.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchStatus('idle');
                      setAcceptedShop(null);
                    }}
                    className="text-xs font-bold text-[#047857] underline cursor-pointer"
                  >
                    Run Another Dispatch Simulation
                  </button>
                </div>
              )}

              {dispatchStatus === 'exhausted' && (
                <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-2 text-center">
                  <p className="text-xs font-extrabold text-[#991B1B]">
                    All Eligible Shops Timed Out in {rules.maxRadiusKm} km Zone
                  </p>
                  <p className="text-[11px] text-[#7F1D1D]">
                    Expand the service radius rule to 8–10 km or lower the minimum rating filter to
                    discover additional nearby tailor shops.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRules((r) => ({ ...r, maxRadiusKm: Math.min(10, r.maxRadiusKm + 3) }));
                      setDispatchStatus('idle');
                    }}
                    className="bg-[#EA580C] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Expand Radius +3 km &amp; Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NearbyShopsPage: React.FC<NearbyShopsPageProps> = (props) => {
  const [rules, setRules] = useState<MatchingRulesConfig>(DEFAULT_MATCHING_RULES);

  if (!MAPS_API_KEY) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#FED7AA] p-6 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#EA580C] mx-auto" />
          <h1 className="text-xl font-extrabold text-[#1C1917]">
            Google Maps API Key Not Configured
          </h1>
          <p className="text-xs sm:text-sm text-[#57534E]">
            Configure <code className="bg-[#FFF7ED] px-1.5 py-0.5 rounded font-mono">VITE_GOOGLE_MAPS_API_KEY</code>{' '}
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
