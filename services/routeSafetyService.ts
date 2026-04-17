/**
 * Route Safety Scoring Service
 * Integrates OSM data, weather data, and other factors for comprehensive route safety scoring
 */

const OSM_OVERPASS_API = "https://overpass-api.de/api/interpreter";
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY; // From the Python script
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// Rate limiting for OSM API (avoid 429 errors)
let lastOSMRequestTime = 0;
const OSM_MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests (more conservative)
let osmRequestQueue: Array<() => Promise<any[]>> = [];
let isProcessingQueue = false;

// Cache for OSM data to avoid repeated calls for same areas
const osmCache = new Map<string, { data: any[]; timestamp: number }>();
const OSM_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const OSM_CACHE_RADIUS = 0.1; // Cache for 100m radius areas

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface SafetyFactors {
  streetLighting: number; // 0-5 score based on density
  policeStations: number; // Count within 1km
  hospitals: number; // Count within 1km
  publicTransport: number; // Bus stops, train/metro stations within 500m
  weather: number; // 0-5 score (lower in bad weather)
  residentialDensity: number; // 0-5 score (higher = safer)
  baseScore: number; // Base score from user reviews
}

interface RouteSegmentScore {
  coordinate: Coordinate;
  score: number; // 0-5
  factors: SafetyFactors;
  status: "safe" | "caution" | "dangerous" | "unreviewed";
}

/**
 * Create bounding box string for OSM Overpass API
 */
function createBoundingBox(centerLat: number, centerLng: number, radiusKm: number = 1): string {
  // Approximate conversion: 1 degree ≈ 111 km
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
  
  const south = centerLat - latDelta;
  const north = centerLat + latDelta;
  const west = centerLng - lngDelta;
  const east = centerLng + lngDelta;
  
  return `${south},${west},${north},${east}`;
}

/**
 * Generate cache key for OSM query based on location and query type
 */
function getOSMCacheKey(lat: number, lng: number, queryType: string): string {
  // Round coordinates to cache in 100m areas
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${queryType}_${roundedLat}_${roundedLng}`;
}

/**
 * Query OSM Overpass API with rate limiting and caching
 * Uses GET request with data query parameter (matching Python script format)
 */
async function queryOSM(
  overpassQuery: string, 
  lat?: number, 
  lng?: number, 
  queryType?: string
): Promise<any[]> {
  // Check cache first
  if (lat !== undefined && lng !== undefined && queryType) {
    const cacheKey = getOSMCacheKey(lat, lng, queryType);
    const cached = osmCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < OSM_CACHE_DURATION) {
      return cached.data;
    }
  }

  // Rate limiting: wait if we made a request too recently
  const now = Date.now();
  const timeSinceLastRequest = now - lastOSMRequestTime;
  
  if (timeSinceLastRequest < OSM_MIN_REQUEST_INTERVAL) {
    const waitTime = OSM_MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      const url = `${OSM_OVERPASS_API}?data=${encodeURIComponent(overpassQuery)}`;
      lastOSMRequestTime = Date.now();
      
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait exponentially longer
          const waitTime = Math.min(5000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
          console.warn(`OSM API rate limit (429). Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        } else if (response.status === 504) {
          // Gateway timeout - wait and retry
          const waitTime = Math.min(3000 * Math.pow(2, retryCount), 20000); // Max 20 seconds
          console.warn(`OSM API timeout (504). Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        }
        console.warn("OSM API error:", response.status);
        return [];
      }

      const data = await response.json();
      const elements = data.elements || [];
      
      // Cache the result
      if (lat !== undefined && lng !== undefined && queryType) {
        const cacheKey = getOSMCacheKey(lat, lng, queryType);
        osmCache.set(cacheKey, { data: elements, timestamp: Date.now() });
      }
      
      return elements;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn("OSM API request timeout");
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      } else if (retryCount < maxRetries) {
        console.warn(`OSM API error, retrying... (${retryCount + 1}/${maxRetries})`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      } else {
        console.error("Error querying OSM:", error);
        return [];
      }
    }
  }
  
  return [];
}

/**
 * Get street lighting density score (0-5)
 */
async function getStreetLightingScore(
  lat: number,
  lng: number,
  radiusKm: number = 0.5
): Promise<number> {
  try {
    const bbox = createBoundingBox(lat, lng, radiusKm);
    const query = `[out:json];node["highway"="street_lamp"](${bbox});out;`;
    
    const elements = await queryOSM(query, lat, lng, "street_lamp");
    const count = elements.length;
    
    // Score: 0-5 based on density
    // More street lamps = higher score
    if (count === 0) return 1;
    if (count < 5) return 2;
    if (count < 10) return 3;
    if (count < 20) return 4;
    return 5;
  } catch (error) {
    console.warn("Error getting street lighting score:", error);
    return 3; // Default neutral score
  }
}

/**
 * Get police stations count within radius
 */
async function getPoliceStationsCount(
  lat: number,
  lng: number,
  radiusKm: number = 1
): Promise<number> {
  try {
    const bbox = createBoundingBox(lat, lng, radiusKm);
    const query = `[out:json];node["amenity"="police"](${bbox});out;`;
    
    const elements = await queryOSM(query, lat, lng, "police");
    return elements.length;
  } catch (error) {
    console.warn("Error getting police stations count:", error);
    return 0;
  }
}

/**
 * Get hospitals count within radius
 */
async function getHospitalsCount(
  lat: number,
  lng: number,
  radiusKm: number = 1
): Promise<number> {
  try {
    const bbox = createBoundingBox(lat, lng, radiusKm);
    const query = `[out:json];node["amenity"="hospital"](${bbox});out;`;
    
    const elements = await queryOSM(query, lat, lng, "hospital");
    return elements.length;
  } catch (error) {
    console.warn("Error getting hospitals count:", error);
    return 0;
  }
}

/**
 * Get public transport accessibility score (bus stops, train/metro stations)
 */
async function getPublicTransportScore(
  lat: number,
  lng: number,
  radiusKm: number = 0.5
): Promise<number> {
  try {
    const bbox = createBoundingBox(lat, lng, radiusKm);
    
    // Query bus stops, train stations, and metro stations sequentially to avoid rate limits
    const busStops = await queryOSM(
      `[out:json];node["highway"="bus_stop"](${bbox});out;`,
      lat,
      lng,
      "bus_stop"
    );
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const trainStations = await queryOSM(
      `[out:json];node["railway"="station"](${bbox});out;`,
      lat,
      lng,
      "train_station"
    );
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const metroStations = await queryOSM(
      `[out:json];node["station"="subway"](${bbox});out;`,
      lat,
      lng,
      "metro_station"
    );
    
    const totalCount = busStops.length + trainStations.length + metroStations.length;
    
    // Score: 0-5 based on public transport availability
    if (totalCount === 0) return 1;
    if (totalCount < 2) return 2;
    if (totalCount < 5) return 3;
    if (totalCount < 10) return 4;
    return 5;
  } catch (error) {
    console.warn("Error getting public transport score:", error);
    return 3; // Default neutral score
  }
}

/**
 * Get residential building density score
 */
async function getResidentialDensityScore(
  lat: number,
  lng: number,
  radiusKm: number = 0.5
): Promise<number> {
  try {
    const bbox = createBoundingBox(lat, lng, radiusKm);
    const query = `[out:json];way["building"="residential"](${bbox});out;`;
    
    const elements = await queryOSM(query, lat, lng, "residential");
    const count = elements.length;
    
    // Higher residential density = safer (more people around)
    if (count === 0) return 1;
    if (count < 10) return 2;
    if (count < 20) return 3;
    if (count < 50) return 4;
    return 5;
  } catch (error) {
    console.warn("Error getting residential density score:", error);
    return 3; // Default neutral score
  }
}

/**
 * Get weather safety score (0-5)
 */
async function getWeatherScore(lat: number, lng: number): Promise<number> {
  try {
    const url = `${OPENWEATHER_BASE_URL}?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn("Weather API error:", response.status);
      return 3; // Default neutral score
    }
    
    const data = await response.json();
    
    // Check weather conditions
    const mainCondition = data.weather?.[0]?.main?.toLowerCase() || "";
    const description = data.weather?.[0]?.description?.toLowerCase() || "";
    const visibility = data.visibility || 10000; // meters
    const windSpeed = data.wind?.speed || 0; // m/s
    
    let score = 5; // Start with perfect score
    
    // Reduce score for bad weather
    if (mainCondition === "rain" || mainCondition === "thunderstorm") {
      score -= 1.5;
    } else if (mainCondition === "snow") {
      score -= 2;
    } else if (mainCondition === "fog" || mainCondition === "mist") {
      score -= 1.5;
    }
    
    // Visibility impact
    if (visibility < 1000) score -= 1; // Very poor visibility
    else if (visibility < 5000) score -= 0.5; // Poor visibility
    
    // Wind impact (high wind can be dangerous)
    if (windSpeed > 15) score -= 0.5; // Strong wind
    
    // Ensure score stays within 0-5 range
    return Math.max(0, Math.min(5, score));
  } catch (error) {
    console.error("Error fetching weather:", error);
    return 3; // Default neutral score
  }
}

/**
 * Calculate comprehensive safety score for a route segment
 */
export async function calculateSegmentSafetyScore(
  coordinate: Coordinate,
  baseScore: number = 3 // Base score from user reviews
): Promise<RouteSegmentScore> {
  // Fetch weather (most reliable API, less likely to rate limit)
  let weather = 3; // Default neutral weather
  try {
    weather = await getWeatherScore(coordinate.latitude, coordinate.longitude);
  } catch (error) {
    console.warn("Weather API failed, using default:", error);
  }
  
  // Fetch OSM data sequentially with longer delays to avoid rate limiting
  // If any OSM call fails, use defaults (rely more on baseScore and weather)
  let streetLighting = 3; // Default neutral
  let policeCount = 0;
  let hospitalCount = 0;
  let publicTransport = 3; // Default neutral
  let residential = 3; // Default neutral
  
  try {
    streetLighting = await getStreetLightingScore(coordinate.latitude, coordinate.longitude);
    await new Promise(resolve => setTimeout(resolve, 300)); // Longer delay (300ms)
  } catch (error) {
    console.warn("Street lighting query failed, using default");
  }
  
  try {
    policeCount = await getPoliceStationsCount(coordinate.latitude, coordinate.longitude);
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (error) {
    console.warn("Police stations query failed, using default");
  }
  
  try {
    hospitalCount = await getHospitalsCount(coordinate.latitude, coordinate.longitude);
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (error) {
    console.warn("Hospitals query failed, using default");
  }
  
  try {
    publicTransport = await getPublicTransportScore(coordinate.latitude, coordinate.longitude);
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (error) {
    console.warn("Public transport query failed, using default");
  }
  
  try {
    residential = await getResidentialDensityScore(coordinate.latitude, coordinate.longitude);
  } catch (error) {
    console.warn("Residential density query failed, using default");
  }

  const factors: SafetyFactors = {
    streetLighting,
    policeStations: policeCount,
    hospitals: hospitalCount,
    publicTransport,
    weather,
    residentialDensity: residential,
    baseScore,
  };

  // Weighted scoring system
  // Weights can be adjusted based on importance
  const weights = {
    baseScore: 0.3, // User reviews are important
    streetLighting: 0.2, // Well-lit areas are safer
    policeStations: 0.15, // Nearby police increases safety
    hospitals: 0.1, // Medical access is good
    publicTransport: 0.1, // Public transport = more people = safer
    weather: 0.1, // Weather affects safety
    residentialDensity: 0.05, // Residential areas are generally safer
  };

  // Normalize police and hospital counts to 0-5 scale
  const normalizedPolice = Math.min(5, policeCount * 1.5); // Each station adds value
  const normalizedHospital = Math.min(5, hospitalCount * 1.5);

  // Calculate weighted average
  let finalScore =
    baseScore * weights.baseScore +
    streetLighting * weights.streetLighting +
    normalizedPolice * weights.policeStations +
    normalizedHospital * weights.hospitals +
    publicTransport * weights.publicTransport +
    weather * weights.weather +
    residential * weights.residentialDensity; // Use 'residential' variable, not 'residentialDensity'

  // Ensure score is between 0-5
  finalScore = Math.max(0, Math.min(5, finalScore));

  // Determine status
  let status: "safe" | "caution" | "dangerous" | "unreviewed";
  if (baseScore === 0 || baseScore < 2) {
    status = "unreviewed";
  } else if (finalScore >= 4) {
    status = "safe";
  } else if (finalScore >= 2.5) {
    status = "caution";
  } else {
    status = "dangerous";
  }

  return {
    coordinate,
    score: finalScore,
    factors,
    status,
  };
}

/**
 * Calculate safety score for an entire route
 * Analyzes multiple segments along the route
 */
export async function calculateRouteSafetyScore(
  coordinates: Coordinate[],
  baseScores: number[] = [] // Base scores for each coordinate (from user reviews)
): Promise<{
  overall: "safe" | "caution" | "dangerous" | "unreviewed";
  averageScore: number;
  segmentScores: RouteSegmentScore[];
  dangerPercentage: number;
  stats: {
    dangerous: number;
    safe: number;
    caution: number;
    unreviewed: number;
  };
}> {
  // Dramatically reduce segments to avoid OSM API rate limits
  // Use only 3-5 key points along the route
  const MAX_SEGMENTS = 5; // Limit to max 5 segments per route
  const sampleInterval = Math.max(20, Math.floor(coordinates.length / MAX_SEGMENTS));
  
  const sampledCoordinates = [];
  // Always include start and end points
  if (coordinates.length > 0) {
    sampledCoordinates.push({
      coord: coordinates[0],
      baseScore: baseScores[0] || 3,
    });
  }
  
  // Add middle points
  for (let i = sampleInterval; i < coordinates.length - sampleInterval; i += sampleInterval) {
    if (sampledCoordinates.length >= MAX_SEGMENTS - 1) break;
    sampledCoordinates.push({
      coord: coordinates[i],
      baseScore: baseScores[i] || 3,
    });
  }
  
  // Always include end point if we have space
  if (coordinates.length > 1 && sampledCoordinates.length < MAX_SEGMENTS) {
    const lastIdx = coordinates.length - 1;
    sampledCoordinates.push({
      coord: coordinates[lastIdx],
      baseScore: baseScores[lastIdx] || 3,
    });
  }

  // Calculate scores for sampled segments with delays to avoid rate limiting
  const segmentScores = [];
  for (let i = 0; i < sampledCoordinates.length; i++) {
    const { coord, baseScore } = sampledCoordinates[i];
    
    // Add significant delay between segments to avoid rate limiting (1 second)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    try {
      const score = await calculateSegmentSafetyScore(coord, baseScore);
      segmentScores.push(score);
    } catch (error) {
      console.error(`Error calculating segment score ${i}:`, error);
      // Continue with other segments even if one fails, use base score only
      segmentScores.push({
        coordinate: coord,
        score: baseScore,
        factors: {
          streetLighting: 3,
          policeStations: 0,
          hospitals: 0,
          publicTransport: 3,
          weather: 3,
          residentialDensity: 3,
          baseScore: baseScore,
        },
        status: baseScore >= 4 ? "safe" : baseScore >= 2.5 ? "caution" : "dangerous",
      });
    }
  }

  // Calculate statistics
  let totalSafe = 0;
  let totalCaution = 0;
  let totalDangerous = 0;
  let totalUnreviewed = 0;
  let totalScore = 0;

  segmentScores.forEach((segment) => {
    totalScore += segment.score;
    switch (segment.status) {
      case "safe":
        totalSafe++;
        break;
      case "caution":
        totalCaution++;
        break;
      case "dangerous":
        totalDangerous++;
        break;
      case "unreviewed":
        totalUnreviewed++;
        break;
    }
  });

  const averageScore = segmentScores.length > 0 ? totalScore / segmentScores.length : 3;
  const totalSegments = segmentScores.length;
  const dangerPercentage = totalSegments > 0 ? (totalDangerous / totalSegments) * 100 : 0;

  // Determine overall status
  let overall: "safe" | "caution" | "dangerous" | "unreviewed";
  if (totalDangerous > 0 || dangerPercentage >= 1) {
    overall = "dangerous";
  } else if (dangerPercentage > 10 || totalCaution > totalSafe) {
    overall = "caution";
  } else if (averageScore >= 4) {
    overall = "safe";
  } else if (totalUnreviewed / totalSegments > 0.7) {
    overall = "unreviewed";
  } else {
    overall = "safe";
  }

  return {
    overall,
    averageScore,
    segmentScores,
    dangerPercentage,
    stats: {
      dangerous: totalDangerous,
      safe: totalSafe,
      caution: totalCaution,
      unreviewed: totalUnreviewed,
    },
  };
}
