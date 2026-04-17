# SafeRoute - Architecture Summary

Complete overview of SafeRoute's architecture, showing relationships between APIs, UI components, and data flow.

---

## Table of Contents
1. [Quick Reference Tables](#quick-reference-tables)
2. [Architecture Diagrams](#architecture-diagrams)
3. [API-Component Mapping](#api-component-mapping)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Integration Matrix](#integration-matrix)

---

## Quick Reference Tables

### Application Pages Overview

| Page | File | Primary APIs Used | Key Components | Purpose |
|------|------|-------------------|----------------|---------|
| **Home** | `app/(tabs)/Home.tsx` | None | Button, Image | Dashboard & quick actions |
| **Navigate** | `app/(tabs)/navigate.tsx` | Google Directions, Google Places, Firebase Realtime DB | MapDisplay, RouteOptionsDisplay, SearchBar, BottomSheet | Safety-aware navigation |
| **Contacts** | `app/(tabs)/contacts.tsx` | Twilio WhatsApp, Expo Location | Card, IconButton, TextInput | Emergency contact management |
| **SOS** | `app/(tabs)/SOS.tsx` | Twilio WhatsApp, Expo Location, Linking | Button, Image | Emergency alert system |
| **Saved Places** | `app/SavedPlacesScreen.tsx` | AsyncStorage | FlatList, Card | Manage saved locations |
| **Live Location** | `app/LiveLocationShareScreen.tsx` | Firebase Realtime DB, Expo Location, TaskManager | MapView, Button | Real-time GPS sharing |

### Map Components Overview

| Component | File | APIs Used | Parent Component | Purpose |
|-----------|------|-----------|------------------|---------|
| **MapDisplay** | `components/maps/MapDisplay.js` | react-native-maps | Navigate screen | Render map with markers |
| **RouteOptionsDisplay** | `components/maps/RouteOptionDisplay.js` | None | Navigate screen | Show route alternatives |
| **BottomSheet** | `components/maps/BottomSheet.js` | None | Navigate screen | Location details panel |
| **SearchBar** | `components/maps/SearchBar.js` | None | Navigate screen | Place search input |
| **DirectionsModal** | `components/maps/DirectionModal.js` | None | Navigate screen | Turn-by-turn instructions |
| **SafetyReviewModal** | `components/maps/SafetyReviewModal.js` | Firebase Realtime DB | Navigate screen | Submit safety ratings |
| **LoadingOverlay** | `components/maps/LoadingOverlay.js` | None | Navigate screen | Loading indicator |
| **NavigationHeader** | `components/maps/NavigationHeader.js` | None | Navigate screen | Active navigation info |
| **MultiplePlacesModal** | `components/maps/MultiplePlacesModal.js` | None | Navigate screen | Nearby places list |

### API Usage Matrix

| API | Used By | Purpose | Input | Output |
|-----|---------|---------|-------|--------|
| **Google Directions** | Navigate screen | Calculate routes | origin, destination coordinates | Route polyline, steps, distance, duration |
| **Google Places (Text Search)** | Navigate screen (SearchBar) | Search locations | query string | Place name, address, coordinates |
| **Google Places (Autocomplete)** | Navigate screen (SearchBar) | Autocomplete suggestions | partial query | Prediction list |
| **Google Places (Nearby)** | Navigate screen | Find nearby places | location, type, radius | List of nearby places |
| **Twilio WhatsApp** | Contacts, SOS screens | Send emergency messages | phone, message, location | Message status |
| **Firebase Firestore** | Navigate screen | Store/retrieve safety reviews | review data | Review documents |
| **Firebase Realtime DB** | Navigate, Live Location screens | Real-time location sharing | session ID, location | Live location updates |
| **Firebase Auth** | Navigate screen | Anonymous authentication | None | User ID |
| **Expo Location** | Navigate, Contacts, SOS, Live Location | GPS tracking | accuracy level | Coordinates, accuracy |
| **AsyncStorage** | Contacts, Saved Places | Local data persistence | key, value | Stored data |

### Service Layer Overview

| Service | File | APIs Used | Used By | Purpose |
|---------|------|-----------|---------|---------|
| **Route Safety Service** | `services/routeSafetyService.ts` | OSM Overpass API | Navigate screen | Calculate route safety scores |
| **Twilio Service** | `services/twilioService.ts` | Twilio WhatsApp API | Contacts, SOS screens | Send WhatsApp messages |

---

## Architecture Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SafeRoute Application                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Home Tab   │  │ Navigate Tab │  │ Contacts Tab │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │              Navigation Layer                       │     │
│  │  - Route calculation                                │     │
│  │  - Location tracking                                │     │
│  │  - Safety analysis                                  │     │
│  └─────────────────────────┬──────────────────────────┘     │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │              Service Layer                          │     │
│  │  - routeSafetyService.ts                           │     │
│  │  - twilioService.ts                                │     │
│  └─────────────────────────┬──────────────────────────┘     │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Google Maps    │ │    Firebase     │ │     Twilio      │
│  - Directions   │ │  - Firestore    │ │  - WhatsApp API │
│  - Places       │ │  - Realtime DB  │ └─────────────────┘
│  - Geocoding    │ │  - Auth         │
└─────────────────┘ └─────────────────┘
```

### Navigate Screen Component Hierarchy

```
Navigate Screen (SafeMaps)
│
├── SearchBar
│   └── Search Results Dropdown
│
├── MapDisplay
│   ├── User Location Marker
│   ├── Selected Location Marker
│   ├── Safety Review Markers
│   ├── Dangerous Area Circles
│   ├── Route Polyline
│   ├── Nearby Police Markers
│   ├── Nearby Hospital Markers
│   └── My Location Button
│
├── Quick Action Buttons
│   ├── Police Button
│   └── Hospital Button
│
├── RouteOptionsDisplay (when routes calculated)
│   ├── Safety Toggle
│   ├── Route Cards (horizontal scroll)
│   ├── Action Buttons
│   │   ├── Directions Button
│   │   └── Start Navigation Button
│   └── Recalculate Button
│
├── BottomSheet (when location selected)
│   ├── Location Title
│   ├── Location Subtitle
│   └── Action Buttons
│       ├── Safe Route
│       ├── Save
│       └── Share
│
├── Modals
│   ├── DirectionsModal
│   ├── SafetyReviewModal
│   ├── NearestPlaceConfirmationModal
│   └── MultiplePlacesModal
│
├── Overlays
│   ├── LoadingOverlay
│   ├── NavigationHeader
│   └── LongPressInstruction
│
└── State Management
    ├── Location State
    ├── Search State
    ├── Route State
    ├── Safety State
    └── UI State
```

---

## API-Component Mapping

### Google Directions API → Navigate Screen

**Flow:**
```
User selects destination
    ↓
Navigate screen calls getMultipleGoogleRoutes()
    ↓
Fetches from Google Directions API
    ↓
Decodes polyline to coordinates
    ↓
Passes to analyzeRouteSafety()
    ↓
Displays in RouteOptionsDisplay component
```

**Code Path:**
```typescript
// Navigate screen
const calculateAndShowRoutes = async (destination) => {
  const routes = await getMultipleGoogleRoutes(origin, destination);
  // routes → RouteOptionsDisplay
  setRouteOptions(routes);
};

// RouteOptionsDisplay renders
<RouteOptionsDisplay
  routeOptions={routeOptions}
  onSelectRoute={selectRouteOption}
/>
```

### Google Places API → SearchBar Component

**Flow:**
```
User types in SearchBar
    ↓
Debounced search (500ms)
    ↓
Navigate screen calls searchPlaces()
    ↓
Fetches from Google Places Text Search API
    ↓
Returns formatted results
    ↓
SearchBar displays dropdown
    ↓
User selects result
    ↓
BottomSheet shows location details
```

**Code Path:**
```typescript
// SearchBar component
<SearchBar
  searchQuery={searchQuery}
  onSearch={searchPlaces}
  searchResults={searchResults}
  onSelectResult={selectSearchResult}
/>

// Navigate screen
const searchPlaces = async (query) => {
  const response = await fetch(GOOGLE_PLACES_API);
  const results = formatResults(response);
  setSearchResults(results);
};
```

### Firebase Realtime DB → Live Location Screen

**Flow:**
```
User starts location sharing
    ↓
Live Location screen creates session
    ↓
Writes to Firebase: live_locations/{sessionId}
    ↓
Starts background location tracking
    ↓
Updates Firebase every 10 seconds
    ↓
Contacts can subscribe to session
    ↓
Receive real-time location updates
```

**Code Path:**
```typescript
// Live Location screen
const startLocationSharing = async () => {
  const sessionId = generateSessionId();
  const locationRef = ref(realtimeDb, `live_locations/${sessionId}`);
  
  await set(locationRef, {
    userId: currentUserId,
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: Date.now()
  });
  
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    timeInterval: 10000,
    distanceInterval: 10
  });
};
```

### Twilio WhatsApp API → Contacts Screen

**Flow:**
```
User presses WhatsApp share button
    ↓
Contacts screen gets current location
    ↓
Calls sendWhatsAppLocationViaTwilio()
    ↓
twilioService.ts formats message
    ↓
Sends POST to Twilio API
    ↓
Twilio delivers WhatsApp message
    ↓
Shows success/failure alert
```

**Code Path:**
```typescript
// Contacts screen
const handleShareViaWhatsApp = async (contact) => {
  const location = await Location.getCurrentPositionAsync();
  
  const result = await sendWhatsAppLocationViaTwilio(
    contact.phone,
    { latitude: location.coords.latitude, longitude: location.coords.longitude },
    contact.name
  );
  
  if (result.success) {
    Alert.alert("Location Shared", result.message);
  }
};

// twilioService.ts
export const sendWhatsAppLocationViaTwilio = async (phone, location, name) => {
  const response = await fetch(TWILIO_API_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${SID}:${TOKEN}`)}` },
    body: new URLSearchParams({
      From: TWILIO_WHATSAPP_NUMBER,
      To: `whatsapp:${phone}`,
      Body: `📍 Location: ${location.latitude}, ${location.longitude}`
    })
  });
  
  return { success: response.ok, message: "Sent successfully" };
};
```

---

## Data Flow Diagrams

### Route Calculation Flow

```
┌─────────────────┐
│  User Action    │
│  Select Dest    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Navigate Screen                    │
│  calculateAndShowRoutes()           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  getMultipleGoogleRoutes()          │
│  - Fetch standard routes            │
│  - Fetch avoid highways             │
│  - Fetch avoid tolls                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Google Directions API              │
│  Returns: routes with polylines     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  decodePolyline()                   │
│  Convert to coordinates array       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  analyzeRouteSafety()               │
│  - Get area safety scores           │
│  - Call routeSafetyService          │
│  - Calculate overall safety         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Route Safety Service               │
│  - Fetch OSM data                   │
│  - Calculate lighting score         │
│  - Calculate crowd score            │
│  - Return enhanced safety           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Sort routes by safety & duration   │
│  Assign colors based on scores      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  RouteOptionsDisplay Component      │
│  Display route cards with scores    │
└─────────────────────────────────────┘
```

### Safety Review Submission Flow

```
┌─────────────────┐
│  User Action    │
│  Long Press Map │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Navigate Screen                    │
│  onLongPress() → setReviewLocation  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  SafetyReviewModal                  │
│  User inputs:                       │
│  - Rating (1-5)                     │
│  - Category                         │
│  - Comment                          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Navigate Screen                    │
│  submitSafetyReview()               │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Firebase Realtime Database         │
│  Write to: safety_reviews/{id}      │
│  Data: lat, lng, rating, comment    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Update Local State                 │
│  - Add to safetyReviews array       │
│  - Update dangerousAreas if rating≤2│
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  MapDisplay Component               │
│  Re-render with new markers         │
└─────────────────────────────────────┘
```

### Emergency SOS Flow

```
┌─────────────────┐
│  User Action    │
│  Press SOS Btn  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  SOS Screen                         │
│  onButtonPress()                    │
└────────┬────────────────────────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌──────────────────┐      ┌──────────────────────┐
│  Linking API     │      │  Load Contacts       │
│  tel:122         │      │  from AsyncStorage   │
└──────────────────┘      └──────┬───────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Get Current Location    │
                    │  Expo Location API       │
                    └──────┬───────────────────┘
                           │
                           ▼
                    ┌──────────────────────────┐
                    │  For each contact:       │
                    │  sendWhatsAppLocation()  │
                    └──────┬───────────────────┘
                           │
                           ▼
                    ┌──────────────────────────┐
                    │  Twilio WhatsApp API     │
                    │  Send emergency message  │
                    └──────┬───────────────────┘
                           │
                           ▼
                    ┌──────────────────────────┐
                    │  Show Success/Fail Alert │
                    │  with contact summary    │
                    └──────────────────────────┘
```

---

## Integration Matrix

### Page → API → Component Integration

| Page | API Called | Service Layer | Component Updated | Data Stored |
|------|-----------|---------------|-------------------|-------------|
| **Navigate** | Google Directions | routeSafetyService | RouteOptionsDisplay, MapDisplay | None |
| **Navigate** | Google Places | None | SearchBar, BottomSheet | None |
| **Navigate** | Firebase Realtime DB | None | MapDisplay (markers) | safety_reviews/{id} |
| **Contacts** | Twilio WhatsApp | twilioService | Alert dialog | None |
| **Contacts** | Expo Location | None | None | None |
| **Contacts** | AsyncStorage | None | Contact cards | @SafeRoute:contacts |
| **SOS** | Twilio WhatsApp | twilioService | Alert dialog | None |
| **SOS** | Expo Location | None | None | None |
| **SOS** | Linking (tel:) | None | None | None |
| **Live Location** | Firebase Realtime DB | None | MapView | live_locations/{sessionId} |
| **Live Location** | Expo Location | None | Status text | None |
| **Live Location** | TaskManager | None | None | None |
| **Saved Places** | AsyncStorage | None | FlatList | savedLocations |

### Component Dependencies

```
MapDisplay
├── Depends on: react-native-maps
├── Receives props from: Navigate screen
├── Displays data from: Firebase, Google APIs
└── Updates: Map markers, polylines, circles

RouteOptionsDisplay
├── Depends on: None (pure UI)
├── Receives props from: Navigate screen
├── Displays data from: Google Directions API
└── Triggers: Route selection, navigation start

SearchBar
├── Depends on: None (pure UI)
├── Receives props from: Navigate screen
├── Triggers API call: Google Places Text Search
└── Updates: Search results dropdown

BottomSheet
├── Depends on: Animated API
├── Receives props from: Navigate screen
├── Displays data from: Selected location
└── Triggers: Navigation, save, share actions

SafetyReviewModal
├── Depends on: None (pure UI)
├── Receives props from: Navigate screen
├── Submits to: Firebase Realtime Database
└── Updates: Local safety reviews state
```

### API Rate Limits & Caching Strategy

| API | Rate Limit | Caching Strategy | Cache Duration | Fallback |
|-----|-----------|------------------|----------------|----------|
| **Google Directions** | 50 req/sec | In-memory Map | 5 minutes | Show error, retry |
| **Google Places** | 100 req/sec | In-memory Map | 5 minutes | Show cached results |
| **Twilio WhatsApp** | 1 msg/sec/number | None | N/A | Queue messages |
| **Firebase Realtime DB** | 100 concurrent | Real-time sync | N/A | Offline persistence |
| **OSM Overpass** | Custom | In-memory Map | 10 minutes | Use basic scoring |

### Error Handling Matrix

| Component | API Error | Handling Strategy | User Feedback |
|-----------|-----------|-------------------|---------------|
| **Navigate** | Google Directions fails | Retry 3 times, show error | Alert: "Could not calculate routes" |
| **Navigate** | Google Places fails | Show empty results | "No results found" |
| **Navigate** | Firebase write fails | Save locally, retry | Alert: "Saved locally, will sync" |
| **Contacts** | Twilio fails | Continue with fallback | Alert: "Failed to send, try direct WhatsApp" |
| **SOS** | Location unavailable | Skip location sharing | Alert: "Location unavailable" |
| **Live Location** | Firebase connection lost | Buffer updates | Status: "Reconnecting..." |

---

## State Management Flow

### Navigate Screen State Flow

```
Initial State
    ↓
┌─────────────────────────────────────┐
│  location: null                     │
│  isLocationReady: false             │
│  searchQuery: ""                    │
│  routeOptions: []                   │
│  isNavigationMode: false            │
└─────────────────────────────────────┘
    ↓
getCurrentLocation()
    ↓
┌─────────────────────────────────────┐
│  location: LocationObject           │
│  isLocationReady: true              │
│  mapRegion: Region                  │
└─────────────────────────────────────┘
    ↓
User searches for place
    ↓
┌─────────────────────────────────────┐
│  searchQuery: "DB City Mall"        │
│  searchResults: [...]               │
│  showSearchResults: true            │
└─────────────────────────────────────┘
    ↓
User selects result
    ↓
┌─────────────────────────────────────┐
│  selectedLocation: SearchResult     │
│  showBottomSheet: true              │
└─────────────────────────────────────┘
    ↓
User starts navigation
    ↓
┌─────────────────────────────────────┐
│  isCalculatingRoute: true           │
└─────────────────────────────────────┘
    ↓
Routes calculated
    ↓
┌─────────────────────────────────────┐
│  routeOptions: [Route1, Route2]     │
│  selectedRouteIndex: 0              │
│  routeCoordinates: [...]            │
│  routeInfo: RouteInfo               │
│  isCalculatingRoute: false          │
└─────────────────────────────────────┘
    ↓
User starts actual navigation
    ↓
┌─────────────────────────────────────┐
│  isNavigationMode: true             │
│  locationWatcher: Subscription      │
└─────────────────────────────────────┘
```

---

## Cross-Reference Index

### API Documentation → UI Components

- **Google Directions API** → Used by: [Navigate Screen](#2-navigate-safemaps), [RouteOptionsDisplay](#2-routeoptionsdisplay)
- **Google Places API** → Used by: [Navigate Screen](#2-navigate-safemaps), [SearchBar](#4-searchbar)
- **Twilio WhatsApp API** → Used by: [Contacts Screen](#3-contacts-screen), [SOS Screen](#4-sos-screen)
- **Firebase Realtime DB** → Used by: [Navigate Screen](#2-navigate-safemaps), [Live Location Screen](#6-live-location-share-screen), [SafetyReviewModal](#6-safetyreviewmodal)
- **Expo Location** → Used by: All screens with location features

### UI Components → API Documentation

- **Navigate Screen** → Uses: [Google Directions API](API_DOCUMENTATION.md#1-google-directions-api), [Google Places API](API_DOCUMENTATION.md#2-google-places-api-text-search), [Firebase APIs](API_DOCUMENTATION.md#firebase-apis)
- **Contacts Screen** → Uses: [Twilio WhatsApp API](API_DOCUMENTATION.md#twilio-whatsapp-api), [Expo Location](API_DOCUMENTATION.md#2-expo-location---get-current-location)
- **SOS Screen** → Uses: [Twilio WhatsApp API](API_DOCUMENTATION.md#twilio-whatsapp-api), [Expo Location](API_DOCUMENTATION.md#2-expo-location---get-current-location)
- **MapDisplay** → Displays data from: [Google Directions API](API_DOCUMENTATION.md#1-google-directions-api), [Firebase Realtime DB](API_DOCUMENTATION.md#3-realtime-database---share-live-location)
- **RouteOptionsDisplay** → Displays data from: [Route Safety Service](API_DOCUMENTATION.md#1-route-safety-service---analyze-route-safety)

### Service Layer Cross-Reference

- **routeSafetyService.ts** → Called by: [Navigate Screen](UI_COMPONENTS_DOCUMENTATION.md#2-navigate-safemaps) → Uses: [OSM Overpass API](API_DOCUMENTATION.md#api-integration)
- **twilioService.ts** → Called by: [Contacts Screen](UI_COMPONENTS_DOCUMENTATION.md#3-contacts-screen), [SOS Screen](UI_COMPONENTS_DOCUMENTATION.md#4-sos-screen) → Uses: [Twilio WhatsApp API](API_DOCUMENTATION.md#twilio-whatsapp-api)

---

## Technology Stack Summary

| Layer | Technologies | Purpose |
|-------|-------------|---------|
| **Frontend** | React 19.0.0, React Native 0.79.5, TypeScript 5.8.3 | UI rendering & type safety |
| **Navigation** | Expo Router 5.1.4, React Navigation 7.x | Screen routing & navigation |
| **Maps** | react-native-maps 1.20.1, Google Maps API | Map display & routing |
| **Location** | expo-location 18.1.6, expo-task-manager 13.1.6 | GPS tracking & background tasks |
| **Backend** | Firebase 12.2.1 (Firestore, Realtime DB, Auth) | Data storage & real-time sync |
| **Messaging** | Twilio WhatsApp API | Emergency notifications |
| **UI Library** | react-native-paper 5.14.5 | Material Design components |
| **Storage** | AsyncStorage 1.24.0 | Local data persistence |
| **Animation** | react-native-reanimated 3.17.4 | Smooth animations |

---

## Performance Metrics

| Operation | Target Time | Actual Performance | Optimization |
|-----------|-------------|-------------------|--------------|
| **Route Calculation** | < 3 seconds | 2-4 seconds | Parallel API calls, caching |
| **Map Rendering** | < 1 second | 0.5-1 second | Marker clustering, lazy loading |
| **Location Update** | 10 seconds | 10 seconds | Background task optimization |
| **Search Results** | < 1 second | 0.5-1.5 seconds | Debouncing (500ms), caching |
| **Safety Score Calc** | < 2 seconds | 1-3 seconds | In-memory caching, parallel processing |
| **WhatsApp Send** | < 5 seconds | 3-7 seconds | Sequential sending with delays |

---

**Last Updated:** 2024  
**Version:** 1.0.0
