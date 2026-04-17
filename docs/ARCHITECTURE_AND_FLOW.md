# SafeRoute - Architecture & Data Flow Documentation

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Layer Architecture](#layer-architecture)
3. [Core Data Flows](#core-data-flows)
4. [Component Interaction Diagrams](#component-interaction-diagrams)
5. [State Management Flow](#state-management-flow)
6. [External Service Integration](#external-service-integration)
7. [Background Task Architecture](#background-task-architecture)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SAFEROUTE APPLICATION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    PRESENTATION LAYER                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │  │
│  │  │   Home     │  │  Navigate  │  │  Contacts  │             │  │
│  │  │  Screen    │  │   Screen   │  │   Screen   │             │  │
│  │  └────────────┘  └────────────┘  └────────────┘             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │  │
│  │  │    SOS     │  │  Settings  │  │Live Share  │             │  │
│  │  │  Screen    │  │   Screen   │  │   Screen   │             │  │
│  │  └────────────┘  └────────────┘  └────────────┘             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    COMPONENT LAYER                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │MapDisplay│  │RouteOpts │  │SearchBar │  │BottomSht │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │SafetyRev │  │Directions│  │LoadingOvr│  │  Modals  │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SERVICE LAYER                              │  │
│  │  ┌────────────────────┐      ┌────────────────────┐          │  │
│  │  │RouteSafetyService │      │   TwilioService    │          │  │
│  │  │  - OSM Integration │      │ - WhatsApp Alerts  │          │  │
│  │  │  - Weather API     │      │ - Location Share   │          │  │
│  │  │  - Safety Scoring  │      │ - Emergency SOS    │          │  │
│  │  └────────────────────┘      └────────────────────┘          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    DATA LAYER                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │   Firebase   │  │ AsyncStorage │  │  TaskManager │       │  │
│  │  │  - Realtime  │  │  - Contacts  │  │  - BG Tasks  │       │  │
│  │  │  - Auth      │  │  - Settings  │  │  - Location  │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 EXTERNAL SERVICES                             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │  Google  │  │   OSM    │  │OpenWeather│ │  Twilio  │    │  │
│  │  │   Maps   │  │Overpass  │  │    API    │ │ WhatsApp │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer Architecture

### 1. Presentation Layer (Screens)
**Location**: `/app` directory

#### Tab Screens (`/app/(tabs)/`)
- **Home.tsx**: Dashboard with quick actions
- **navigate.tsx**: Main navigation with map and routing
- **contacts.tsx**: Emergency contact management
- **SOS.tsx**: Emergency alert system
- **settings.tsx**: User preferences

#### Modal Screens
- **LiveLocationShareScreen.tsx**: Real-time location sharing
- **SavedPlacesScreen.tsx**: Saved location management
- **Login.tsx / Signup.tsx**: Authentication

### 2. Component Layer
**Location**: `/components` directory

#### Map Components (`/components/maps/`)
- **MapDisplay.native.js**: Native map rendering (Google Maps)
- **MapDisplay.web.js**: Web map rendering
- **RouteOptionDisplay.js**: Route alternatives UI
- **BottomSheet.js**: Location details panel
- **SearchBar.js**: Place search interface
- **SafetyReviewModal.js**: Safety rating submission
- **DirectionModal.js**: Turn-by-turn directions
- **NavigationHeader.js**: Active navigation UI

#### UI Components
- **ThemedText.tsx / ThemedView.tsx**: Theme-aware components
- **LoadingOverlay.js**: Loading states
- **Modals**: Various confirmation and input modals

### 3. Service Layer
**Location**: `/services` directory

#### routeSafetyService.ts
- OSM Overpass API integration
- OpenWeather API integration
- Multi-factor safety scoring algorithm
- Route segment analysis
- Caching and rate limiting

#### twilioService.ts
- WhatsApp message sending
- Emergency alert formatting
- Phone number validation
- Base64 encoding for auth

### 4. Data Layer
**Location**: `/config` directory

#### firebase.ts
- Firebase initialization
- Realtime Database setup
- Authentication configuration
- AsyncStorage persistence

#### Local Storage (AsyncStorage)
- Contacts storage
- Saved places
- User preferences
- Sharing status

#### Background Tasks (TaskManager)
- Location tracking
- Real-time updates
- Foreground service notifications

---

## Core Data Flows

### Flow 1: Route Calculation & Safety Analysis

```
User Input (Destination)
        ↓
┌───────────────────────────────────────────────────────────┐
│ navigate.tsx (Main Screen)                                │
│ - Validates location permissions                          │
│ - Captures origin (current) & destination coordinates     │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ calculateAndShowRoutes()                                  │
│ - Calls getMultipleGoogleRoutes()                        │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Google Directions API                                     │
│ - Fetches standard routes                                │
│ - Fetches alternatives (avoid highways, tolls)           │
│ - Returns polyline coordinates                           │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ decodePolyline()                                          │
│ - Converts encoded polyline to coordinate array          │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ analyzeRouteSafety() (navigate.tsx)                      │
│ - Samples route coordinates (every 5th point)            │
│ - Calls calculateRouteSafetyScore()                      │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ routeSafetyService.ts                                     │
│ calculateRouteSafetyScore()                               │
│   ↓                                                        │
│   For each segment (max 5 segments):                     │
│   ├─ calculateSegmentSafetyScore()                       │
│   │   ├─ getWeatherScore() → OpenWeather API            │
│   │   ├─ getStreetLightingScore() → OSM API             │
│   │   ├─ getPoliceStationsCount() → OSM API             │
│   │   ├─ getHospitalsCount() → OSM API                  │
│   │   ├─ getPublicTransportScore() → OSM API            │
│   │   ├─ getResidentialDensityScore() → OSM API         │
│   │   └─ Weighted scoring calculation                    │
│   └─ 1 second delay between segments (rate limiting)     │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Route Scoring & Sorting                                   │
│ - Assigns safety score (0-5) to each route               │
│ - Determines status: safe/caution/dangerous/unreviewed   │
│ - Assigns color: green/yellow/red/blue                   │
│ - Sorts by: safety score → duration                      │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ UI Update                                                  │
│ - setRouteOptions() with scored routes                   │
│ - Display RouteOptionsDisplay component                  │
│ - Show safest route first                                │
│ - Alert if all routes dangerous                          │
└───────────────────────────────────────────────────────────┘
```


### Flow 2: Safety Review Submission

```
User Long-Press on Map
        ↓
┌───────────────────────────────────────────────────────────┐
│ MapDisplay.native.js                                      │
│ - onLongPress event triggered                            │
│ - Captures coordinate from event.nativeEvent.coordinate  │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ navigate.tsx                                              │
│ - setReviewLocation(coordinate)                          │
│ - setShowReviewModal(true)                               │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ SafetyReviewModal.js                                      │
│ - User inputs:                                            │
│   • Rating (1-5 stars)                                    │
│   • Comment (text)                                        │
│   • Category (crime/lighting/infrastructure/etc)         │
│ - Validates input                                         │
│ - Calls onSubmit callback                                │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ submitSafetyReview() (navigate.tsx)                      │
│ - Gets current user ID from Firebase Auth                │
│ - Creates review object with:                            │
│   • latitude, longitude                                   │
│   • rating, comment, category                            │
│   • userId, timestamp                                     │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Firebase Realtime Database                                │
│ - push() to "safety_reviews" node                        │
│ - set() review data with serverTimestamp                 │
│ - Returns unique key                                      │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Local State Update                                        │
│ - Add review to safetyReviews array                      │
│ - If rating ≤ 2: add to dangerousAreas array            │
│ - Update map markers                                      │
│ - Show success alert                                      │
└───────────────────────────────────────────────────────────┘
```

### Flow 3: Emergency SOS

```
User Presses SOS Button
        ↓
┌───────────────────────────────────────────────────────────┐
│ SOS.tsx                                                    │
│ - onButtonPress() triggered                               │
│ - setLoading(true)                                        │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Emergency Call                                             │
│ - Linking.openURL('tel:122')                             │
│ - Opens phone dialer with emergency number                │
└───────────────────────────────────────────────────────────┘
        ↓ (Parallel)
┌───────────────────────────────────────────────────────────┐
│ loadEmergencyContacts()                                   │
│ - AsyncStorage.getItem(CONTACTS_STORAGE_KEY)             │
│ - Parse JSON to Contact[] array                          │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Get Current Location                                       │
│ - Location.requestForegroundPermissionsAsync()           │
│ - Location.getCurrentPositionAsync()                     │
│ - Extract lat, lng coordinates                           │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ sendLocationToAllContacts()                               │
│ - Create emergency message with:                         │
│   • "🚨 EMERGENCY SOS - Live Location"                   │
│   • Latitude, Longitude                                   │
│   • Google Maps link                                      │
│ - Loop through all contacts                              │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ twilioService.ts                                          │
│ sendWhatsAppLocationViaTwilio()                          │
│   ↓                                                        │
│   For each contact:                                       │
│   ├─ Format phone number (add +91, whatsapp: prefix)    │
│   ├─ Create URLSearchParams with From/To/Body           │
│   ├─ Base64 encode credentials                          │
│   ├─ POST to Twilio API                                 │
│   ├─ Handle response/errors                             │
│   └─ 500ms delay between messages                       │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Result Aggregation                                         │
│ - Count successCount, failCount                          │
│ - Track successContacts[], failedContacts[]              │
│ - Show alert with results                                │
└───────────────────────────────────────────────────────────┘
```

### Flow 4: Live Location Sharing

```
User Navigates to LiveLocationShareScreen
        ↓
┌───────────────────────────────────────────────────────────┐
│ LiveLocationShareScreen.tsx                               │
│ - useEffect: loadContactsFromStorage()                   │
│ - useEffect: loadSharingStatus()                         │
│ - useEffect: Firebase Auth listener                      │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Firebase Authentication                                    │
│ - onAuthStateChanged() listener                          │
│ - If no user: signInAnonymously()                        │
│ - Set currentUserId                                       │
└───────────────────────────────────────────────────────────┘
        ↓
User Presses "Start Sharing"
        ↓
┌───────────────────────────────────────────────────────────┐
│ handleStartSharing()                                      │
│ - Validate currentUserId exists                          │
│ - Validate contacts exist                                │
│ - requestPermissions()                                    │
│   ├─ Foreground location permission                      │
│   └─ Background location permission                      │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Location.startLocationUpdatesAsync()                     │
│ - Task: LOCATION_TRACKING_TASK                           │
│ - Config:                                                 │
│   • accuracy: Balanced                                    │
│   • timeInterval: 10000ms                                │
│   • distanceInterval: 10m                                │
│   • foregroundService notification                       │
│ - taskOptions:                                            │
│   • sharingWithContacts: Contact[]                       │
│   • userId: string                                        │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ TaskManager.defineTask() (Background)                     │
│ - Runs in background/foreground                          │
│ - Receives location updates                              │
│ - Extracts: lat, lng, accuracy, speed, heading          │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Firebase Firestore                                         │
│ - setDoc(doc(db, "live_locations", userId))              │
│ - Merge: true (update existing document)                 │
│ - Data:                                                    │
│   • latitude, longitude, timestamp                       │
│   • accuracy, speed, heading                             │
│   • sharingWith: Contact[]                               │
│   • serverTimestamp                                       │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ UI Updates (useFocusEffect)                               │
│ - Interval: 5000ms                                        │
│ - getCurrentPositionAsync() for display                  │
│ - Update currentLocation state                           │
│ - Show lat/lng/accuracy on screen                        │
└───────────────────────────────────────────────────────────┘
```

### Flow 5: Search & Navigation

```
User Types in SearchBar
        ↓
┌───────────────────────────────────────────────────────────┐
│ SearchBar.js                                              │
│ - onChangeText updates searchQuery                       │
│ - Debounced call to onSearch callback                    │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ searchPlaces() (navigate.tsx)                            │
│ - Validates query not empty                              │
│ - Validates API key exists                               │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Google Places Text Search API                             │
│ - URL: /place/textsearch/json                            │
│ - Params: query, key, locationbias                       │
│ - Returns: results[] with place details                  │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Format Results                                             │
│ - Map to SearchResult[] (top 5)                          │
│ - Extract: id, title, subtitle, coordinate              │
│ - setSearchResults()                                      │
│ - setShowSearchResults(true)                             │
└───────────────────────────────────────────────────────────┘
        ↓
User Selects Result
        ↓
┌───────────────────────────────────────────────────────────┐
│ selectSearchResult()                                      │
│ - setSelectedLocation(result)                            │
│ - animateBottomSheet(true)                               │
│ - mapRef.animateToRegion()                               │
└───────────────────────────────────────────────────────────┘
        ↓
User Presses "Start Navigation" in BottomSheet
        ↓
┌───────────────────────────────────────────────────────────┐
│ BottomSheet.js                                            │
│ - onStartNavigation callback                             │
│ - animateBottomSheet(false)                              │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ calculateAndShowRoutes()                                  │
│ - [See Flow 1: Route Calculation]                        │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ RouteOptionsDisplay.js                                    │
│ - Shows multiple route options                           │
│ - Displays safety scores with colors                     │
│ - User can select different route                        │
│ - "Start Navigation" button                              │
└───────────────────────────────────────────────────────────┘
        ↓
User Presses "Start Navigation"
        ↓
┌───────────────────────────────────────────────────────────┐
│ startActualNavigation() (navigate.tsx)                   │
│ - setIsNavigationMode(true)                              │
│ - Location.watchPositionAsync()                          │
│   • accuracy: High                                        │
│   • timeInterval: 1000ms                                 │
│   • distanceInterval: 10m                                │
│ - setLocationWatcher()                                    │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Live Navigation Updates                                    │
│ - Callback receives newLocation                          │
│ - mapRef.animateCamera() to follow user                 │
│ - Update center to user's position                       │
│ - NavigationHeader shows route info                      │
└───────────────────────────────────────────────────────────┘
```

---

## Component Interaction Diagrams

### Navigate Screen Component Tree

```
navigate.tsx (Main Container)
│
├─ SearchBar.js
│  └─ Shows search results dropdown
│
├─ MapDisplay.native.js
│  ├─ MapView (react-native-maps)
│  ├─ Marker (selected location)
│  ├─ Marker[] (safety reviews)
│  ├─ Circle[] (dangerous areas)
│  ├─ Polyline (route)
│  ├─ Marker[] (nearby police/hospitals)
│  └─ My Location Button
│
├─ LoadingOverlay.js
│  └─ Shows during route calculation
│
├─ NavigationHeader.js
│  └─ Visible during active navigation
│
├─ RouteOptionsDisplay.js
│  ├─ Route cards with safety scores
│  ├─ SafetyToggle.js
│  └─ Action buttons
│
├─ BottomSheet.js
│  ├─ Location details
│  └─ Action buttons (Navigate, Save, Share)
│
├─ SafetyReviewModal.js
│  └─ SafetyReviewForm.js
│
├─ DirectionsModal.js
│  └─ Turn-by-turn instructions list
│
├─ LongPressInstruction.js
│  └─ Tooltip overlay
│
├─ NearestPlaceConfirmationModal.js
│  └─ Single place confirmation
│
└─ MultiplePlacesModal.js
   └─ List of nearby places
```

### State Flow in Navigate Screen

```
┌─────────────────────────────────────────────────────────┐
│                    LOCATION STATE                        │
│ - location: LocationObject | null                       │
│ - isLocationReady: boolean                              │
│ - mapRegion: Region                                      │
│ - currentRegionName: string                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    SEARCH STATE                          │
│ - searchQuery: string                                    │
│ - searchResults: SearchResult[]                         │
│ - showSearchResults: boolean                            │
│ - selectedLocation: SearchResult | null                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    ROUTE STATE                           │
│ - routeCoordinates: Coordinate[]                        │
│ - routeInfo: RouteInfo | null                           │
│ - routeOptions: RouteInfo[]                             │
│ - selectedRouteIndex: number                            │
│ - isCalculatingRoute: boolean                           │
│ - isNavigationMode: boolean                             │
│ - directions: Direction[]                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    SAFETY STATE                          │
│ - safetyReviews: SafetyReview[]                         │
│ - dangerousAreas: DangerousArea[]                       │
│ - safeRouteOnly: boolean                                │
│ - showReviewModal: boolean                              │
│ - reviewLocation: Coordinate | null                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    NEARBY STATE                          │
│ - nearbyPoliceStations: SearchResult[]                  │
│ - nearbyHospitals: SearchResult[]                       │
│ - isLoadingNearby: boolean                              │
│ - nearestPlaceDetails: any                              │
│ - multiplePlacesList: any[]                             │
└─────────────────────────────────────────────────────────┘
```

---

## State Management Flow

### React State Management Pattern

SafeRoute uses **local component state** with React hooks (no Redux/MobX):

```
┌─────────────────────────────────────────────────────────┐
│                    STATE HOOKS                           │
│                                                           │
│  useState() - Local component state                      │
│  useEffect() - Side effects & lifecycle                  │
│  useCallback() - Memoized functions                      │
│  useRef() - Refs for MapView & animations               │
│  useFocusEffect() - Navigation-aware effects            │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### State Persistence Strategy

```
┌──────────────────┐
│  AsyncStorage    │  ← Contacts, Saved Places, Settings
├──────────────────┤
│  Firebase RTDB   │  ← Safety Reviews (synced)
├──────────────────┤
│  Firestore       │  ← Live Locations (real-time)
├──────────────────┤
│  TaskManager     │  ← Background task state
└──────────────────┘
```

### Cross-Screen Communication

```
Navigation Params (route.params)
        ↓
┌─────────────────────────────────────────────────────────┐
│ Home → Navigate                                          │
│ - showPoliceStations: boolean                           │
│ - showHospitals: boolean                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ SavedPlaces → Navigate                                   │
│ - selectedPlaceForMap: Coordinate                       │
│ - selectedPlaceTitle: string                            │
│ - selectedPlaceSubtitle: string                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Contacts → LiveLocationShare                             │
│ - startSharing: boolean                                  │
│ - targetContact: Contact                                │
│ - shareWithAll: boolean                                  │
└─────────────────────────────────────────────────────────┘
```


---

## External Service Integration

### 1. Google Maps Services

```
┌─────────────────────────────────────────────────────────┐
│              GOOGLE MAPS API INTEGRATION                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Directions API                                          │
│  ├─ Endpoint: /directions/json                          │
│  ├─ Purpose: Calculate routes between points            │
│  ├─ Returns: Polyline, distance, duration, steps        │
│  └─ Usage: getMultipleGoogleRoutes()                    │
│                                                           │
│  Places Text Search API                                  │
│  ├─ Endpoint: /place/textsearch/json                    │
│  ├─ Purpose: Search for locations by name               │
│  ├─ Returns: Place details, coordinates                 │
│  └─ Usage: searchPlaces()                               │
│                                                           │
│  Places Nearby Search API                                │
│  ├─ Endpoint: /place/nearbysearch/json                  │
│  ├─ Purpose: Find nearby police/hospitals               │
│  ├─ Returns: List of places within radius               │
│  └─ Usage: getNearbyPlaces()                            │
│                                                           │
│  Maps SDK (Native)                                       │
│  ├─ Library: react-native-maps                          │
│  ├─ Provider: PROVIDER_GOOGLE                           │
│  └─ Features: Markers, Polylines, Circles               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2. OpenStreetMap (OSM) Overpass API

```
┌─────────────────────────────────────────────────────────┐
│           OSM OVERPASS API INTEGRATION                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Endpoint: https://overpass-api.de/api/interpreter      │
│  Method: GET with data query parameter                  │
│                                                           │
│  Queries:                                                │
│  ├─ Street Lighting                                      │
│  │  └─ node["highway"="street_lamp"]                    │
│  ├─ Police Stations                                      │
│  │  └─ node["amenity"="police"]                         │
│  ├─ Hospitals                                            │
│  │  └─ node["amenity"="hospital"]                       │
│  ├─ Public Transport                                     │
│  │  ├─ node["highway"="bus_stop"]                       │
│  │  ├─ node["railway"="station"]                        │
│  │  └─ node["station"="subway"]                         │
│  └─ Residential Buildings                                │
│     └─ way["building"="residential"]                    │
│                                                           │
│  Rate Limiting:                                          │
│  ├─ Min interval: 2000ms between requests               │
│  ├─ Retry logic: Exponential backoff                    │
│  ├─ Cache duration: 5 minutes                           │
│  └─ Max segments: 5 per route                           │
│                                                           │
│  Bounding Box:                                           │
│  └─ Format: (south,west,north,east)                     │
│  └─ Radius: 0.5-1km around point                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 3. OpenWeather API

```
┌─────────────────────────────────────────────────────────┐
│           OPENWEATHER API INTEGRATION                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Endpoint: /data/2.5/weather                            │
│  Method: GET                                             │
│                                                           │
│  Parameters:                                             │
│  ├─ lat: latitude                                        │
│  ├─ lon: longitude                                       │
│  ├─ units: metric                                        │
│  └─ appid: API key                                       │
│                                                           │
│  Returns:                                                │
│  ├─ weather[].main (Rain, Snow, Fog, etc)              │
│  ├─ weather[].description                               │
│  ├─ visibility (meters)                                 │
│  └─ wind.speed (m/s)                                    │
│                                                           │
│  Scoring Logic:                                          │
│  ├─ Start: 5 (perfect)                                  │
│  ├─ Rain/Thunderstorm: -1.5                             │
│  ├─ Snow: -2                                             │
│  ├─ Fog/Mist: -1.5                                      │
│  ├─ Visibility < 1km: -1                                │
│  ├─ Visibility < 5km: -0.5                              │
│  └─ Wind > 15 m/s: -0.5                                 │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 4. Twilio WhatsApp API

```
┌─────────────────────────────────────────────────────────┐
│            TWILIO WHATSAPP INTEGRATION                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Endpoint: /2010-04-01/Accounts/{SID}/Messages.json    │
│  Method: POST                                            │
│  Auth: Basic (Base64 encoded SID:Token)                 │
│                                                           │
│  Request Body (URLSearchParams):                        │
│  ├─ From: whatsapp:+14155238886 (Sandbox)              │
│  ├─ To: whatsapp:+91XXXXXXXXXX                          │
│  └─ Body: Message text with location                    │
│                                                           │
│  Phone Number Formatting:                                │
│  ├─ Remove non-digits (except +)                        │
│  ├─ Add +91 if 10-digit number                          │
│  └─ Prepend "whatsapp:" prefix                          │
│                                                           │
│  Error Handling:                                         │
│  ├─ 400: Invalid number format                          │
│  ├─ 401/403: Auth failed                                │
│  ├─ 404: Number not found                               │
│  └─ 21211: User not opted in to sandbox                 │
│                                                           │
│  Usage:                                                  │
│  ├─ SOS emergency alerts                                │
│  └─ Live location sharing                               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 5. Firebase Services

```
┌─────────────────────────────────────────────────────────┐
│              FIREBASE INTEGRATION                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Firebase Authentication                                 │
│  ├─ Method: Anonymous sign-in                           │
│  ├─ Persistence: AsyncStorage                           │
│  ├─ Purpose: User identification                        │
│  └─ Usage: Live location tracking                       │
│                                                           │
│  Firebase Realtime Database                              │
│  ├─ Node: "safety_reviews"                              │
│  ├─ Structure:                                           │
│  │  └─ {reviewId}                                        │
│  │     ├─ latitude: number                              │
│  │     ├─ longitude: number                             │
│  │     ├─ rating: number (1-5)                          │
│  │     ├─ comment: string                               │
│  │     ├─ category: string                              │
│  │     ├─ userId: string                                │
│  │     ├─ timestamp: serverTimestamp                    │
│  │     └─ createdAt: ISO string                         │
│  ├─ Operations:                                          │
│  │  ├─ push(): Create new review                        │
│  │  ├─ set(): Write review data                         │
│  │  └─ get(): Load reviews (last 1000)                  │
│  └─ Query: orderByChild("createdAt").limitToLast(1000) │
│                                                           │
│  Firebase Firestore                                      │
│  ├─ Collection: "live_locations"                        │
│  ├─ Document ID: userId                                 │
│  ├─ Structure:                                           │
│  │  ├─ latitude: number                                 │
│  │  ├─ longitude: number                                │
│  │  ├─ timestamp: number                                │
│  │  ├─ accuracy: number                                 │
│  │  ├─ speed: number                                    │
│  │  ├─ heading: number                                  │
│  │  ├─ sharingWith: Contact[]                           │
│  │  ├─ isGeneralShare: boolean                          │
│  │  └─ serverTimestamp: ISO string                      │
│  └─ Operation: setDoc() with merge: true                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Background Task Architecture

### Location Tracking Task Flow

```
┌─────────────────────────────────────────────────────────┐
│                  TASK REGISTRATION                       │
│                                                           │
│  TaskManager.defineTask(LOCATION_TRACKING_TASK)         │
│  ├─ Defined globally (outside component)                │
│  ├─ Runs in background/foreground                       │
│  └─ Has access to Firebase services                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  TASK ACTIVATION                         │
│                                                           │
│  Location.startLocationUpdatesAsync()                   │
│  ├─ Task name: LOCATION_TRACKING_TASK                   │
│  ├─ Configuration:                                       │
│  │  ├─ accuracy: Balanced                               │
│  │  ├─ timeInterval: 10000ms (10 sec)                  │
│  │  ├─ distanceInterval: 10m                            │
│  │  └─ deferredUpdatesInterval: 5000ms                 │
│  ├─ Foreground Service:                                 │
│  │  ├─ notificationTitle                                │
│  │  ├─ notificationBody                                 │
│  │  └─ notificationColor                                │
│  └─ Task Options (custom data):                         │
│     ├─ sharingWithContacts: Contact[]                   │
│     ├─ isGeneralShare: boolean                          │
│     └─ userId: string                                    │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  TASK EXECUTION                          │
│                                                           │
│  Callback receives:                                      │
│  ├─ data.locations[]: Location[]                        │
│  ├─ error: Error | null                                 │
│  └─ executionInfo.taskOptions: custom data              │
│                                                           │
│  Process:                                                │
│  1. Extract latest location                             │
│  2. Get taskOptions (contacts, userId)                  │
│  3. Create locationData object                          │
│  4. Write to Firestore (setDoc with merge)             │
│                                                           │
│  Error Handling:                                         │
│  └─ Log errors, continue running                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  TASK PERSISTENCE                        │
│                                                           │
│  AsyncStorage:                                           │
│  └─ IS_SHARING_STORAGE_KEY: "true"/"false"              │
│                                                           │
│  On App Restart:                                         │
│  ├─ loadSharingStatus()                                 │
│  ├─ Check TaskManager.isTaskRegisteredAsync()          │
│  └─ Restore UI state if task running                    │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  TASK TERMINATION                        │
│                                                           │
│  Location.stopLocationUpdatesAsync()                    │
│  ├─ Stops background updates                            │
│  ├─ Removes foreground notification                     │
│  └─ Cleans up resources                                 │
│                                                           │
│  State Cleanup:                                          │
│  ├─ setIsSharing(false)                                 │
│  ├─ AsyncStorage.setItem(IS_SHARING_KEY, "false")      │
│  └─ Clear location data                                 │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Firebase Initialization in Background Context

```
┌─────────────────────────────────────────────────────────┐
│         FIREBASE BACKGROUND INITIALIZATION               │
│                                                           │
│  Problem: Background tasks run in separate context      │
│  Solution: Initialize Firebase globally                 │
│                                                           │
│  if (getApps().length === 0) {                          │
│    // First initialization                              │
│    firebaseApp = initializeApp(config)                  │
│    db = getFirestore(firebaseApp)                       │
│    auth = getAuth(firebaseApp)                          │
│  } else {                                                │
│    // Use existing app                                  │
│    firebaseApp = getApps()[0]                           │
│    db = getFirestore(firebaseApp)                       │
│    auth = getAuth(firebaseApp)                          │
│  }                                                        │
│                                                           │
│  Auth State Listener (Global):                          │
│  auth.onAuthStateChanged((user) => {                    │
│    currentFirebaseUserId = user?.uid || null            │
│  })                                                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Safety Scoring Algorithm

### Multi-Factor Weighted Scoring

```
┌─────────────────────────────────────────────────────────┐
│              SAFETY SCORE CALCULATION                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Input Factors (0-5 scale):                             │
│  ├─ baseScore: User reviews (30% weight)                │
│  ├─ streetLighting: OSM lamp density (20% weight)       │
│  ├─ policeStations: Count within 1km (15% weight)       │
│  ├─ hospitals: Count within 1km (10% weight)            │
│  ├─ publicTransport: Stops/stations (10% weight)        │
│  ├─ weather: Current conditions (10% weight)            │
│  └─ residentialDensity: Building count (5% weight)      │
│                                                           │
│  Formula:                                                │
│  finalScore = Σ(factor × weight)                        │
│                                                           │
│  Normalization:                                          │
│  ├─ Police/Hospital: min(5, count × 1.5)               │
│  └─ Final: clamp(0, 5)                                  │
│                                                           │
│  Status Determination:                                   │
│  ├─ score ≥ 4.0: "safe" (green)                        │
│  ├─ score ≥ 2.5: "caution" (yellow)                    │
│  ├─ score < 2.5: "dangerous" (red)                     │
│  └─ baseScore = 0: "unreviewed" (blue)                 │
│                                                           │
│  Route Overall Status:                                   │
│  ├─ Any segment dangerous: "dangerous"                  │
│  ├─ Danger % > 10: "caution"                            │
│  ├─ Avg score ≥ 4: "safe"                               │
│  └─ 70% unreviewed: "unreviewed"                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Route Sampling Strategy

```
To avoid API rate limits:

1. Max 5 segments per route
2. Sample interval = max(20, routeLength / 5)
3. Always include start and end points
4. 1 second delay between segment calculations
5. 300ms delay between OSM queries within segment
6. Cache results for 5 minutes
```

---

## Performance Optimizations

### 1. API Rate Limiting & Caching

```
OSM Overpass API:
├─ Rate limit: 2000ms minimum between requests
├─ Cache duration: 5 minutes
├─ Cache key: queryType_roundedLat_roundedLng
├─ Retry logic: Exponential backoff (max 3 retries)
└─ Timeout: 15 seconds per request

Google APIs:
├─ No explicit rate limiting (paid tier)
└─ Results cached in component state

Weather API:
└─ Called once per route segment
```

### 2. Route Calculation Optimization

```
Polyline Decoding:
└─ Efficient algorithm (O(n) complexity)

Route Deduplication:
├─ Compare distance (±0.5km tolerance)
└─ Compare duration (±2min tolerance)

Segment Sampling:
├─ Max 5 segments per route
└─ Reduces API calls by 80-90%
```

### 3. Map Rendering Optimization

```
react-native-maps:
├─ PROVIDER_GOOGLE for native performance
├─ Polyline with zIndex for proper layering
├─ Marker clustering (implicit via limited markers)
└─ AnimateToRegion for smooth transitions

State Updates:
├─ useCallback for memoized functions
├─ useRef for MapView reference
└─ Conditional rendering based on state
```

### 4. Background Task Efficiency

```
Location Updates:
├─ Balanced accuracy (not High)
├─ 10 second time interval
├─ 10 meter distance interval
└─ Deferred updates: 5 seconds

Firestore Writes:
├─ setDoc with merge: true (upsert)
└─ Single document per user (no collection growth)
```

---

## Security Considerations

### 1. API Key Management

```
Environment Variables:
├─ .env file (not committed)
├─ app.json extras (for Expo)
└─ process.env.EXPO_PUBLIC_* prefix

Fallback Chain:
process.env → Constants.expoConfig.extra → Constants.expoConfig.android/ios
```

### 2. Firebase Security

```
Authentication:
├─ Anonymous auth for basic access
└─ User ID for data isolation

Realtime Database Rules:
├─ Read: Public (safety reviews)
└─ Write: Authenticated users only

Firestore Rules:
├─ Read: User's own document
└─ Write: User's own document
```

### 3. Location Privacy

```
Live Sharing:
├─ Explicit user consent required
├─ Foreground notification always visible
├─ User can stop sharing anytime
└─ Data deleted when sharing stops

Location Data:
├─ Stored with user consent
├─ Shared only with selected contacts
└─ Not publicly accessible
```

---

## Error Handling Strategy

### 1. Network Errors

```
API Failures:
├─ Try-catch blocks around all fetch calls
├─ Fallback to cached data when available
├─ User-friendly error messages
└─ Graceful degradation (continue with partial data)
```

### 2. Permission Errors

```
Location Permissions:
├─ Check before requesting
├─ Explain why permission needed
├─ Provide manual settings link
└─ Disable features if denied

Background Permission:
├─ Request after foreground granted
├─ Show detailed explanation
└─ Alert if denied (required for live sharing)
```

### 3. Data Errors

```
Firebase Errors:
├─ Catch and log all errors
├─ Fallback to local mock data
├─ Continue app functionality
└─ Retry on next app launch

AsyncStorage Errors:
├─ Try-catch on all operations
├─ Default values if read fails
└─ Log errors for debugging
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BUILD PROCESS                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Development:                                            │
│  ├─ expo start (Metro bundler)                          │
│  ├─ expo start --android                                │
│  └─ expo start --ios                                    │
│                                                           │
│  Production Build:                                       │
│  ├─ eas build --platform android                        │
│  ├─ eas build --platform ios                            │
│  └─ expo export:web (PWA)                               │
│                                                           │
│  Configuration:                                          │
│  ├─ app.json: App metadata, API keys                    │
│  ├─ eas.json: Build profiles                            │
│  └─ .env: Environment variables                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Future Architecture Considerations

### Scalability Improvements

1. **State Management**: Consider Redux/Zustand for complex state
2. **API Gateway**: Implement backend proxy for API key security
3. **Caching Layer**: Redis for shared cache across users
4. **Real-time Updates**: WebSocket for live safety alerts
5. **Offline Mode**: IndexedDB for full offline functionality

### Performance Enhancements

1. **Route Calculation**: Move to backend service
2. **Map Clustering**: Implement marker clustering for dense areas
3. **Lazy Loading**: Code splitting for faster initial load
4. **Image Optimization**: Compress and lazy load images

### Feature Additions

1. **User Profiles**: Full authentication with profiles
2. **Social Features**: Friend system, shared routes
3. **Analytics**: Track popular routes, safety trends
4. **ML Integration**: Predictive safety scoring
5. **Voice Navigation**: Turn-by-turn voice guidance

---

## Conclusion

SafeRoute's architecture is designed for:
- **Modularity**: Clear separation of concerns across layers
- **Scalability**: Can handle growing user base and features
- **Maintainability**: Well-organized code with clear patterns
- **Performance**: Optimized API usage and rendering
- **Reliability**: Robust error handling and fallbacks
- **Security**: Proper API key management and data privacy

The architecture leverages modern React Native patterns, external APIs for rich functionality, and Firebase for real-time data synchronization, creating a comprehensive safety-focused navigation application.
