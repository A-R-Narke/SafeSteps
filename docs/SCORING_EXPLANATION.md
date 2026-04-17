# Route Safety Scoring System Explanation

## Overview
The route safety scoring system evaluates routes on a scale of **0 to 5**, where:
- **5.0** = Very Safe
- **4.0-4.9** = Safe
- **3.0-3.9** = Moderate/Caution
- **2.0-2.9** = Caution
- **1.0-1.9** = Dangerous
- **0.0-0.9** = Very Dangerous

## Scoring Factors

The final score combines **7 different factors** with specific weights:

### 1. Base Score (User Reviews) - 30% Weight
- **Source**: User-submitted safety reviews stored in Firebase
- **Calculation**: Averages ratings from users who have reviewed areas along the route
- **Range**: 0-5
- **Why Important**: Real user experience and feedback

### 2. Street Lighting - 20% Weight
- **Source**: OpenStreetMap (OSM) data
- **Query**: Counts street lamps within 500m radius
- **Scoring**:
  - 0 lamps → 1.0
  - 1-4 lamps → 2.0
  - 5-9 lamps → 3.0
  - 10-19 lamps → 4.0
  - 20+ lamps → 5.0
- **Why Important**: Well-lit areas are generally safer, especially at night

### 3. Police Stations - 15% Weight
- **Source**: OpenStreetMap (OSM) data
- **Query**: Counts police stations within 1km radius
- **Scoring**: Each station adds value, normalized to 0-5 scale (1.5x multiplier)
  - 0 stations → 0.0 (weighted contribution)
  - 1 station → ~1.5 (normalized)
  - 2 stations → ~3.0 (normalized)
  - 3+ stations → 5.0 (capped)
- **Why Important**: Proximity to law enforcement increases safety perception

### 4. Hospitals - 10% Weight
- **Source**: OpenStreetMap (OSM) data
- **Query**: Counts hospitals within 1km radius
- **Scoring**: Similar to police stations (1.5x multiplier, capped at 5.0)
- **Why Important**: Medical access in emergencies

### 5. Public Transport - 10% Weight
- **Source**: OpenStreetMap (OSM) data
- **Query**: Counts bus stops, train stations, and metro stations within 500m
- **Scoring**:
  - 0 stops → 1.0
  - 1 stop → 2.0
  - 2-4 stops → 3.0
  - 5-9 stops → 4.0
  - 10+ stops → 5.0
- **Why Important**: More public transport = more people around = safer

### 6. Weather Conditions - 10% Weight
- **Source**: OpenWeatherMap API
- **Factors Considered**:
  - **Rain/Thunderstorm**: -1.5 points
  - **Snow**: -2.0 points
  - **Fog/Mist**: -1.5 points
  - **Visibility < 1000m**: -1.0 point
  - **Visibility < 5000m**: -0.5 point
  - **Wind Speed > 15 m/s**: -0.5 point
- **Base Score**: Starts at 5.0, then subtracts based on conditions
- **Range**: 0-5 (clamped)
- **Why Important**: Bad weather affects visibility and road safety

### 7. Residential Density - 5% Weight
- **Source**: OpenStreetMap (OSM) data
- **Query**: Counts residential buildings within 500m radius
- **Scoring**:
  - 0 buildings → 1.0
  - 1-9 buildings → 2.0
  - 10-19 buildings → 3.0
  - 20-49 buildings → 4.0
  - 50+ buildings → 5.0
- **Why Important**: More residential areas = more people = generally safer

## Score Calculation Formula

```
Final Score = 
  (BaseScore × 0.30) +
  (StreetLighting × 0.20) +
  (NormalizedPolice × 0.15) +
  (NormalizedHospital × 0.10) +
  (PublicTransport × 0.10) +
  (Weather × 0.10) +
  (ResidentialDensity × 0.05)
```

Where:
- `NormalizedPolice = min(5, policeCount × 1.5)`
- `NormalizedHospital = min(5, hospitalCount × 1.5)`

## Route-Level Scoring

For an entire route:
1. **Sampling**: Analyzes 3-5 key points along the route (start, middle, end, and evenly spaced points)
2. **Segment Scores**: Each point gets an individual score using the formula above
3. **Route Score**: Average of all segment scores
4. **Route Status**: 
   - **Safe**: Score ≥ 4.0
   - **Caution**: Score 2.5-3.9
   - **Dangerous**: Score < 2.5
   - **Unreviewed**: No user reviews and insufficient OSM data

## Example Calculation

### Segment Example:
- **Base Score**: 4.0 (good user reviews)
- **Street Lighting**: 4.0 (20 lamps)
- **Police Stations**: 2 stations → normalized to 3.0
- **Hospitals**: 1 hospital → normalized to 1.5
- **Public Transport**: 3.0 (5 stops)
- **Weather**: 4.0 (clear day, good visibility)
- **Residential Density**: 4.0 (40 buildings)

**Calculation**:
```
(4.0 × 0.30) + (4.0 × 0.20) + (3.0 × 0.15) + (1.5 × 0.10) + 
(3.0 × 0.10) + (4.0 × 0.10) + (4.0 × 0.05)

= 1.2 + 0.8 + 0.45 + 0.15 + 0.3 + 0.4 + 0.2
= 3.5 / 5.0
```

**Result**: This segment gets a **3.5/5.0** score (Caution level).

## Processing Flow

1. **User selects destination** → Route calculation begins
2. **Multiple routes fetched** from Google Directions API
3. **For each route**:
   - Samples 3-5 points along the route
   - For each point (sequentially with delays to avoid API rate limits):
     - Fetches user review scores (instant, from local data)
     - Fetches weather (OpenWeatherMap API)
     - Fetches OSM data (with caching and rate limiting):
       - Street lighting
       - Police stations
       - Hospitals
       - Public transport
       - Residential buildings
     - Calculates segment score using weighted formula
   - Averages segment scores to get route score
4. **Routes sorted** by safety score (safest first)
5. **Routes displayed** with scores visible

## Rate Limiting & Performance

To avoid API overload:
- **OSM API**: 2-second delay between requests, 5-minute caching
- **Weather API**: Cached per location
- **Segment Sampling**: Only 3-5 points per route (not every coordinate)
- **Sequential Processing**: One segment at a time (not parallel)

## Fallback Behavior

If any API call fails:
- **OSM Data Missing**: Uses default neutral scores (3.0)
- **Weather API Fails**: Uses default weather score (3.0)
- **All APIs Fail**: Falls back to user review scores only
- **No User Reviews**: Uses default score (3.0) with "Unreviewed" status

## Display

Routes show:
- **Safety Score**: "X.X/5" (color-coded)
- **Overall Status**: "Very Safe", "Caution Advised", "Unsafe Area", or "Unreviewed"
- **Color Coding**:
  - Green = Safe (≥4.0)
  - Yellow = Caution (2.5-3.9)
  - Red = Dangerous (<2.5)
  - Gray = Unreviewed

