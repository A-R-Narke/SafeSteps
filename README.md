# SafeRoute 🛡️

A community-driven safety navigation app that helps users find and navigate safer routes based on real-time safety data, community reviews, and emergency features.

![React Native](https://img.shields.io/badge/React%20Native-0.79.5-61DAFB.svg)
![Expo](https://img.shields.io/badge/Expo-~53.0.20-000020.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-~5.8.3-3178C6.svg)

**Note:** Only Android version is working Use it through either expo app installation or adb

## ✨ Features

### 🗺️ Core Navigation

- **Safety-Aware Routing** - Routes scored based on community safety reviews
- **Interactive Maps** - Real-time map with route visualization
- **Multiple Route Options** - Compare alternatives with safety scores
- **Saved Places** - Quick access to frequently visited locations
- **Turn-by-Turn Directions** - Step-by-step navigation guidance

### 🛡️ Safety Features

- **Community Safety Reviews** - Submit and view location safety ratings
- **Safety Scoring Algorithm** - Multi-factor route safety analysis
- **SOS Emergency System** - Quick emergency contact notifications
- **Route Safety Analysis** - Detailed safety breakdowns for planned routes

### 📱 Social & Communication

- **Live Location Sharing** - Share real-time GPS with trusted contacts
- **Contact Management** - Manage emergency contacts
- **WhatsApp Integration** - Emergency alerts via Twilio WhatsApp API
- **Background Location Tracking** - Continuous location updates

### 🎨 User Experience

- **Cross-Platform** - Android, iOS, and Web support
- **Dark/Light Mode** - Automatic theme switching
- **Haptic Feedback** - Enhanced tactile interactions
- **Offline Support** - Core features work without connectivity

## 🛠️ Tech Stack

### Frontend

- **React** 19.0.0 - UI library
- **React Native** 0.79.5 - Cross-platform framework
- **Expo** ~53.0.20 - Development platform
- **TypeScript** ~5.8.3 - Type-safe development
- **React Navigation** 7.x - Navigation system

### Maps & Location

- **react-native-maps** 1.20.1 - Map rendering
- **expo-location** ~18.1.6 - GPS and geolocation
- **Google Maps API** - Directions and Places
- **expo-task-manager** - Background location tracking

### Backend & Database

- **Firebase** 12.2.1
  - Firestore - NoSQL database
  - Authentication - User management
  - Realtime Database - Live location sharing

### External Services

- **Twilio WhatsApp API** - Emergency messaging
- **Google Directions API** - Route calculation
- **Google Places API** - Location search

### UI Libraries

- **react-native-paper** 5.14.5 - Material Design
- **react-native-modal** 14.0.0-rc.1 - Modals
- **react-native-reanimated** ~3.17.4 - Animations
- **expo-haptics** ~14.1.4 - Haptic feedback

## 📦 Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Expo CLI** (installed globally)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Firebase Account** (for backend services)
- **Google Cloud Account** (for Maps API)
- **Twilio Account** (for WhatsApp messaging)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd EDAI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Expo CLI (if not already installed)

```bash
npm install -g expo-cli
```

## ⚙️ Configuration

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY=your_directions_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_places_key
EXPO_PUBLIC_TWILIO_ACCOUNT_SID=your_twilio_sid
EXPO_PUBLIC_TWILIO_AUTH_TOKEN=your_twilio_token
EXPO_PUBLIC_TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 2. Firebase Configuration

Create `config/firebase.ts` with your Firebase credentials:

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
  databaseURL: "your-database-url",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const realtimeDb = getDatabase(app);
```

### 3. Update app.json

Replace API keys in `app.json` extras section with your own credentials.

## 🏃 Running the App

### Development Server

```bash
npm start
```

### Android

```bash
npm run android
```

## 📁 Project Structure

```
SafeRoute/
├── app/                          # Application screens (Expo Router)
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── Home.tsx              # Dashboard
│   │   ├── navigate.tsx          # Main navigation screen
│   │   ├── contacts.tsx          # Contact management
│   │   ├── SOS.tsx               # Emergency features
│   │   ├── settings.tsx          # User settings
│   │   └── _layout.tsx           # Tab layout
│   ├── index.tsx                 # App entry point
│   ├── Login.tsx                 # Authentication
│   ├── Signup.tsx                # User registration
│   ├── LiveLocationShareScreen.tsx  # Location sharing
│   ├── SavedPlacesScreen.tsx     # Saved locations
│   └── _layout.tsx               # Root layout
│
├── components/                   # Reusable UI components
│   ├── maps/                     # Map-related components
│   │   ├── MapDisplay.js         # Main map component
│   │   ├── RouteOptionDisplay.js # Route alternatives
│   │   ├── DirectionModal.js     # Navigation instructions
│   │   ├── BottomSheet.js        # Route details panel
│   │   ├── SearchBar.js          # Location search
│   │   ├── SafetyReviewForm.js   # Safety rating submission
│   │   └── ...                   # Other map components
│   └── ui/                       # UI components
│       ├── ThemedText.tsx        # Themed text
│       ├── ThemedView.tsx        # Themed view
│       └── ...                   # Other UI components
│
├── services/                     # Business logic
│   ├── routeSafetyService.ts     # Safety scoring algorithms
│   └── twilioService.ts          # WhatsApp messaging
│
├── config/                       # Configuration
│   ├── firebase.ts               # Firebase initialization
│   └── firestoreActions.ts       # Database operations
│
├── constants/                    # Shared constants
│   ├── Colors.ts                 # Theme colors
│   └── GlobalStyles.js           # Shared styles
│
├── hooks/                        # Custom React hooks
│   ├── useColorScheme.ts         # Theme detection
│   └── useThemeColor.ts          # Theme colors
│
├── assets/                       # Static resources
│   ├── fonts/                    # Custom fonts
│   └── images/                   # Icons and images
│
├── android/                      # Android native code
├── scripts/                      # Development scripts
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── README.md                     # This file
```

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore, Authentication, and Realtime Database

### 2. Firestore Collections

```
safety_reviews/
  ├── {reviewId}
  │   ├── latitude: number
  │   ├── longitude: number
  │   ├── rating: number (1-5)
  │   ├── comment: string
  │   ├── category: string
  │   ├── userId: string
  │   └── createdAt: timestamp

users/
  ├── {userId}
  │   ├── email: string
  │   ├── contacts: array
  │   └── savedPlaces: array

live_locations/
  ├── {sessionId}
  │   ├── userId: string
  │   ├── latitude: number
  │   ├── longitude: number
  │   └── timestamp: timestamp
```

### 3. Security Rules

```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /safety_reviews/{reviewId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Android APK

```bash
eas build --platform android
```

**Built with ❤️ for safer communities**
