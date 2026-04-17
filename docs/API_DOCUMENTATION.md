# SafeRoute - API Documentation

Complete reference for all external APIs and internal services used in the SafeRoute application.

---

## Table of Contents
1. [Google Maps APIs](#google-maps-apis)
2. [Twilio WhatsApp API](#twilio-whatsapp-api)
3. [Firebase APIs](#firebase-apis)
4. [Internal Services](#internal-services)

---

## Google Maps APIs

### 1. Google Directions API

**Purpose:** Calculate routes between two locations with turn-by-turn directions.

**Endpoint:**
```
GET https://maps.googleapis.com/maps/api/directions/json
```

**Parameters:**
- `origin` (required): Starting location (lat,lng or address)
- `destination` (required): Ending location (lat,lng or address)
- `mode` (optional): Travel mode (driving, walking, bicycling, transit)
- `alternatives` (optional): Return multiple routes (true/false)
- `key` (required): API key

**Example Request:**
```javascript
const origin = "37.7749,-122.4194";
const destination = "37.8044,-122.2712";
const apiKey = "YOUR_API_KEY";

const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking&alternatives=true&key=${apiKey}`;

const response = await fetch(url);
const data = await response.json();
```

**Example Input:**
```json
{
  "origin": "37.7749,-122.4194",
  "destination": "37.8044,-122.2712",
  "mode": "walking",
  "alternatives": true,
  "key": "AIza..."
}
```

**Example Output:**
```json
{
  "routes": [
    {
      "legs": [
        {
          "distance": {
            "text": "12.5 km",
            "value": 12500
          },
          "duration": {
            "text": "2 hours 30 mins",
            "value": 9000
          },
          "start_location": {
            "lat": 37.7749,
            "lng": -122.4194
          },
          "end_location": {
            "lat": 37.8044,
            "lng": -122.2712
          },
          "steps": [
            {
              "distance": { "text": "0.2 km", "value": 200 },
              "duration": { "text": "3 mins", "value": 180 },
              "html_instructions": "Head <b>north</b> on <b>Market St</b>",
              "polyline": { "points": "encoded_polyline_string" },
              "start_location": { "lat": 37.7749, "lng": -122.4194 },
              "end_location": { "lat": 37.7769, "lng": -122.4194 },
              "travel_mode": "WALKING"
            }
          ]
        }
      ],
      "overview_polyline": { "points": "encoded_overview_polyline" },
      "summary": "Market St and Bay Bridge"
    }
  ],
  "status": "OK"
}
```

**Usage in SafeRoute:**
```javascript
const fetchDirections = async (origin, destination) => {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=walking&alternatives=true&key=${GOOGLE_DIRECTIONS_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === "OK") {
    const routes = data.routes.map(route => ({
      coordinates: decodePolyline(route.overview_polyline.points),
      distance: route.legs[0].distance.value,
      duration: route.legs[0].duration.value,
      steps: route.legs[0].steps
    }));
    return routes;
  }
  return [];
};
```

---

### 2. Google Places API (Text Search)

**Purpose:** Search for places by text query.

**Endpoint:**
```
GET https://maps.googleapis.com/maps/api/place/textsearch/json
```

**Parameters:**
- `query` (required): Search query string
- `location` (optional): Lat,lng to bias results
- `radius` (optional): Search radius in meters
- `key` (required): API key

**Example Request:**
```javascript
const query = "coffee shops near me";
const location = "37.7749,-122.4194";
const radius = 5000;
const apiKey = "YOUR_API_KEY";

const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=${radius}&key=${apiKey}`;

const response = await fetch(url);
const data = await response.json();
```

**Example Input:**
```json
{
  "query": "hospitals in San Francisco",
  "location": "37.7749,-122.4194",
  "radius": 5000,
  "key": "AIza..."
}
```

**Example Output:**
```json
{
  "results": [
    {
      "formatted_address": "1001 Potrero Ave, San Francisco, CA 94110",
      "geometry": {
        "location": {
          "lat": 37.7577,
          "lng": -122.4076
        }
      },
      "name": "San Francisco General Hospital",
      "place_id": "ChIJd8BlQ2B...",
      "rating": 3.8,
      "types": ["hospital", "health", "point_of_interest"]
    }
  ],
  "status": "OK"
}
```

**Usage in SafeRoute:**
```javascript
const searchPlaces = async (searchQuery) => {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === "OK") {
    return data.results.map(place => ({
      name: place.name,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      placeId: place.place_id
    }));
  }
  return [];
};
```

---

### 3. Google Places API (Autocomplete)

**Purpose:** Get place predictions as user types.

**Endpoint:**
```
GET https://maps.googleapis.com/maps/api/place/autocomplete/json
```

**Parameters:**
- `input` (required): User input text
- `location` (optional): Lat,lng to bias results
- `radius` (optional): Search radius in meters
- `types` (optional): Filter by place types
- `key` (required): API key

**Example Request:**
```javascript
const input = "Golden Gate";
const location = "37.7749,-122.4194";
const apiKey = "YOUR_API_KEY";

const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&location=${location}&radius=50000&key=${apiKey}`;

const response = await fetch(url);
const data = await response.json();
```

**Example Input:**
```json
{
  "input": "Golden Gate",
  "location": "37.7749,-122.4194",
  "radius": 50000,
  "key": "AIza..."
}
```

**Example Output:**
```json
{
  "predictions": [
    {
      "description": "Golden Gate Bridge, San Francisco, CA, USA",
      "place_id": "ChIJw____96GhYAR...",
      "structured_formatting": {
        "main_text": "Golden Gate Bridge",
        "secondary_text": "San Francisco, CA, USA"
      }
    }
  ],
  "status": "OK"
}
```

---

## Twilio WhatsApp API

### Send WhatsApp Message

**Purpose:** Send emergency alerts and location updates via WhatsApp.

**Endpoint:**
```
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
```

**Authentication:** Basic Auth with Account SID and Auth Token

**Parameters:**
- `From` (required): Twilio WhatsApp number (whatsapp:+14155238886)
- `To` (required): Recipient WhatsApp number
- `Body` (required): Message text

**Example Request:**
```javascript
const accountSid = "AC...";
const authToken = "your_auth_token";
const fromNumber = "whatsapp:+14155238886";
const toNumber = "whatsapp:+1234567890";
const message = "🚨 EMERGENCY ALERT: User needs help!";

const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    Body: message
  })
});
```

**Example Input:**
```json
{
  "From": "whatsapp:+14155238886",
  "To": "whatsapp:+1234567890",
  "Body": "🚨 EMERGENCY ALERT: John needs help!"
}
```

**Example Output:**
```json
{
  "sid": "SM...",
  "status": "queued",
  "body": "🚨 EMERGENCY ALERT: John needs help!",
  "to": "whatsapp:+1234567890",
  "from": "whatsapp:+14155238886"
}
```

**Usage in SafeRoute:**
```javascript
export const sendEmergencyAlert = async (contact, userLocation, userName) => {
  const accountSid = process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID;
  const authToken = process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN;
  
  const message = `🚨 EMERGENCY ALERT\n\n${userName} needs help!\n\nLocation: https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`;
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      From: process.env.EXPO_PUBLIC_TWILIO_WHATSAPP_NUMBER,
      To: `whatsapp:${contact.phone}`,
      Body: message
    })
  });
  
  return await response.json();
};
```

---

## Firebase APIs

### 1. Firestore - Add Safety Review

**Purpose:** Store community safety reviews.

**Example Usage:**
```javascript
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

const addSafetyReview = async (reviewData) => {
  const docRef = await addDoc(collection(db, "safety_reviews"), {
    latitude: reviewData.latitude,
    longitude: reviewData.longitude,
    rating: reviewData.rating,
    comment: reviewData.comment,
    category: reviewData.category,
    userId: reviewData.userId,
    createdAt: serverTimestamp()
  });
  
  return { success: true, id: docRef.id };
};
```

**Example Input:**
```javascript
{
  latitude: 37.7749,
  longitude: -122.4194,
  rating: 4,
  comment: "Well-lit area with good foot traffic",
  category: "lighting",
  userId: "user123"
}
```

**Example Output:**
```javascript
{
  success: true,
  id: "review_abc123"
}
```

---

### 2. Firestore - Query Safety Reviews

**Purpose:** Retrieve safety reviews for a specific area.

**Example Usage:**
```javascript
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";

const getSafetyReviews = async (latitude, longitude, radiusKm = 1) => {
  const latDelta = radiusKm / 111;
  
  const reviewsRef = collection(db, "safety_reviews");
  const q = query(
    reviewsRef,
    where("latitude", ">=", latitude - latDelta),
    where("latitude", "<=", latitude + latDelta)
  );
  
  const querySnapshot = await getDocs(q);
  const reviews = [];
  
  querySnapshot.forEach((doc) => {
    reviews.push({ id: doc.id, ...doc.data() });
  });
  
  return reviews;
};
```

**Example Output:**
```javascript
[
  {
    id: "review_abc123",
    latitude: 37.7749,
    longitude: -122.4194,
    rating: 4,
    comment: "Well-lit area",
    category: "lighting",
    userId: "user123"
  }
]
```

---

### 3. Realtime Database - Share Live Location

**Purpose:** Share real-time location updates.

**Example Usage:**
```javascript
import { ref, set, onValue } from "firebase/database";
import { realtimeDb } from "@/config/firebase";

const startLocationSharing = async (sessionId, userId, location) => {
  const locationRef = ref(realtimeDb, `live_locations/${sessionId}`);
  await set(locationRef, {
    userId: userId,
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: Date.now(),
    isActive: true
  });
  
  return { success: true, sessionId };
};

const subscribeToLocation = (sessionId, callback) => {
  const locationRef = ref(realtimeDb, `live_locations/${sessionId}`);
  
  onValue(locationRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(data);
  });
};
```

**Example Input:**
```javascript
{
  sessionId: "session_xyz789",
  userId: "user123",
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  }
}
```

**Example Output:**
```javascript
{
  userId: "user123",
  latitude: 37.7749,
  longitude: -122.4194,
  timestamp: 1692144000000,
  isActive: true
}
```

---

## Internal Services

### 1. Route Safety Service - Analyze Route Safety

**Purpose:** Calculate comprehensive safety score for a route.

**Location:** `services/routeSafetyService.ts`

**Example Usage:**
```javascript
import { analyzeRouteSafety } from "@/services/routeSafetyService";

const safetyAnalysis = await analyzeRouteSafety(routeCoordinates);
```

**Example Input:**
```javascript
[
  { latitude: 37.7749, longitude: -122.4194 },
  { latitude: 37.7750, longitude: -122.4195 },
  { latitude: 37.7751, longitude: -122.4196 }
]
```

**Example Output:**
```javascript
{
  averageScore: 7.5,
  maxScore: 10,
  riskLevel: "low",
  factors: {
    communityRating: 8.2,
    incidentDensity: 0.3,
    lightingScore: 7.8,
    crowdScore: 6.9
  },
  warnings: [
    {
      location: { latitude: 37.7750, longitude: -122.4195 },
      message: "Low lighting reported",
      severity: "medium"
    }
  ],
  reviewCount: 45
}
```

---

### 2. Expo Location - Get Current Location

**Purpose:** Get device's current GPS coordinates.

**Example Usage:**
```javascript
import * as Location from "expo-location";

const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }
  
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });
  
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy
  };
};
```

**Example Output:**
```javascript
{
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10.5
}
```

---

### 3. Expo Location - Background Tracking

**Purpose:** Track location in background for live sharing.

**Example Usage:**
```javascript
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const LOCATION_TASK = "background-location-task";

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    await updateLocation(sessionId, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });
  }
});

const startBackgroundTracking = async () => {
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,
    distanceInterval: 10,
    foregroundService: {
      notificationTitle: "SafeRoute Location Sharing",
      notificationBody: "Your location is being shared"
    }
  });
};
```

---

## Error Handling Patterns

### Rate Limiting
```javascript
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000;

const rateLimitedFetch = async (url) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
};
```

### Retry Logic
```javascript
const fetchWithRetry = async (url, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Caching
```javascript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

const fetchWithCache = async (url, cacheKey) => {
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetch(url).then(r => r.json());
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
};
```

---

## Rate Limits & Quotas

### Google Maps APIs
- **Directions API**: 50 requests/second
- **Places API**: 100 requests/second
- **Daily quota**: Varies by billing plan

### Twilio WhatsApp
- **Rate limit**: 1 message/second per number
- **Daily quota**: Varies by account type

### Firebase
- **Firestore reads**: 50,000/day (free tier)
- **Firestore writes**: 20,000/day (free tier)
- **Realtime Database**: 100 simultaneous connections (free tier)

---

## Best Practices

1. Always implement rate limiting for external API calls
2. Cache responses when data doesn't change frequently
3. Handle errors gracefully with user-friendly messages
4. Use retry logic for transient failures
5. Validate inputs before making API calls
6. Monitor API usage to avoid quota exhaustion
7. Secure API keys using environment variables
8. Implement timeouts for all network requests

---

**Last Updated:** 2024  
**Version:** 1.0.0
