# SafeRoute - UI Components & Pages Documentation

Complete reference for all UI components and application pages in SafeRoute.

---

## Table of Contents
1. [Application Pages](#application-pages)
2. [Map Components](#map-components)
3. [UI Components](#ui-components)
4. [Themed Components](#themed-components)

---

## Application Pages

### 1. Home Page

**File:** `app/(tabs)/Home.tsx`

**Purpose:** Main dashboard with quick access to emergency features and navigation.

**Props:** None (Root screen)

**State:**
```typescript
{
  Loading: boolean,
  showHelplineModal: boolean,
  fontsLoaded: boolean
}
```

**Features:**
- Emergency helpline numbers modal
- Quick navigation to contacts
- Live location sharing
- Nearby police stations/hospitals
- Community safety message

**Example Usage:**
```typescript
// Accessed via tab navigation
<Tab.Screen name="Home" component={HomePage} />
```

**UI Elements:**
- **Add Contacts Button**: Navigate to contacts screen
- **Share Location Button**: Start live location sharing
- **Helpline Numbers Button**: Display emergency contacts
- **Police Station Near Me**: Find nearby police stations
- **Hospital Near Me**: Find nearby hospitals

**Styling:**
- Background: Gradient overlay (#AC1754)
- Card: White with rounded corners (60px top radius)
- Buttons: Pink theme (#F37199, #E53888)
- Fonts: Magesta (headers), Lufga (body)

---

### 2. Navigate (SafeMaps)

**File:** `app/(tabs)/navigate.tsx`

**Purpose:** Main navigation screen with safety-aware routing and map display.

**Props:** Route params from navigation
```typescript
{
  showPoliceStations?: boolean,
  showHospitals?: boolean,
  selectedPlaceForMap?: Coordinate,
  selectedPlaceTitle?: string,
  selectedPlaceSubtitle?: string
}
```

**State:**
```typescript
{
  location: Location.LocationObject | null,
  isLocationReady: boolean,
  mapRegion: Region | null,
  searchQuery: string,
  searchResults: SearchResult[],
  selectedLocation: SearchResult | null,
  routeCoordinates: Coordinate[],
  routeOptions: RouteInfo[],
  selectedRouteIndex: number,
  isNavigationMode: boolean,
  safetyReviews: SafetyReview[],
  dangerousAreas: DangerousArea[],
  safeRouteOnly: boolean,
  showReviewModal: boolean,
  nearbyPoliceStations: SearchResult[],
  nearbyHospitals: SearchResult[]
}
```

**Key Functions:**
```typescript
// Get current GPS location
getCurrentLocation(): Promise<void>

// Search for places
searchPlaces(query: string): Promise<void>

// Calculate multiple route options
getMultipleGoogleRoutes(origin, destination): Promise<RouteInfo[]>

// Analyze route safety
analyzeRouteSafety(coordinates): Promise<SafetyAnalysis>

// Start navigation
startActualNavigation(): Promise<void>

// Submit safety review
submitSafetyReview(lat, lng, rating, comment, category): Promise<void>
```

**Example Usage:**
```typescript
// Navigate with params
navigation.navigate("navigate", { 
  showPoliceStations: true 
});

// Navigate to saved place
navigation.navigate("navigate", {
  selectedPlaceForMap: { latitude: 23.2599, longitude: 77.4126 },
  selectedPlaceTitle: "DB City Mall"
});
```

**UI Layout:**
- **SearchBar**: Top overlay for place search
- **MapDisplay**: Full-screen map with markers
- **Quick Action Buttons**: Police/Hospital shortcuts (right side)
- **RouteOptionsDisplay**: Bottom sheet with route alternatives
- **BottomSheet**: Location details and actions
- **NavigationHeader**: Active navigation info

---

### 3. Contacts Screen

**File:** `app/(tabs)/contacts.tsx`

**Purpose:** Manage emergency contacts for SOS and location sharing.

**Props:** None (Tab screen)

**State:**
```typescript
{
  contacts: Contact[],
  name: string,
  phone: string,
  editingId: string | null,
  dialogVisible: boolean
}
```

**Contact Type:**
```typescript
type Contact = {
  id: string,
  name: string,
  phone: string
}
```

**Key Functions:**
```typescript
// Add new contact
handleAddContact(): void

// Edit existing contact
handleEdit(): void

// Delete contact
handleDelete(id: string): void

// Call contact
handleCall(phoneNumber: string): void

// Share location via WhatsApp
handleShareViaWhatsApp(contact: Contact): Promise<void>

// Share live location
handleShareLiveLocation(contact: Contact): void
```

**Example Usage:**
```typescript
// Add contact
<TextInput value={name} onChangeText={setName} />
<TextInput value={phone} onChangeText={setPhone} />
<Button onPress={handleAddContact}>Add Contact</Button>

// Contact actions
<IconButton icon="phone" onPress={() => handleCall(contact.phone)} />
<IconButton icon="whatsapp" onPress={() => handleShareViaWhatsApp(contact)} />
<IconButton icon="share-variant" onPress={() => handleShareLiveLocation(contact)} />
```

**UI Elements:**
- **Quick Share Buttons**: Share with all contacts
- **Add Contact Form**: Name and phone input
- **Contact Cards**: Display saved contacts with actions
- **Action Icons**: Call, WhatsApp, Share, Edit, Delete

**Storage:**
- Uses AsyncStorage with key: `@SafeRoute:contacts`
- Persists across app sessions

---

### 4. SOS Screen

**File:** `app/(tabs)/SOS.tsx`

**Purpose:** Emergency SOS with automatic location sharing to all contacts.

**Props:** None (Tab screen)

**State:**
```typescript
{
  Loading: boolean,
  fontsLoaded: boolean
}
```

**Key Functions:**
```typescript
// Load emergency contacts
loadEmergencyContacts(): Promise<Contact[]>

// Send location to all contacts
sendLocationToAllContacts(contacts: Contact[]): Promise<{
  successCount: number,
  failCount: number,
  successContacts: string[],
  failedContacts: string[]
}>

// Make emergency call
onButtonPress(): Promise<void>
```

**Example Usage:**
```typescript
// Emergency button press
<Button 
  onPress={onButtonPress}
  loading={Loading}
  style={{ backgroundColor: '#e74c3c' }}
>
  Emergency Call
</Button>
```

**Behavior:**
1. Makes emergency call to 122
2. Gets current GPS location
3. Sends location to all saved contacts via WhatsApp
4. Shows success/failure summary

**UI Elements:**
- **Emergency Alert Image**: Visual indicator
- **Emergency Call Button**: Red button (disabled while loading)
- **Status Text**: Updates during call/sharing

---

### 5. Saved Places Screen

**File:** `app/SavedPlacesScreen.tsx`

**Purpose:** View and manage saved locations for quick navigation.

**Props:** Navigation props

**State:**
```typescript
{
  savedPlaces: SearchResult[],
  loading: boolean
}
```

**Key Functions:**
```typescript
// Load saved places
loadSavedPlaces(): Promise<void>

// Navigate to place
handleNavigateToPlace(place: SearchResult): void

// Delete saved place
handleDeletePlace(placeId: string): Promise<void>
```

**Example Usage:**
```typescript
// Navigate to saved place
navigation.navigate("SavedPlacesScreen");

// Select place for navigation
handleNavigateToPlace(place);
// Navigates back to map with place coordinates
```

**Storage:**
- AsyncStorage key: `savedLocations`
- Stores array of SearchResult objects

---

### 6. Live Location Share Screen

**File:** `app/LiveLocationShareScreen.tsx`

**Purpose:** Share real-time GPS location with contacts via Firebase.

**Props:** Route params
```typescript
{
  startSharing?: boolean,
  targetContact?: Contact,
  shareWithAll?: boolean
}
```

**State:**
```typescript
{
  isSharing: boolean,
  currentLocation: Location.LocationObject | null,
  sessionId: string | null,
  selectedContacts: Contact[],
  statusMessage: string
}
```

**Key Functions:**
```typescript
// Start location sharing
startLocationSharing(): Promise<void>

// Stop location sharing
stopLocationSharing(): Promise<void>

// Update location in Firebase
updateLocationInFirebase(location): Promise<void>

// Start background tracking
startBackgroundTracking(): Promise<void>
```

**Example Usage:**
```typescript
// Start sharing with specific contact
navigation.navigate("LiveLocationShareScreen", {
  startSharing: true,
  targetContact: contact
});

// Share with all contacts
navigation.navigate("LiveLocationShareScreen", {
  startSharing: true,
  shareWithAll: true
});
```

**Firebase Integration:**
- Realtime Database path: `live_locations/{sessionId}`
- Updates every 10 seconds or 10 meters
- Background tracking with foreground service

---

## Map Components

### 1. MapDisplay

**File:** `components/maps/MapDisplay.js`

**Purpose:** Renders interactive map with markers, routes, and safety overlays.

**Props:**
```typescript
{
  mapRef: React.RefObject,
  initialRegion: Region,
  selectedLocation: SearchResult | null,
  safetyReviews: SafetyReview[],
  dangerousAreas: DangerousArea[],
  routeCoordinates: Coordinate[],
  routeColor: string,
  onLongPress: (event) => void,
  onMyLocationPress: () => void,
  nearbyPoliceStations: SearchResult[],
  nearbyHospitals: SearchResult[]
}
```

**Example Usage:**
```typescript
<MapDisplay
  mapRef={mapRef}
  initialRegion={{
    latitude: 23.2599,
    longitude: 77.4126,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421
  }}
  selectedLocation={selectedLocation}
  safetyReviews={safetyReviews}
  dangerousAreas={dangerousAreas}
  routeCoordinates={routeCoordinates}
  routeColor="#4CAF50"
  onLongPress={(e) => setReviewLocation(e.nativeEvent.coordinate)}
  onMyLocationPress={getCurrentLocation}
  nearbyPoliceStations={nearbyPoliceStations}
  nearbyHospitals={nearbyHospitals}
/>
```

**Map Features:**
- **User Location**: Blue dot with accuracy circle
- **Selected Location**: Primary marker (pink)
- **Safety Reviews**: Color-coded markers (red/yellow/green)
- **Dangerous Areas**: Red circles with transparency
- **Route Polyline**: Colored based on safety score
- **Nearby Places**: Purple (police), Green (hospitals)
- **My Location Button**: Bottom-right floating button

**Marker Colors:**
- Primary: `#f661ab` (selected location)
- Danger: `#FF4444` (rating ≤ 2)
- Warning: `#FFC107` (rating 2-4)
- Success: `#4CAF50` (rating ≥ 4)
- Secondary: `#cd43d2` (police stations)

---

### 2. RouteOptionsDisplay

**File:** `components/maps/RouteOptionDisplay.js`

**Purpose:** Display multiple route alternatives with safety scores.

**Props:**
```typescript
{
  isVisible: boolean,
  routeOptions: RouteInfo[],
  selectedRouteIndex: number,
  onSelectRoute: (index: number) => void,
  onViewDirections: () => void,
  onStartNavigation: () => void,
  onRecalculateRoute: () => void,
  safeRouteOnly: boolean,
  onToggleSafeRouteOnly: () => void
}
```

**Example Usage:**
```typescript
<RouteOptionsDisplay
  isVisible={routeOptions.length > 0 && !isNavigationMode}
  routeOptions={routeOptions}
  selectedRouteIndex={selectedRouteIndex}
  onSelectRoute={selectRouteOption}
  onViewDirections={() => setShowDirectionsModal(true)}
  onStartNavigation={startActualNavigation}
  onRecalculateRoute={() => calculateAndShowRoutes(destination)}
  safeRouteOnly={safeRouteOnly}
  onToggleSafeRouteOnly={() => setSafeRouteOnly(!safeRouteOnly)}
/>
```

**Route Card Display:**
```
┌─────────────────┐
│ ⏱️ 25 min   ✅  │
│ Primary Route   │
│ 📍 5.2 km       │
│ 🛡️ Score 4.5/5  │
│ ✅ Good         │
└─────────────────┘
```

**UI Elements:**
- **Horizontal Scroll**: Swipe through route options
- **Route Cards**: Time, distance, safety score
- **Status Badge**: Emoji indicator (⚠️/⚡/✅)
- **Safety Score**: Prominent display with color
- **Action Buttons**: Directions, Start Navigation
- **Recalculate Button**: Refresh routes
- **Safety Toggle**: Prioritize safe routes

**Styling:**
- Selected route: Blue border, scaled up
- Safety colors: Red (< 2.5), Yellow (2.5-4), Green (≥ 4)
- Bottom sheet: White background, rounded top

---

### 3. BottomSheet

**File:** `components/maps/BottomSheet.js`

**Purpose:** Display selected location details with action buttons.

**Props:**
```typescript
{
  showBottomSheet: boolean,
  bottomSheetAnim: Animated.Value,
  selectedLocation: SearchResult | null,
  onStartNavigation: () => void,
  onSaveLocation: (location: SearchResult) => void,
  onShareLocation: () => void,
  onClose: () => void
}
```

**Example Usage:**
```typescript
<BottomSheet
  showBottomSheet={showBottomSheet}
  bottomSheetAnim={bottomSheetAnim}
  selectedLocation={selectedLocation}
  onStartNavigation={() => calculateAndShowRoutes(selectedLocation.coordinate)}
  onSaveLocation={handleSaveLocation}
  onShareLocation={() => handleShareLocation(selectedLocation)}
  onClose={() => animateBottomSheet(false)}
/>
```

**UI Layout:**
```
┌─────────────────────────┐
│      ─────              │ (Handle)
│                         │
│  DB City Mall           │ (Title)
│  Zone-I, Bhopal         │ (Subtitle)
│                         │
│  🛡️      💾      📤     │
│  Safe    Save   Share   │
│  Route                  │
└─────────────────────────┘
```

**Actions:**
- **Safe Route**: Calculate and display routes
- **Save**: Add to saved places
- **Share**: Share location via native share sheet

**Animation:**
- Slides up from bottom with spring animation
- Swipe down handle to close
- 300ms duration

---

### 4. SearchBar

**File:** `components/maps/SearchBar.js`

**Purpose:** Search for places with autocomplete dropdown.

**Props:**
```typescript
{
  searchQuery: string,
  setSearchQuery: (query: string) => void,
  searchResults: SearchResult[],
  showSearchResults: boolean,
  onSearch: (query: string) => void,
  onSelectResult: (result: SearchResult) => void,
  onClearSearch: () => void
}
```

**Example Usage:**
```typescript
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
```

**Features:**
- **Debounced Input**: 500ms delay before search
- **Clear Button**: X icon when text present
- **Results Dropdown**: Max 5 results
- **Result Item**: Icon, title, subtitle

**UI Layout:**
```
┌─────────────────────────┐
│ Search for places    ✕  │
└─────────────────────────┘
┌─────────────────────────┐
│ 📍 DB City Mall         │
│    Zone-I, Bhopal       │
├─────────────────────────┤
│ 📍 New Market           │
│    MP Nagar, Bhopal     │
└─────────────────────────┘
```

**Styling:**
- Position: Absolute top (iOS: 50px, Android: 20px)
- Background: White with shadow
- Results: Max height 300px, scrollable

---

### 5. DirectionsModal

**File:** `components/maps/DirectionModal.js`

**Purpose:** Display turn-by-turn navigation instructions.

**Props:**
```typescript
{
  showDirectionsModal: boolean,
  directions: Direction[],
  routeInfo: RouteInfo | null,
  onClose: () => void
}
```

**Direction Type:**
```typescript
type Direction = {
  instruction: string,
  distance: string,
  duration: string
}
```

**Example Usage:**
```typescript
<DirectionsModal
  showDirectionsModal={showDirectionsModal}
  directions={directions}
  routeInfo={routeInfo}
  onClose={() => setShowDirectionsModal(false)}
/>
```

**UI Display:**
```
┌─────────────────────────┐
│  Turn-by-Turn Directions│
│  5.2 km • 25 min        │
├─────────────────────────┤
│ 1. Head north on Main St│
│    200 m • 3 min        │
├─────────────────────────┤
│ 2. Turn right onto 2nd  │
│    500 m • 5 min        │
└─────────────────────────┘
```

---

### 6. SafetyReviewModal

**File:** `components/maps/SafetyReviewModal.js`

**Purpose:** Submit safety reviews for locations.

**Props:**
```typescript
{
  showReviewModal: boolean,
  reviewLocation: Coordinate | null,
  onSubmit: (lat, lng, rating, comment, category) => void,
  onClose: () => void
}
```

**Example Usage:**
```typescript
<SafetyReviewModal
  showReviewModal={showReviewModal}
  reviewLocation={reviewLocation}
  onSubmit={submitSafetyReview}
  onClose={() => setShowReviewModal(false)}
/>
```

**Form Fields:**
- **Rating**: 1-5 stars
- **Category**: Lighting, Crowd, Crime, Infrastructure
- **Comment**: Text input (optional)

**Submission:**
- Saves to Firebase Realtime Database
- Updates local state immediately
- Creates dangerous area if rating ≤ 2

---

### 7. LoadingOverlay

**File:** `components/maps/LoadingOverlay.js`

**Purpose:** Full-screen loading indicator with message.

**Props:**
```typescript
{
  isVisible: boolean,
  message: string,
  subMessage?: string
}
```

**Example Usage:**
```typescript
<LoadingOverlay
  isVisible={isCalculatingRoute}
  message="Finding safest route..."
  subMessage="Avoiding dangerous areas"
/>
```

**UI Display:**
```
┌─────────────────────────┐
│                         │
│         🔄              │
│                         │
│  Finding safest route...│
│  Avoiding dangerous     │
│  areas                  │
│                         │
└─────────────────────────┘
```

---

### 8. NavigationHeader

**File:** `components/maps/NavigationHeader.js`

**Purpose:** Display active navigation info at top of screen.

**Props:**
```typescript
{
  isVisible: boolean,
  routeInfo: RouteInfo | null,
  onStopNavigation: () => void
}
```

**Example Usage:**
```typescript
<NavigationHeader
  isVisible={isNavigationMode && routeInfo}
  routeInfo={routeInfo}
  onStopNavigation={stopNavigation}
/>
```

**UI Display:**
```
┌─────────────────────────┐
│ 🧭 5.2 km • 25 min  [X] │
│ Safety Score: 4.5/5     │
└─────────────────────────┘
```

---

### 9. MultiplePlacesModal

**File:** `components/maps/MultiplePlacesModal.js`

**Purpose:** Show list of nearby places for selection.

**Props:**
```typescript
{
  isVisible: boolean,
  places: SearchResult[],
  placeType: string,
  onSelectPlace: (place: SearchResult) => void,
  onCancel: () => void
}
```

**Example Usage:**
```typescript
<MultiplePlacesModal
  isVisible={showMultiplePlacesModal}
  places={multiplePlacesList}
  placeType="police"
  onSelectPlace={handleSelectPlaceFromList}
  onCancel={() => setShowMultiplePlacesModal(false)}
/>
```

**UI Display:**
```
┌─────────────────────────┐
│  Nearby Police Stations │
├─────────────────────────┤
│ 🚔 City Police Station  │
│    0.5 km away          │
├─────────────────────────┤
│ 🚔 MP Nagar Police      │
│    1.2 km away          │
└─────────────────────────┘
```

---

## UI Components

### 1. ThemedText

**File:** `components/ThemedText.tsx`

**Purpose:** Text component with automatic theme support.

**Props:**
```typescript
{
  lightColor?: string,
  darkColor?: string,
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link',
  ...TextProps
}
```

**Example Usage:**
```typescript
<ThemedText type="title">SafeRoute</ThemedText>
<ThemedText type="subtitle">Find safer routes</ThemedText>
<ThemedText>Regular text</ThemedText>
```

**Text Types:**
- **default**: Regular body text (16px)
- **title**: Large heading (32px, bold)
- **defaultSemiBold**: Semi-bold text (16px, 600)
- **subtitle**: Section heading (20px, bold)
- **link**: Clickable link (16px, primary color)

---

### 2. ThemedView

**File:** `components/ThemedView.tsx`

**Purpose:** View component with automatic theme background.

**Props:**
```typescript
{
  lightColor?: string,
  darkColor?: string,
  ...ViewProps
}
```

**Example Usage:**
```typescript
<ThemedView style={styles.container}>
  <ThemedText>Content</ThemedText>
</ThemedView>
```

**Theme Colors:**
- Light mode: `#FFFFFF` (white)
- Dark mode: `#151718` (dark gray)

---

### 3. HapticTab

**File:** `components/HapticTab.tsx`

**Purpose:** Tab bar button with haptic feedback.

**Props:**
```typescript
{
  onPress: () => void,
  onLongPress?: () => void,
  ...BottomTabBarButtonProps
}
```

**Example Usage:**
```typescript
<HapticTab onPress={() => navigation.navigate("Home")}>
  <TabIcon name="home" />
</HapticTab>
```

**Behavior:**
- Triggers light haptic feedback on press
- Works on iOS and Android

---

### 4. IconSymbol

**File:** `components/ui/IconSymbol.tsx`

**Purpose:** Platform-specific icon rendering.

**Props:**
```typescript
{
  name: string,
  size?: number,
  color?: string,
  style?: StyleProp<ViewStyle>
}
```

**Example Usage:**
```typescript
<IconSymbol name="house.fill" size={24} color="#f661ab" />
<IconSymbol name="map.fill" size={28} />
```

**Platform Behavior:**
- iOS: Uses SF Symbols
- Android/Web: Uses MaterialCommunityIcons

---

## Themed Components

### Color Scheme Hook

**File:** `hooks/useColorScheme.ts`

**Purpose:** Detect system theme (light/dark mode).

**Usage:**
```typescript
import { useColorScheme } from '@/hooks/useColorScheme';

const MyComponent = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View style={{ 
      backgroundColor: isDark ? '#000' : '#fff' 
    }}>
      <Text>Content</Text>
    </View>
  );
};
```

**Returns:** `'light' | 'dark' | null`

---

### Theme Color Hook

**File:** `hooks/useThemeColor.ts`

**Purpose:** Get color based on current theme.

**Usage:**
```typescript
import { useThemeColor } from '@/hooks/useThemeColor';

const MyComponent = () => {
  const backgroundColor = useThemeColor(
    { light: '#fff', dark: '#000' },
    'background'
  );
  
  return <View style={{ backgroundColor }} />;
};
```

**Parameters:**
- `colors`: Object with light and dark values
- `colorName`: Key from Colors.ts (fallback)

---

## Global Styles

**File:** `constants/GlobalStyles.js`

**Purpose:** Shared styling constants across the app.

**Colors:**
```javascript
{
  primary: '#f661ab',
  secondary: '#cd43d2',
  success: '#4CAF50',
  danger: '#FF4444',
  warning: '#FFC107',
  info: '#2196F3',
  textPrimary: '#212121',
  textSecondary: '#757575',
  backgroundLight: '#F5F5F5',
  lightGray: '#E0E0E0'
}
```

**Shadows:**
```javascript
shadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5
},
shadowSmall: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.18,
  shadowRadius: 1.0,
  elevation: 1
}
```

**Container Styles:**
```javascript
container: {
  flex: 1,
  backgroundColor: '#FFFFFF'
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#F5F5F5'
}
```

---

## Component Patterns

### Modal Pattern
```typescript
const [showModal, setShowModal] = useState(false);

<Modal
  visible={showModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowModal(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      {/* Modal content */}
      <Button onPress={() => setShowModal(false)}>Close</Button>
    </View>
  </View>
</Modal>
```

### Animated Component Pattern
```typescript
const animValue = useRef(new Animated.Value(0)).current;

const animateIn = () => {
  Animated.timing(animValue, {
    toValue: 1,
    duration: 300,
    useNativeDriver: false
  }).start();
};

<Animated.View style={{
  transform: [{
    translateY: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0]
    })
  }]
}}>
  {/* Content */}
</Animated.View>
```

### List Rendering Pattern
```typescript
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <TouchableOpacity onPress={() => handleSelect(item)}>
      <Text>{item.title}</Text>
    </TouchableOpacity>
  )}
  ListEmptyComponent={
    <Text>No items found</Text>
  }
/>
```

---

## Styling Best Practices

### 1. Consistent Spacing
```javascript
{
  padding: 16,
  margin: 8,
  gap: 12
}
```

### 2. Border Radius
```javascript
{
  borderRadius: 8,   // Small
  borderRadius: 12,  // Medium
  borderRadius: 16,  // Large
  borderRadius: 24   // Extra large
}
```

### 3. Font Sizes
```javascript
{
  fontSize: 12,  // Small
  fontSize: 14,  // Body
  fontSize: 16,  // Default
  fontSize: 18,  // Subtitle
  fontSize: 20,  // Heading
  fontSize: 24,  // Title
  fontSize: 32   // Large title
}
```

### 4. Font Weights
```javascript
{
  fontWeight: '400',  // Regular
  fontWeight: '500',  // Medium
  fontWeight: '600',  // Semi-bold
  fontWeight: '700',  // Bold
  fontWeight: '800'   // Extra bold
}
```

---

## Accessibility

### Screen Reader Support
```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Navigate to home"
  accessibilityHint="Double tap to go to home screen"
  accessibilityRole="button"
>
  <Text>Home</Text>
</TouchableOpacity>
```

### Color Contrast
- Text on light background: Minimum 4.5:1 ratio
- Text on dark background: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio

### Touch Targets
- Minimum size: 44x44 points (iOS), 48x48 dp (Android)
- Spacing between targets: Minimum 8 points

---

## Performance Optimization

### 1. Memoization
```typescript
const MemoizedComponent = React.memo(({ data }) => {
  return <View>{/* Render data */}</View>;
});
```

### 2. useCallback
```typescript
const handlePress = useCallback(() => {
  // Handle press
}, [dependencies]);
```

### 3. useMemo
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### 4. FlatList Optimization
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

---

**Last Updated:** 2024  
**Version:** 1.0.0
