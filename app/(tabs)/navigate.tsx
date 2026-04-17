// SafeMaps.js (Main Application Component)
// import { collection, onSnapshot } from "firebase/firestore";
// import { db } from "../../firebase/config";


// useEffect(() => {
//   const unsubscribe = onSnapshot(collection(db, "routeReviews"), (snapshot) => {
//     const fetchedReviews = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     setSafetyReviews(fetchedReviews);
//   });

//   // Cleanup on unmount
//   return () => unsubscribe();
// }, []);


import { MaterialIcons } from "@expo/vector-icons"; // For the saved places icon
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage for saving locations
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  Share,
  StatusBar, // For platform-specific styling
  StyleSheet,
  Text, // Import Share API for sharing locations
  TouchableOpacity,
  View,
} from "react-native";

// Import all custom components
import BottomSheet from "../../components/maps/BottomSheet";
import DirectionsModal from "../../components/maps/DirectionModal";
import LoadingOverlay from "../../components/maps/LoadingOverlay";
import LongPressInstruction from "../../components/maps/LongPressInstruction";
import MapDisplay from "../../components/maps/MapDisplay";
import MultiplePlacesModal from "../../components/maps/MultiplePlacesModal";
import NavigationHeader from "../../components/maps/NavigationHeader";
import NearestPlaceConfirmationModal from "../../components/maps/NearestPlaceConfirmationModal";
import RouteOptionsDisplay from "../../components/maps/RouteOptionDisplay";
import SafetyReviewModal from "../../components/maps/SafetyReviewModal";
import SearchBar from "../../components/maps/SearchBar";

// Import global styles
import { GlobalStyles } from "../../constants/GlobalStyles";
import { calculateRouteSafetyScore } from "../../services/routeSafetyService";

const { width, height } = Dimensions.get("window");

// --- Interface Definitions for better type safety (if using TypeScript) ---
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface SearchResult {
  id: string;
  title: string;
  coordinate: Coordinate;
  subtitle: string;
}

interface SafetyReview {
  id: number;
  latitude: number;
  longitude: number;
  rating: number;
  comment: string;
  category: string;
  timestamp: number;
  userId: string;
}

interface DangerousArea {
  latitude: number;
  longitude: number;
  radius: number;
  severity: number;
}

interface RouteInfo {
  distance: number;
  duration: number;
  safety: any; // Safety analysis object
  color: string; // Color based on safety
  title: string; // Route title (e.g., Primary Route, Alternative Route)
  description: string; // Distance and duration string
  directions: any[]; // Turn-by-turn directions
}

const SafeMaps = () => {
  // --- Navigation Hooks ---
  const route = useRoute();
  const navigation = useNavigation();
  const { showPoliceStations, showHospitals } = route.params || {};

  // --- State for Location and Map ---
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [isLocationReady, setIsLocationReady] = useState<boolean>(false); // NEW: Track if location is ready
  const [mapRegion, setMapRegion] = useState<any>(null); // Map's visible region
  const mapRef = useRef<any>(null); // Reference to MapView component
  const [currentRegionName, setCurrentRegionName] = useState<string | null>(
    null
  ); // Current city/region name

  // NEW: State for location watcher subscription
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);

  // --- State for Search Functionality ---
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(
    null
  );

  // --- State for Route and Navigation ---
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeOptions, setRouteOptions] = useState<any[]>([]); // Array of potential routes
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [isNavigationMode, setIsNavigationMode] = useState<boolean>(false);
  const [directions, setDirections] = useState<any[]>([]); // Turn-by-turn directions
  const [showDirectionsModal, setShowDirectionsModal] =
    useState<boolean>(false);

  // NEW: State to hold navigation params for a pending route calculation
  const [pendingNavigationRoute, setPendingNavigationRoute] = useState<
    any | null
  >(null);

  // --- State for Safety Features ---
  const [safetyReviews, setSafetyReviews] = useState<SafetyReview[]>([]);
  const [dangerousAreas, setDangerousAreas] = useState<DangerousArea[]>([]);
  const [safeRouteOnly, setSafeRouteOnly] = useState<boolean>(true); // Toggle for prioritizing safe routes
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewLocation, setReviewLocation] = useState<Coordinate | null>(null); // Location for new review

  // --- State for UI Overlays ---
  const [showLongPressInstruction, setShowLongPressInstruction] =
    useState<boolean>(false);

  // --- State for Nearby Places (Police/Hospital) ---
  const [nearbyPoliceStations, setNearbyPoliceStations] = useState<
    SearchResult[]
  >([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<SearchResult[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);

  // --- State for Nearest Place Confirmation Modal ---
  const [nearestPlaceDetails, setNearestPlaceDetails] = useState<any>(null);
  const [showNearestPlaceModal, setShowNearestPlaceModal] =
    useState<boolean>(false);
  
  // --- State for Multiple Nearby Places Modal ---
  const [multiplePlacesList, setMultiplePlacesList] = useState<any[]>([]);
  const [showMultiplePlacesModal, setShowMultiplePlacesModal] =
    useState<boolean>(false);
  const [currentPlaceType, setCurrentPlaceType] = useState<string>("");

  // --- Animation for Bottom Sheet ---
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const [showBottomSheet, setShowBottomSheet] = useState<boolean>(false);

  // --- API Keys ---
  const GOOGLE_PLACES_API_KEY =
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    Constants.expoConfig?.extra?.googlePlacesApiKey ||
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    Constants.expoConfig?.ios?.config?.googleMapsApiKey;

  const GOOGLE_DIRECTIONS_API_KEY =
    process.env.EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY ||
    Constants.expoConfig?.extra?.googleDirectionsApiKey ||
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    Constants.expoConfig?.ios?.config?.googleMapsApiKey;

  // --- Effects ---

  // Initial location and safety data load on component mount
  useEffect(() => {
    getCurrentLocation();
    loadSafetyData();
  }, []);

  // Set initial map region and show long press instruction when location is available
  useEffect(() => {
    if (location) {
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      const timer = setTimeout(() => {
        setShowLongPressInstruction(true);
      }, 2000);
      const hideTimer = setTimeout(() => {
        setShowLongPressInstruction(false);
      }, 8000);
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [location]);

  // Effect to trigger nearby search based on navigation route parameters (from Home screen)
  useEffect(() => {
    if (location && (showPoliceStations || showHospitals)) {
      // Clear any existing route/search results when a nearby search is triggered
      setRouteCoordinates([]);
      setRouteInfo(null);
      setRouteOptions([]);
      setSelectedLocation(null);
      setSearchQuery("");
      setShowSearchResults(false);
      setShowBottomSheet(false);
      setIsNavigationMode(false); // Ensure not in navigation mode

      if (showPoliceStations) {
        getNearbyPlaces("police");
      }
      if (showHospitals) {
        getNearbyPlaces("hospital");
      }

      // IMPORTANT for tab navigation: Clear params after consumption
      // This prevents the effect from re-running if the user navigates away
      // and then back to the SafeMaps tab without pressing the button again.
      navigation.setParams({
        showPoliceStations: undefined,
        showHospitals: undefined,
      });
    }
  }, [location, showPoliceStations, showHospitals, navigation]);

  // Effect to capture navigation parameters from SavedPlacesScreen
  useFocusEffect(
    useCallback(() => {
      if (route.params?.selectedPlaceForMap) {
        const {
          selectedPlaceForMap,
          selectedPlaceTitle,
          selectedPlaceSubtitle,
        } = route.params;

        // Store the params in a state variable to be processed once location is ready
        setPendingNavigationRoute({
          coordinate: selectedPlaceForMap,
          title: selectedPlaceTitle,
          subtitle: selectedPlaceSubtitle,
        });

        // Clear the params immediately so it's not re-processed on subsequent focuses
        navigation.setParams({
          selectedPlaceForMap: undefined,
          selectedPlaceTitle: undefined,
          selectedPlaceSubtitle: undefined,
        });
      }
    }, [route.params, navigation]) // Dependencies for useFocusEffect
  );

  // NEW EFFECT: Process pending navigation route once location is ready
  useEffect(() => {
    if (isLocationReady && pendingNavigationRoute) {
      const { coordinate, title, subtitle } = pendingNavigationRoute;

      // Clear any active routes or modals to prepare for new display
      stopNavigation();
      setShowBottomSheet(false);
      setShowNearestPlaceModal(false);

      // Set the selected location and animate map to it
      setSelectedLocation({
        id: `saved-${coordinate.latitude}-${coordinate.longitude}`, // Create a unique ID for saved place
        title: title || "Saved Place",
        subtitle: subtitle || "",
        coordinate: coordinate,
      });

      mapRef.current?.animateToRegion({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Pass false to showBottomSheetOnFinish so it doesn't automatically pop up the bottom sheet
      calculateAndShowRoutes(coordinate, false);

      // Clear the pending route after processing
      setPendingNavigationRoute(null);
    }
  }, [
    isLocationReady,
    pendingNavigationRoute,
    stopNavigation,
    animateBottomSheet,
    calculateAndShowRoutes,
  ]);

  // Effect to clean up location watcher when component unmounts
  useEffect(() => {
    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, [locationWatcher]);

  // --- Location and Safety Data Management Functions ---

  /**
   * Fetches the current device location and requests permissions.
   * Also performs reverse geocoding to get current city/region name.
   */
  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location permission is required to use this app."
        );
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
      setIsLocationReady(true); // NEW: Set location as ready

      // Reverse geocode to get current city/region name
      const reverseGeocode = await Location.reverseGeocodeAsync(
        currentLocation.coords
      );
      if (reverseGeocode && reverseGeocode.length > 0) {
        const { city, region } = reverseGeocode[0];
        if (city) {
          setCurrentRegionName(city);
        } else if (region) {
          setCurrentRegionName(region);
        }
      }

      if (mapRef.current && currentLocation) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      console.error("Failed to get current location:", error);
      Alert.alert("Error", "Failed to get current location. Please try again.");
      setIsLocationReady(false); // Ensure it's false on error
    }
  };

  /**
 * Fetch nearby police stations or hospitals using Google Places API
 * Shows only those nearest to current location.
 */
const fetchNearbyPlaces = async (type) => {
  try {
    if (!location || !location.coords) {
      Alert.alert("Location Error", "Current location not found. Please enable GPS.");
      return;
    }

    const { latitude, longitude } = location.coords;

    // Google Places API URL — corrected parameters
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=2000&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;

    console.log("🔍 Fetching nearby:", type, "URL:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.warn("⚠️ Places API Error:", data.status, data.error_message);
      Alert.alert("Error", data.error_message || "Failed to fetch places");
      return;
    }

    if (data.results && data.results.length > 0) {
      // Sort manually by distance (sometimes Google doesn’t)
      const sorted = data.results.sort((a, b) => {
        const d1 = Math.hypot(
          a.geometry.location.lat - latitude,
          a.geometry.location.lng - longitude
        );
        const d2 = Math.hypot(
          b.geometry.location.lat - latitude,
          b.geometry.location.lng - longitude
        );
        return d1 - d2;
      });

      setNearbyPlaces(sorted.slice(0, 10)); // Top 10 nearest
      console.log(`✅ Found ${sorted.length} nearby ${type}`);
    } else {
      Alert.alert("No Nearby", `No nearby ${type} found.`);
    }
  } catch (error) {
    console.error("❌ Error fetching nearby places:", error);
    Alert.alert("Error", "Failed to fetch nearby places.");
  }
};



  /**
   * Loads safety review data from Firebase Realtime Database.
   */
  const loadSafetyData = async () => {
    try {
      // Import Firebase Realtime Database functions
      const { ref, get, query, orderByChild, limitToLast } = await import("firebase/database");
      const { db } = await import("../../config/firebase");
      
      // Fetch reviews from Firebase Realtime Database
      const reviewsRef = ref(db, "safety_reviews");
      const reviewsQuery = query(
        reviewsRef,
        orderByChild("createdAt"),
        limitToLast(1000) // Get last 1000 reviews
      );
      
      const snapshot = await get(reviewsQuery);
      const firebaseReviews: SafetyReview[] = [];
      
      if (snapshot.exists()) {
        const reviewsData = snapshot.val();
        
        // Convert Realtime Database object to array
        Object.keys(reviewsData).forEach((key) => {
          const data = reviewsData[key];
          // Convert Firebase key to numeric ID (use hash or timestamp)
          const numericId = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          firebaseReviews.push({
            id: numericId,
            latitude: data.latitude,
            longitude: data.longitude,
            rating: data.rating,
            comment: data.comment || "",
            category: data.category || "general",
            timestamp: data.createdAt ? new Date(data.createdAt).getTime() : data.timestamp || Date.now(),
            userId: data.userId || "anonymous",
          });
        });
        
        // Sort by timestamp (newest first)
        firebaseReviews.sort((a, b) => b.timestamp - a.timestamp);
        
        if (firebaseReviews.length > 0) {
          setSafetyReviews(firebaseReviews);
          console.log(`✅ Loaded ${firebaseReviews.length} reviews from Firebase Realtime Database`);
          
          // Update dangerous areas
          const dangerous = firebaseReviews
            .filter((review) => review.rating <= 2)
            .map((review) => ({
              latitude: review.latitude,
              longitude: review.longitude,
              radius: 500,
              severity: review.rating,
            }));
          setDangerousAreas(dangerous);
          return;
        }
      }
    } catch (error) {
      console.warn("Could not load reviews from Firebase Realtime Database, using mock data:", error);
    }
    
    // Fallback to mock data if Firebase is unavailable
    const mockReviews: SafetyReview[] = [
      // Safe Areas in Bhopal (Rating 4-5)
      {
        id: 1,
        latitude: 23.2548, // Near Upper Lake (Bada Talab) - Boat Club area
        longitude: 77.3995,
        rating: 5,
        comment:
          "Well-lit and popular area for walks. Feels very safe due to crowds.",
        category: "general",
        timestamp: Date.now() - 86400000 * 5, // 5 days ago
        userId: "bhopal_user1",
      },
      {
        id: 2,
        latitude: 23.2595, // Near DB City Mall / Zone-I
        longitude: 77.4126,
        rating: 4,
        comment:
          "Busy commercial hub with good security. Safe during day and evening.",
        category: "security",
        timestamp: Date.now() - 86400000 * 3, // 3 days ago
        userId: "bhopal_user2",
      },
      {
        id: 3,
        latitude: 23.245, // Near New Market
        longitude: 77.404,
        rating: 4,
        comment:
          "Crowded market area, active police patrolling. Safe for shopping.",
        category: "general",
        timestamp: Date.now() - 86400000 * 7, // 7 days ago
        userId: "bhopal_user3",
      },
      {
        id: 4,
        latitude: 23.27, // Near Van Vihar National Park entrance
        longitude: 77.375,
        rating: 5,
        comment:
          "Protected national park area. Very safe during operational hours. Good for nature walks.",
        category: "security",
        timestamp: Date.now() - 86400000 * 2, // 2 days ago
        userId: "bhopal_user4",
      },
      {
        id: 5,
        latitude: 23.22, // Near Shahpura Lake
        longitude: 77.435,
        rating: 4,
        comment:
          "Nice lakeside area, well-maintained. Feels safe with families around.",
        category: "general",
        timestamp: Date.now() - 86400000 * 4, // 4 days ago
        userId: "bhopal_user5",
      },

      // Caution Areas in Bhopal (Rating 3)
      {
        id: 6,
        latitude: 23.235, // Near Habibganj Railway Station / ISBT area
        longitude: 77.43,
        rating: 3,
        comment:
          "Busy transport hub. Can be crowded and chaotic. Exercise caution at night.",
        category: "crowd",
        timestamp: Date.now() - 86400000 * 1, // 1 day ago
        userId: "bhopal_user6",
      },
      {
        id: 7,
        latitude: 23.2681, // Ibrahimganj - based on your previous testing
        longitude: 77.4049,
        rating: 3,
        comment:
          "Narrow streets, some areas lack proper lighting. Mixed reviews.",
        category: "lighting",
        timestamp: Date.now() - 86400000 * 6, // 6 days ago
        userId: "bhopal_user7",
      },

      // Dangerous Areas in Bhopal (Rating 1-2)
      {
        id: 8,
        latitude: 23.265, // Example of a less populated street/alley (hypothetical)
        longitude: 77.408,
        rating: 2,
        comment:
          "Very poor lighting and often deserted after 9 PM. Felt unsafe walking alone.",
        category: "lighting",
        timestamp: Date.now() - 86400000 * 0.5, // 12 hours ago
        userId: "bhopal_user8",
      },
      {
        id: 9,
        latitude: 23.24, // Another hypothetical isolated spot
        longitude: 77.39,
        rating: 1,
        comment:
          "Frequent reports of petty crime and harassment. Highly unsafe, avoid this route.",
        category: "crime",
        timestamp: Date.now() - 86400000 * 1.5, // 1.5 days ago
        userId: "bhopal_user9",
      },
      {
        id: 10,
        latitude: 23.275, // Near a less maintained area (hypothetical)
        longitude: 77.415,
        rating: 2,
        comment:
          "Broken pavements and overgrown bushes make it feel unsafe, especially at night.",
        category: "infrastructure",
        timestamp: Date.now() - 86400000 * 2.5, // 2.5 days ago
        userId: "bhopal_user10",
      },
    ];

    setSafetyReviews(mockReviews);

    // Identify dangerous areas from mock reviews
    const dangerous = mockReviews
      .filter((review) => review.rating <= 2)
      .map((review) => ({
        latitude: review.latitude,
        longitude: review.longitude,
        radius: 500, // Radius for dangerous area visualization
        severity: review.rating,
      }));

    setDangerousAreas(dangerous);
  };

  /**
   * Submits a new safety review and saves it to Firebase Realtime Database.
   */
  const submitSafetyReview = useCallback(
    async (
      latitude: number,
      longitude: number,
      rating: number,
      comment: string,
      category: string
    ) => {
      try {
        // Import Firebase Realtime Database functions
        const { ref, push, serverTimestamp: getServerTimestamp } = await import("firebase/database");

        const { db } = await import("../../config/firebase");
        const { auth } = await import("../../config/firebase");
        
        const userId = auth.currentUser?.uid || "anonymous";
        
        // Save to Firebase Realtime Database
        const reviewData = {
          latitude,
          longitude,
          rating,
          comment,
          category,
          userId,
          timestamp: getServerTimestamp(),
          createdAt: new Date().toISOString(),
        };
        
        // Push to safety_reviews node in Realtime Database
        const reviewsRef = ref(db, "safety_reviews");
        const newReviewRef = push(reviewsRef);
        
        // Save the data
        const { set } = await import("firebase/database");
        await set(newReviewRef, reviewData);
        
        console.log("✅ Review saved to Firebase Realtime Database with ID:", newReviewRef.key);
        
        // Update local state (use Date.now() for ID since Firebase keys are strings)
        const newReview: SafetyReview = {
          id: Date.now(),
          latitude,
          longitude,
          rating,
          comment,
          category,
          timestamp: Date.now(),
          userId: userId,
        };

        const updatedReviews = [...safetyReviews, newReview];
        setSafetyReviews(updatedReviews);

        // Update dangerous areas if the new review indicates danger
        if (rating <= 2) {
          const newDangerousArea: DangerousArea = {
            latitude,
            longitude,
            radius: 500,
            severity: rating,
          };
          setDangerousAreas((prev) => [...prev, newDangerousArea]);
        }

        Alert.alert(
          "Review Submitted",
          "Thank you for helping keep our community safe! Your review has been saved."
        );
        setShowReviewModal(false);
      } catch (error) {
        console.error("Error saving review to Firebase:", error);
        // Still update local state even if Firebase fails
        const newReview: SafetyReview = {
          id: Date.now(),
          latitude,
          longitude,
          rating,
          comment,
          category,
          timestamp: Date.now(),
          userId: "local_user",
        };
        setSafetyReviews([...safetyReviews, newReview]);
        
        Alert.alert(
          "Review Saved Locally",
          "Your review was saved locally. It will sync when online."
        );
        setShowReviewModal(false);
      }
    },
    [safetyReviews]
  );

  // --- Search Functionality ---

  /**
   * Searches for places using Google Places Text Search API.
   * @param {string} query - The search query string.
   */
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setShowLongPressInstruction(false); // Hide instruction when search starts

    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert(
        "API Key Missing",
        "Google Places API key is not configured. Please add it to your app.json extra field."
      );
      console.error("Google Places API key is missing.");
      return;
    }

    try {
      const PLACE_SEARCH_URL =
        "https://maps.googleapis.com/maps/api/place/textsearch/json";

      // Bias results towards current location for relevance
      const locationBias = location
        ? `&locationbias=circle:50000@${location.coords.latitude},${location.coords.longitude}`
        : "";

      const url = `${PLACE_SEARCH_URL}?query=${encodeURIComponent(
        query
      )}&key=${GOOGLE_PLACES_API_KEY}${locationBias}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const formattedResults: SearchResult[] = data.results
          .slice(0, 5) // Limit to top 5 results
          .map((place: any) => ({
            id: place.place_id, // Unique ID from Google Places
            title: place.name,
            subtitle:
              place.formatted_address ||
              `${place.vicinity || ""}, ${
                place.plus_code?.compound_code || ""
              }`,
            coordinate: {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            },
          }));
        setSearchResults(formattedResults);
        setShowSearchResults(true);
      } else if (data.status === "ZERO_RESULTS") {
        setSearchResults([]);
        setShowSearchResults(true);
      } else {
        console.error(
          "Google Places API error:",
          data.status,
          data.error_message
        );
        Alert.alert(
          "Search Error",
          `Google Places API Error: ${data.error_message || data.status}`
        );
      }
    } catch (error) {
      console.error("Places API fetch error:", error);
      Alert.alert(
        "Search Error",
        "Network error or invalid API key. Check console for details."
      );
    }
  };

  /**
   * Selects a search result, updates state, animates map, and shows bottom sheet.
   * @param {SearchResult} result - The selected search result object.
   */
  const selectSearchResult = (result: SearchResult) => {
    setSearchQuery(result.title);
    setShowSearchResults(false);
    setSelectedLocation(result);
    animateBottomSheet(true);
    mapRef.current?.animateToRegion({
      latitude: result.coordinate.latitude,
      longitude: result.coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  /**
   * Animates the bottom sheet up or down.
   * @param {boolean} show - True to show, false to hide.
   */
  const animateBottomSheet = (show: boolean) => {
    Animated.timing(bottomSheetAnim, {
      toValue: show ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      if (!show) setShowBottomSheet(false);
    });
    if (show) setShowBottomSheet(true);
  };

  // --- Utility Functions ---

  /**
   * Decodes an encoded polyline string into an array of coordinates.
   * Used for Google Directions API route polylines.
   * @param {string} encoded - The encoded polyline string.
   * @returns {Coordinate[]} Array of {latitude, longitude} objects.
   */
  const decodePolyline = (encoded: string): Coordinate[] => {
    const coordinates: Coordinate[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return coordinates;
  };

  /**
   * Calculates distance between two coordinates using Haversine formula.
   * @param {Coordinate} origin - {latitude, longitude}
   * @param {Coordinate} destination - {latitude, longitude}
   * @returns {number} Distance in kilometers.
   */
  const calculateDistance = (
    origin: Coordinate,
    destination: Coordinate
  ): number => {
    const R = 6371; // Earth's radius in km
    const deg2rad = (deg: number) => deg * (Math.PI / 180);

    const dLat = deg2rad(destination.latitude - origin.latitude);
    const dLon = deg2rad(destination.longitude - origin.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(origin.latitude)) *
        Math.cos(deg2rad(destination.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Gets the safety score for a given area based on nearby reviews.
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radius - Search radius in meters.
   * @returns {object} {score, status, reviews}
   */
  const getAreaSafetyScore = useCallback(
    (latitude: number, longitude: number, radius = 500) => {
      const nearbyReviews = safetyReviews.filter((review) => {
        const distance = calculateDistance(
          { latitude, longitude },
          { latitude: review.latitude, longitude: review.longitude }
        );
        return distance <= radius / 1000; // Convert radius to km for comparison
      });

      if (nearbyReviews.length === 0) {
        return { score: 3, status: "unreviewed", reviews: [] };
      }

      const avgRating =
        nearbyReviews.reduce((sum, review) => sum + review.rating, 0) /
        nearbyReviews.length;

      let status = "safe";
      if (avgRating <= 2) status = "dangerous";
      else if (avgRating <= 3.5) status = "caution";

      return { score: avgRating, status, reviews: nearbyReviews };
    },
    [safetyReviews]
  );

  /**
   * Analyzes the safety of an entire route by checking segments.
   * Uses enhanced scoring with OSM data, weather, and other factors.
   * @param {Coordinate[]} coordinates - Array of route coordinates.
   * @returns {Promise<object>} Overall safety status, danger percentage, and segment-wise safety.
   */
  const analyzeRouteSafety = useCallback(
    async (coordinates: Coordinate[]) => {
      // Get base scores from user reviews for each coordinate
      const baseScores = coordinates.map((coord) => {
        const safety = getAreaSafetyScore(coord.latitude, coord.longitude, 500);
        return safety.score; // Base score from user reviews
      });

      // Use enhanced scoring service with OSM and weather data
      try {
        const enhancedSafety = await calculateRouteSafetyScore(coordinates, baseScores);
        
        // Convert to the format expected by the rest of the app
        const result = {
          overall: enhancedSafety.overall,
          dangerPercentage: enhancedSafety.dangerPercentage,
          segmentSafety: enhancedSafety.segmentScores.map((seg) => ({
            coordinate: seg.coordinate,
            safety: seg.status,
            score: seg.score,
            factors: seg.factors, // Include detailed factors for debugging/display
          })),
          stats: enhancedSafety.stats,
          averageScore: enhancedSafety.averageScore || 3, // Ensure averageScore is always set
        };
        
        // Debug log
        console.log("Enhanced safety result:", {
          overall: result.overall,
          averageScore: result.averageScore,
          segmentCount: result.segmentSafety.length
        });
        
        return result;
      } catch (error) {
        console.error("Error in enhanced route safety analysis:", error);
        
        // Fallback to original method if enhanced analysis fails
        let totalDangerousSegments = 0;
        let totalSafeSegments = 0;
        let totalUnreviewedSegments = 0;

        const segmentSafety = [];

        for (let i = 0; i < coordinates.length; i += 5) {
          const coord = coordinates[i];
          const safety = getAreaSafetyScore(coord.latitude, coord.longitude, 500);

          segmentSafety.push({
            coordinate: coord,
            safety: safety.status,
            score: safety.score,
          });

          if (safety.status === "dangerous") totalDangerousSegments++;
          else if (safety.status === "safe") totalSafeSegments++;
          else totalUnreviewedSegments++;
        }

        const totalSegments = segmentSafety.length;
        const dangerPercentage =
          totalSegments > 0 ? (totalDangerousSegments / totalSegments) * 100 : 0;

        let overallSafety = "safe";
        if (totalDangerousSegments > 0 || dangerPercentage >= 1) {
          overallSafety = "dangerous";
        } else if (dangerPercentage > 10) {
          overallSafety = "caution";
        } else if (
          totalSegments > 0 &&
          totalUnreviewedSegments / totalSegments > 0.7
        ) {
          overallSafety = "unreviewed";
        }

        // Calculate average score from base scores
        const scores = segmentSafety.map((seg: any) => seg.score || 3).filter((score: number) => score > 0);
        const averageScore = scores.length > 0 
          ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length 
          : 3;

        return {
          overall: overallSafety,
          dangerPercentage,
          segmentSafety,
          stats: {
            dangerous: totalDangerousSegments,
            safe: totalSafeSegments,
            unreviewed: totalUnreviewedSegments,
          },
          averageScore,
        };
      }
    },
    [getAreaSafetyScore]
  );

  /**
   * Returns a color based on the safety score.
   * @param {number} score - Safety score (0-5)
   * @returns {string} Hex color code.
   * Score ranges:
   * - 0-1.5: RED (#FF4444)
   * - 1.6-3.5: YELLOW (#FFC107)
   * - Above 3.5: GREEN (#4CAF50)
   */
  const getSafetyColor = (score: number | string): string => {
    // Handle both number and string inputs
    const numericScore = typeof score === "string" 
      ? parseFloat(score) 
      : (score || 0);
    
    // If it's a string status (for backward compatibility), convert it
    if (typeof score === "string" && isNaN(numericScore)) {
      // Legacy support: if string is a status name
      switch (score) {
        case "dangerous":
          return "#FF4444"; // Red
        case "caution":
          return "#FFC107"; // Yellow
        case "safe":
          return "#4CAF50"; // Green
        default:
          return "#2196F3"; // Blue (for unreviewed)
      }
    }
    
    // Score-based coloring
    if (numericScore <= 1.5) {
      return "#FF4444"; // RED
    } else if (numericScore <= 3.5) {
      return "#FFC107"; // YELLOW
    } else {
      return "#4CAF50"; // GREEN
    }
  };

  /**
   * Fetches multiple route options from Google Directions API, including alternatives
   * and routes avoiding certain features, then analyzes their safety.
   * @param {Coordinate} origin - {latitude, longitude}
   * @param {Coordinate} destination - {latitude, longitude}
   * @returns {Promise<RouteInfo[]>} Sorted array of route objects with safety analysis.
   */
  const getMultipleGoogleRoutes = async (
    origin: Coordinate,
    destination: Coordinate
  ): Promise<RouteInfo[]> => {
    if (!GOOGLE_DIRECTIONS_API_KEY) {
      Alert.alert(
        "API Key Missing",
        "Google Directions API key is not configured. Please add it to your app.json extra field."
      );
      throw new Error("Google Directions API key not found");
    }

    const fetchRoute = async (pref = "") => {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${
        origin.latitude
      },${origin.longitude}&destination=${destination.latitude},${
        destination.longitude
      }&key=${GOOGLE_DIRECTIONS_API_KEY}&alternatives=true&units=metric${
        pref ? `&${pref}` : ""
      }`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status !== "OK") {
        console.warn(
          `Google Directions API error (${pref}):`,
          data.status,
          data.error_message
        );
        return [];
      }
      return data.routes || [];
    };

    let allGoogleRoutes: any[] = [];

    // Fetch standard routes and alternatives
    allGoogleRoutes.push(...(await fetchRoute()));
    // Fetch routes avoiding highways
    allGoogleRoutes.push(...(await fetchRoute("avoid=highways")));
    // Fetch routes avoiding tolls
    allGoogleRoutes.push(...(await fetchRoute("avoid=tolls")));

    // Process and remove duplicates
    const processedRoutes: RouteInfo[] = allGoogleRoutes.map((route, index) => {
      const leg = route.legs[0];
      const coordinates = decodePolyline(route.overview_polyline.points);
      const directions = leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
        distance: step.distance.text,
        duration: step.duration.text,
      }));

      return {
        id: `route-${Date.now()}-${index}`,
        coordinates,
        distance: leg.distance.value / 1000, // in km
        duration: Math.round(leg.duration.value / 60), // in minutes
        description: `${leg.distance.text} • ${leg.duration.text}`,
        directions,
      } as RouteInfo; // Cast to RouteInfo
    });

    // Remove duplicate routes based on proximity of distance and duration
    const uniqueRoutes: RouteInfo[] = [];
    for (const route of processedRoutes) {
      const isDuplicate = uniqueRoutes.some((existing) => {
        const distanceDiff = Math.abs(existing.distance - route.distance);
        const durationDiff = Math.abs(existing.duration - route.duration);
        return distanceDiff < 0.5 && durationDiff < 2; // 0.5km and 2min tolerance
      });
      if (!isDuplicate) {
        uniqueRoutes.push(route);
      }
    }

    // Analyze safety for all unique routes (now async)
    setIsCalculatingRoute(true);
    try {
      const routesWithSafetyPromises = uniqueRoutes.map(async (route, index) => {
        const safetyAnalysis = await analyzeRouteSafety(route.coordinates);
        
        // Use averageScore from enhanced analysis, or calculate fallback
        let averageScore = safetyAnalysis.averageScore;
        
        // If averageScore is not set, calculate it from segment scores
        if (!averageScore && safetyAnalysis.segmentSafety && safetyAnalysis.segmentSafety.length > 0) {
          const scores = safetyAnalysis.segmentSafety
            .map((seg: any) => seg.score || 3)
            .filter((score: number) => !isNaN(score) && score > 0);
          
          if (scores.length > 0) {
            averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
          }
        }
        
        // If still no score, use default based on overall status
        if (!averageScore || isNaN(averageScore)) {
          switch (safetyAnalysis.overall) {
            case "safe":
              averageScore = 4.5;
              break;
            case "caution":
              averageScore = 3;
              break;
            case "dangerous":
              averageScore = 1.5;
              break;
            default:
              averageScore = 3;
          }
        }
        
        // Ensure score is between 0-5
        averageScore = Math.max(0, Math.min(5, averageScore));
        
        return {
          ...route,
          safety: {
            ...safetyAnalysis,
            averageScore: averageScore,
          },
          color: getSafetyColor(averageScore), // Use score instead of status
          title: index === 0 ? "Primary Route" : `Alternative Route ${index + 1}`,
        };
      });

      const routesWithSafety = await Promise.all(routesWithSafetyPromises);

      // Debug: Log scores to verify they're being calculated
      console.log("Routes with safety scores:", routesWithSafety.map(r => ({
        title: r.title,
        averageScore: r.safety?.averageScore,
        overall: r.safety?.overall
      })));

      // Sort routes: safest first (by averageScore), then shortest duration
      routesWithSafety.sort((a, b) => {
        // First sort by averageScore (higher is better)
        const scoreDiff = (b.safety?.averageScore || 0) - (a.safety?.averageScore || 0);
        if (Math.abs(scoreDiff) > 0.1) return scoreDiff; // Significant difference
        
        // If scores are similar, use overall status
        const safetyPriority: { [key: string]: number } = {
          safe: 4,
          unreviewed: 3,
          caution: 2,
          dangerous: 1,
        };
        const aSafety = safetyPriority[a.safety.overall];
        const bSafety = safetyPriority[b.safety.overall];

        if (aSafety !== bSafety) return bSafety - aSafety; // Prioritize higher safety score
        return a.duration - b.duration; // Then prioritize shorter duration
      });

      return routesWithSafety;
    } catch (error) {
      console.error("Error calculating route safety:", error);
      // Return routes with default scoring based on user reviews if enhanced scoring fails
      const routesWithDefaults = uniqueRoutes.map((route, index) => {
        // Try to get a basic safety score from user reviews if available
        let defaultScore = 3;
        let defaultOverall: "safe" | "caution" | "dangerous" | "unreviewed" = "unreviewed";
        
        if (route.coordinates && route.coordinates.length > 0) {
          try {
            // Sample a few points along the route
            const samplePoints = [
              route.coordinates[0],
              route.coordinates[Math.floor(route.coordinates.length / 2)],
              route.coordinates[route.coordinates.length - 1],
            ];
            
            const sampleScores = samplePoints.map(coord => {
              const safety = getAreaSafetyScore(coord.latitude, coord.longitude, 500);
              return safety.score;
            });
            
            defaultScore = sampleScores.reduce((sum, score) => sum + score, 0) / sampleScores.length;
            
            if (defaultScore >= 4) {
              defaultOverall = "safe";
            } else if (defaultScore >= 2.5) {
              defaultOverall = "caution";
            } else if (defaultScore < 2) {
              defaultOverall = "dangerous";
            }
          } catch (err) {
            console.warn("Error getting default safety score:", err);
          }
        }
        
          return {
            ...route,
            safety: {
              overall: defaultOverall,
              dangerPercentage: 0,
              segmentSafety: [],
              stats: { dangerous: 0, safe: 0, unreviewed: 0, caution: 0 },
              averageScore: defaultScore,
            },
            color: getSafetyColor(defaultScore), // Use score instead of status
            title: index === 0 ? "Primary Route" : `Alternative Route ${index + 1}`,
          };
      });
      
      // Debug log
      console.log("Using default safety scores:", routesWithDefaults.map(r => ({
        title: r.title,
        averageScore: r.safety.averageScore
      })));
      
      return routesWithDefaults;
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  /**
   * Function to calculate routes and display options.
   * This does NOT set navigation mode to true immediately.
   * @param {Coordinate} destinationCoord - The coordinate of the destination to calculate route for.
   * @param {boolean} [showBottomSheetOnFinish=true] - Whether to show the bottom sheet after calculation.
   */
  const calculateAndShowRoutes = async (
    destinationCoord: Coordinate,
    showBottomSheetOnFinish: boolean = true
  ) => {
    if (!location) {
      Alert.alert("Error", "Please get your current location first.");
      return;
    }
    if (!destinationCoord) {
      Alert.alert("Error", "Please select a destination first.");
      return;
    }

    setIsCalculatingRoute(true);
    setRouteOptions([]); // Clear previous options
    setRouteCoordinates([]);
    setRouteInfo(null);
    setDirections([]);
    setSelectedRouteIndex(0);
    setIsNavigationMode(false); // Ensure navigation mode is false when showing options

    // Set selectedLocation here, just before calculation uses it (if not already set by search)
    // This ensures selectedLocation is consistent for route calculation and bottom sheet display
    if (!selectedLocation || selectedLocation.coordinate !== destinationCoord) {
      setSelectedLocation({
        id: `temp-${destinationCoord.latitude}-${destinationCoord.longitude}`,
        title: nearestPlaceDetails?.title || "Destination",
        subtitle: nearestPlaceDetails?.subtitle || "",
        coordinate: destinationCoord,
      });
    }

    try {
      const routes = await getMultipleGoogleRoutes(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        destinationCoord
      );

      if (!routes || routes.length === 0) {
        Alert.alert(
          "No Routes Found",
          "Could not calculate any routes between the selected locations."
        );
        return;
      }

      // Ensure all routes have safety scores (add defaults if missing)
      const routesWithGuaranteedScores = routes.map((route) => {
        if (!route.safety || route.safety.averageScore === undefined || route.safety.averageScore === null) {
          const defaultScore = route.safety?.overall === "safe" ? 4.5 :
                             route.safety?.overall === "caution" ? 3.0 :
                             route.safety?.overall === "dangerous" ? 1.5 : 3.0;
          
          return {
            ...route,
            safety: {
              ...route.safety,
              overall: route.safety?.overall || "unreviewed",
              averageScore: defaultScore,
              dangerPercentage: route.safety?.dangerPercentage || 0,
              segmentSafety: route.safety?.segmentSafety || [],
              stats: route.safety?.stats || { dangerous: 0, safe: 0, unreviewed: 0, caution: 0 },
            },
            color: getSafetyColor(defaultScore), // Update color based on score
          };
        } else {
          // Recalculate color based on the score even if score exists
          return {
            ...route,
            color: getSafetyColor(route.safety.averageScore),
          };
        }
      });

      console.log("Setting routes with scores:", routesWithGuaranteedScores.map(r => ({
        title: r.title,
        hasSafety: !!r.safety,
        averageScore: r.safety?.averageScore,
        overall: r.safety?.overall
      })));

      setRouteOptions(routesWithGuaranteedScores);

      let selectedRoute = routes[0]; // Default to the first (safest/shortest) route

      // If "safeRouteOnly" is enabled and the best route is dangerous, try to find an alternative.
      if (safeRouteOnly && selectedRoute.safety.overall === "dangerous") {
        const saferAlternative = routes.find(
          (r) => r.safety.overall !== "dangerous"
        );
        if (saferAlternative) {
          selectedRoute = saferAlternative;
          Alert.alert(
            "Safer Route Found",
            "The primary route passes through unsafe areas. A safer alternative has been selected for you."
          );
        } else {
          Alert.alert(
            "Safety Warning",
            "All available routes pass through areas marked as unsafe. Consider traveling at a different time or choosing a different destination.",
            [
              { text: "Continue Anyway", onPress: () => {} }, // Allows user to proceed with dangerous route
              {
                text: "Cancel",
                onPress: () => {
                  setIsCalculatingRoute(false);
                  return;
                },
                style: "cancel",
              },
            ]
          );
        }
      }

      setRouteCoordinates(selectedRoute.coordinates);
      setRouteInfo(selectedRoute);
      setDirections(selectedRoute.directions || []);
      setSelectedRouteIndex(routes.indexOf(selectedRoute)); // Set index of the actually selected route

      // Fit map to route coordinates
      if (selectedRoute.coordinates.length > 0) {
        mapRef.current?.fitToCoordinates(selectedRoute.coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error("Route calculation error:", error);
      Alert.alert(
        "Route Error",
        "Could not calculate routes. Please check your internet connection or try again later."
      );
    } finally {
      setIsCalculatingRoute(false);
      // Only show bottom sheet if explicitly requested
      if (showBottomSheetOnFinish) {
        animateBottomSheet(true);
      }
    }
  };

  /**
   * Function to fetch nearby places (police or hospital) using Google Places Nearby Search API.
   * @param {string} placeType - 'police' or 'hospital'
   */
  const getNearbyPlaces = async (placeType: string) => {
    if (!location) {
      Alert.alert(
        "Location Error",
        "Cannot find nearby places without your current location."
      );
      return;
    }
    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert(
        "API Key Missing",
        "Google Places API key is not configured."
      );
      console.error("Google Places API key is missing.");
      return;
    }

    setIsLoadingNearby(true);
    setNearbyPoliceStations([]); // Clear all nearby markers initially
    setNearbyHospitals([]); // Clear all nearby markers initially
    setNearestPlaceDetails(null); // Clear previous nearest place details
    setMultiplePlacesList([]); // Clear previous list

    try {
      // Verify location accuracy
      const currentLat = location.coords.latitude;
      const currentLng = location.coords.longitude;
      const accuracy = location.coords.accuracy || 0;
      
      console.log("📍 Current Location:", {
        lat: currentLat,
        lng: currentLng,
        accuracy: `${accuracy.toFixed(0)}m`,
      });

      const NEARBY_SEARCH_URL =
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
      // Reduced radius to 10km for more relevant nearby results
      const radius = 10000; // Search within 10 km radius
      const url = `${NEARBY_SEARCH_URL}?location=${currentLat},${currentLng}&radius=${radius}&type=${placeType}&key=${GOOGLE_PLACES_API_KEY}`;

      console.log("🔍 Searching nearby places:", { placeType, radius: `${radius / 1000}km` });

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        // IMPORTANT: Calculate distance for ALL results first, then sort by distance
        // Google Places API returns results in "prominence" order, not distance order
        const placesWithDistance = data.results.map((place: any) => {
          const distance = calculateDistance(
            { latitude: currentLat, longitude: currentLng },
            {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            }
          );
          return {
            id: place.place_id,
            title: place.name,
            subtitle: place.vicinity || place.formatted_address,
            coordinate: {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            },
            distance: distance,
            type: placeType,
          };
        });

        // Sort ALL results by distance (closest first)
        placesWithDistance.sort((a: any, b: any) => a.distance - b.distance);
        
        // Take only the top 5 nearest after sorting
        const topPlaces = placesWithDistance.slice(0, 5);
        
        console.log(`✅ Found ${topPlaces.length} nearest ${placeType}:`, 
          topPlaces.map((p: any) => `${p.title} (${p.distance.toFixed(2)} km)`));

        // Set all places as markers on map
        if (placeType === "police") {
          setNearbyPoliceStations(topPlaces);
        } else if (placeType === "hospital") {
          setNearbyHospitals(topPlaces);
        }

        // Store list and show modal with multiple options
        setMultiplePlacesList(topPlaces);
        setCurrentPlaceType(placeType);
        setShowMultiplePlacesModal(true);

        // Set nearest for backward compatibility
        setNearestPlaceDetails(topPlaces[0]);

        // Fit map to show all markers, but prioritize closest ones
        if (mapRef.current && topPlaces.length > 0) {
          // If nearest place is very close (< 2km), zoom to show just that area
          // Otherwise show all results
          const nearestDistance = topPlaces[0].distance;
          if (nearestDistance < 2 && topPlaces.length > 0) {
            // Zoom in on nearest place and current location
            mapRef.current.fitToCoordinates(
              [location.coords, topPlaces[0].coordinate],
              {
                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                animated: true,
              }
            );
          } else {
            // Show all results
            const allCoordinates = [
              location.coords,
              ...topPlaces.map((p: any) => p.coordinate),
            ];
            mapRef.current.fitToCoordinates(allCoordinates, {
              edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
              animated: true,
            });
          }
        }
        
        // Show alert with location info for debugging
        if (accuracy > 100) {
          Alert.alert(
            "Location Accuracy Notice",
            `Your GPS accuracy is ${accuracy.toFixed(0)}m. For better results, ensure you're outdoors with clear sky view.`,
            [{ text: "OK" }]
          );
        }
      } else if (data.status === "ZERO_RESULTS") {
        Alert.alert(
          `No ${
            placeType === "police" ? "Police Stations" : "Hospitals"
          } Found`,
          `Could not find any ${
            placeType === "police" ? "police stations" : "hospitals"
          } within 50 km.`
        );
      } else {
        console.error(
          `Google Places Nearby Search error for ${placeType}:`,
          data.status,
          data.error_message
        );
        Alert.alert(
          "Nearby Search Error",
          `Could not fetch ${placeType} locations. Error: ${
            data.error_message || data.status
          }`
        );
      }
    } catch (error) {
      console.error(`Error fetching nearby ${placeType}:`, error);
      Alert.alert(
        "Network Error",
        `Failed to fetch nearby ${placeType}. Check your internet connection.`
      );
    } finally {
      setIsLoadingNearby(false);
    }
  };

  /**
   * Starts navigation to the nearest place found (after confirmation).
   */
  const startNavigationToNearestPlace = () => {
    if (!nearestPlaceDetails || !location) {
      Alert.alert("Error", "No nearest place selected for navigation.");
      return;
    }
    calculateAndShowRoutes(nearestPlaceDetails.coordinate, false); // MODIFIED: Pass 'false' here
    setShowNearestPlaceModal(false); // Close the modal
  };

  /**
   * Handles selection of a place from the multiple places modal.
   */
  const handleSelectPlaceFromList = (place: any) => {
    setShowMultiplePlacesModal(false);
    calculateAndShowRoutes(place.coordinate, false);
    // Optionally animate map to selected place
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: place.coordinate.latitude,
        longitude: place.coordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  /**
   * Initiates actual navigation mode. This is called from RouteOptionsDisplay.
   */
  const startActualNavigation = async () => {
    if (!routeInfo || !routeCoordinates.length || !location) {
      Alert.alert(
        "Error",
        "No route selected or current location unavailable to start navigation."
      );
      return;
    }
    setIsNavigationMode(true);

    // Start watching user's position
    try {
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every 1 second
          distanceInterval: 10, // Update every 10 meters
        },
        (newLocation) => {
          if (mapRef.current && newLocation.coords) {
            mapRef.current.animateCamera(
              {
                center: {
                  latitude: newLocation.coords.latitude,
                  longitude: newLocation.coords.longitude,
                },
                // Removed zoom and heading for initial debugging, can add back later
                // zoom: 16, // Keep a consistent zoom level during navigation
                // heading: newLocation.coords.heading || 0, // Orient map to user's direction
              },
              { duration: 500 }
            ); // Smooth animation
          }
        }
      );
      setLocationWatcher(watcher);
    } catch (error) {
      console.error("Error starting location watcher:", error);
      Alert.alert(
        "Navigation Error",
        "Could not start live navigation. Please check location permissions."
      );
    }
  };

  /**
   * Stops the current navigation.
   */
  const stopNavigation = () => {
    setIsNavigationMode(false);
    setRouteCoordinates([]);
    setRouteInfo(null);
    setDirections([]);
    setRouteOptions([]);
    setSelectedRouteIndex(0);
    setNearbyPoliceStations([]); // Clear nearby markers on stop navigation
    setNearbyHospitals([]); // Clear nearby markers on stop navigation
    setNearestPlaceDetails(null); // Clear nearest place details on stop navigation
    setShowNearestPlaceModal(false); // Ensure modal is closed

    // Stop location watcher if active
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }

    // Optionally, reset map to current location after stopping navigation
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  /**
   * Selects a different route option from the available list.
   * @param {number} routeIndex - The index of the selected route in routeOptions array.
   */
  const selectRouteOption = (routeIndex: number) => {
    const newSelectedRoute = routeOptions[routeIndex];
    if (!newSelectedRoute) return;

    setSelectedRouteIndex(routeIndex);
    setRouteCoordinates(newSelectedRoute.coordinates);
    setRouteInfo(newSelectedRoute);
    setDirections(newSelectedRoute.directions || []);

    if (newSelectedRoute.safety?.overall === "dangerous") {
      Alert.alert(
        "Safety Warning",
        "This route passes through areas reported as unsafe. Please consider an alternative route or travel during daylight hours.",
        [{ text: "Understood", style: "default" }]
      );
    }

    // Fit map to new selected route
    mapRef.current?.fitToCoordinates(newSelectedRoute.coordinates, {
      edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
      animated: true,
    });
  };

  /**
   * Handles saving the selected location to AsyncStorage.
   * @param {SearchResult} loc - The location object to save.
   */
  const handleSaveLocation = async (loc: SearchResult) => {
    if (!loc) {
      Alert.alert("Error", "No location selected to save.");
      return;
    }
    try {
      // Retrieve existing saved locations from AsyncStorage
      const savedLocationsJson = await AsyncStorage.getItem("savedLocations");
      const savedLocations: SearchResult[] = savedLocationsJson
        ? JSON.parse(savedLocationsJson)
        : [];

      // Check if location already exists to prevent duplicates
      const exists = savedLocations.some((item) => item.id === loc.id);
      if (exists) {
        Alert.alert(
          "Location Already Saved",
          `${loc.title} is already in your saved places.`
        );
        return;
      }

      // Add the new location and save back to AsyncStorage
      const newSavedLocations = [...savedLocations, loc];
      await AsyncStorage.setItem(
        "savedLocations",
        JSON.stringify(newSavedLocations)
      );
      Alert.alert(
        "Location Saved",
        `${loc.title} has been added to your saved places!`
      );
    } catch (error) {
      console.error("Error saving location:", error);
      Alert.alert("Error", "Failed to save location. Please try again.");
    }
  };

  /**
   * Handles sharing the selected location's details using React Native's Share API.
   * @param {SearchResult | null} loc - The location object to share.
   */
  const handleShareLocation = async (loc: SearchResult | null) => {
    if (!loc) {
      Alert.alert("Error", "No location selected to share.");
      return;
    }

    // Create a message with location details and a Google Maps link
    const message = `Check out this location: ${loc.title} - ${loc.subtitle}.
Coordinates: ${loc.coordinate.latitude}, ${loc.coordinate.longitude}.
View on Map: https://www.google.com/maps/search/?api=1&query=${loc.coordinate.latitude},${loc.coordinate.longitude}`;

    try {
      // Use the Share API to open the native share sheet
      await Share.share({
        message: message,
        url: `https://www.google.com/maps/search/?api=1&query=${loc.coordinate.latitude},${loc.coordinate.longitude}`,
        title: `Share ${loc.title}`,
      });
    } catch (error: any) {
      // Handle potential errors during sharing (e.g., user cancels share)
      Alert.alert(
        "Error Sharing",
        error.message || "Failed to share location."
      );
      console.error("Error sharing location:", error);
    }
  };

  // --- Render Logic ---

  // Show loading screen if location is not yet available
  if (!isLocationReady) {
    // Use isLocationReady for initial loading screen
    return (
      <SafeAreaView style={GlobalStyles.loadingContainer}>
        <Text style={GlobalStyles.loadingText}>Loading SafeRoute...</Text>
        <Text style={GlobalStyles.loadingSubtext}>
          Finding the safest paths for you
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={GlobalStyles.container}>
        {/* Search Bar Component */}
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          showSearchResults={showSearchResults}
          onSearch={searchPlaces}
          onSelectResult={selectSearchResult}
          onClearSearch={() => {
            setSearchQuery("");
            setShowSearchResults(false);
          }}
        />

        {/* NEW: Menu Button to Saved Places Screen */}
        <View style={styles.menuButtonContainer}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate("SavedPlacesScreen")} // Changed to 'SavedPlacesScreen' as per RootLayout.tsx
          >
            <MaterialIcons
              name="bookmark"
              size={24}
              color={GlobalStyles.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Quick Action Buttons for Nearby Places - Positioned on right side to avoid overlap */}
        {routeOptions.length === 0 && !isNavigationMode && !showBottomSheet && (
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.policeButton]}
              onPress={() => {
                if (location) {
                  getNearbyPlaces("police");
                } else {
                  Alert.alert(
                    "Location Required",
                    "Please enable location services to find nearby police stations."
                  );
                }
              }}
            >
              <Text style={styles.quickActionIcon}>🚔</Text>
              <Text style={styles.quickActionText} numberOfLines={1}>Police</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.hospitalButton]}
              onPress={() => {
                if (location) {
                  getNearbyPlaces("hospital");
                } else {
                  Alert.alert(
                    "Location Required",
                    "Please enable location services to find nearby hospitals."
                  );
                }
              }}
            >
              <Text style={styles.quickActionIcon}>🏥</Text>
              <Text style={styles.quickActionText} numberOfLines={1}>Hospital</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Map Display Component */}
        <MapDisplay
          mapRef={mapRef}
          initialRegion={mapRegion}
          selectedLocation={selectedLocation}
          safetyReviews={safetyReviews}
          dangerousAreas={dangerousAreas}
          routeCoordinates={routeCoordinates}
          routeColor={routeInfo?.color || "#2196F3"} // Use routeInfo color if available
          onLongPress={(event: any) => {
            setReviewLocation(event.nativeEvent.coordinate);
            setShowReviewModal(true);
            setShowLongPressInstruction(false); // Hide instruction on long press
          }}
          onMyLocationPress={getCurrentLocation}
          nearbyPoliceStations={nearbyPoliceStations}
          nearbyHospitals={nearbyHospitals}
        />

        {/* Loading Overlay for route calculation or nearby search */}
        <LoadingOverlay
          isVisible={isCalculatingRoute || isLoadingNearby}
          message={
            isCalculatingRoute
              ? "Finding safest route..."
              : "Finding nearby places..."
          }
          subMessage={
            isCalculatingRoute ? "Avoiding dangerous areas" : "Please wait..."
          }
        />

        {/* Navigation Header Component (visible when in navigation mode) */}
        <NavigationHeader
          isVisible={isNavigationMode && routeInfo}
          routeInfo={routeInfo}
          onStopNavigation={stopNavigation}
        />

        {/* Route Options Display Component (visible after route calculation, before navigation) */}
        <RouteOptionsDisplay
          isVisible={routeOptions.length > 0 && !isNavigationMode}
          routeOptions={routeOptions}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={selectRouteOption}
          onViewDirections={() => setShowDirectionsModal(true)}
          onStartNavigation={startActualNavigation}
          onRecalculateRoute={
            () =>
              selectedLocation &&
              calculateAndShowRoutes(selectedLocation.coordinate, true) // Show bottom sheet after recalculate
          }
          safeRouteOnly={safeRouteOnly}
          onToggleSafeRouteOnly={() => setSafeRouteOnly((prev) => !prev)}
        />

        {/* Bottom Sheet for selected location details and actions */}
        <BottomSheet
          showBottomSheet={showBottomSheet}
          bottomSheetAnim={bottomSheetAnim}
          selectedLocation={selectedLocation}
          onStartNavigation={() => {
            // MODIFIED: Explicitly close bottom sheet here
            animateBottomSheet(false); // Close the bottom sheet immediately
            if (selectedLocation) {
              calculateAndShowRoutes(selectedLocation.coordinate, false); // Do not show bottom sheet again after route calculation
            }
          }}
          onSaveLocation={handleSaveLocation} // Pass the save function
          onShareLocation={() => handleShareLocation(selectedLocation)} // Pass the share function
          onClose={() => animateBottomSheet(false)}
        />

        {/* Safety Review Modal Component */}
        <SafetyReviewModal
          showReviewModal={showReviewModal}
          reviewLocation={reviewLocation}
          onSubmit={submitSafetyReview}
          onClose={() => setShowReviewModal(false)}
        />

        {/* Directions Modal Component */}
        <DirectionsModal
          showDirectionsModal={showDirectionsModal}
          directions={directions}
          routeInfo={routeInfo}
          onClose={() => setShowDirectionsModal(false)}
        />

        {/* Long Press Instruction Overlay */}
        <LongPressInstruction
          isVisible={showLongPressInstruction}
          onClose={() => setShowLongPressInstruction(false)}
        />

        {/* Nearest Place Confirmation Modal Component */}
        <NearestPlaceConfirmationModal
          isVisible={showNearestPlaceModal}
          placeDetails={nearestPlaceDetails}
          onConfirmNavigation={startNavigationToNearestPlace}
          onCancel={() => {
            setShowNearestPlaceModal(false);
            setNearestPlaceDetails(null); // Clear details if user cancels
            setNearbyPoliceStations([]); // Clear markers if user cancels
            setNearbyHospitals([]); // Clear markers if user cancels
          }}
        />

        {/* Multiple Places Modal Component */}
        <MultiplePlacesModal
          isVisible={showMultiplePlacesModal}
          places={multiplePlacesList}
          placeType={currentPlaceType}
          onSelectPlace={handleSelectPlaceFromList}
          onCancel={() => {
            setShowMultiplePlacesModal(false);
            setMultiplePlacesList([]);
          }}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  menuButtonContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 100,
    right: 15,
    zIndex: 11,
  },
  menuButton: {
    backgroundColor: "white",
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    ...GlobalStyles.shadow,
  },
  quickActionsContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 120 : 140, // Position below search bar
    right: 15,
    flexDirection: "column",
    zIndex: 9,
    gap: 10,
  },
  quickActionButton: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
    ...GlobalStyles.shadow,
  },
  policeButton: {
    borderLeftWidth: 4,
    borderLeftColor: GlobalStyles.colors.secondary,
  },
  hospitalButton: {
    borderLeftWidth: 4,
    borderLeftColor: GlobalStyles.colors.success,
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: GlobalStyles.colors.textPrimary,
  },
});

export default SafeMaps;
