// components/SavedPlacesScreen.js (or screens/SavedPlacesScreen.js)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native"; // Import useFocusEffect
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GlobalStyles } from "../constants/GlobalStyles";

// Type assertion for colors property to fix TypeScript errors
const GlobalStylesWithColors = GlobalStyles as typeof GlobalStyles & {
  colors: {
    primary: string;
    primaryLight: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    textPrimary: string;
    textSecondary: string;
    textLight: string;
    background: string;
    backgroundLight: string;
    cardBackground: string;
    backgroundSelected: string;
    lightGray: string;
    border: string;
  };
};
interface SavedLocation {
  id: string;
  title: string;
  subtitle: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

const SavedPlacesScreen = () => {
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([]);
  const navigation = useNavigation();

  // Function to load saved places from AsyncStorage
  const loadSavedPlaces = useCallback(async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("savedLocations");
      const loadedPlaces: SavedLocation[] =
        jsonValue != null ? JSON.parse(jsonValue) : [];
      setSavedPlaces(loadedPlaces);
    } catch (e) {
      Alert.alert("Error", "Could not load saved places.");
    }
  }, []);

  // Use useFocusEffect to reload data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedPlaces();
      return () => {
        // Optional: cleanup function if needed when screen blurs
      };
    }, [loadSavedPlaces])
  );

  // Function to delete a saved place
  const handleDeletePlace = async (id: string) => {
    Alert.alert(
      "Delete Place",
      "Are you sure you want to delete this saved place?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const updatedPlaces = savedPlaces.filter(
                (place) => place.id !== id
              );
              await AsyncStorage.setItem(
                "savedLocations",
                JSON.stringify(updatedPlaces)
              );
              setSavedPlaces(updatedPlaces); // Update state to re-render list
              Alert.alert("Deleted", "Place removed from saved list.");
            } catch (e) {
              console.error("Failed to delete place:", e);
              Alert.alert("Error", "Could not delete place.");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Function to navigate back to SafeMaps and show the selected place on the map
  const handleViewOnMap = (place: SavedLocation) => {
    (navigation as any).navigate("(tabs)", {
      screen: "navigate",
      params: {
        selectedPlaceForMap: place.coordinate,
        selectedPlaceTitle: place.title,
        selectedPlaceSubtitle: place.subtitle,
      },
    });
  };

  const renderItem = ({ item }: { item: SavedLocation }) => (
    <View style={componentStyles.placeItem}>
      <View style={componentStyles.placeInfo}>
        <Text style={componentStyles.placeTitle}>{item.title}</Text>
        <Text style={componentStyles.placeSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={componentStyles.actionsContainer}>
        <TouchableOpacity
          style={componentStyles.actionButton}
          onPress={() => handleViewOnMap(item)}
        >
          <Text style={componentStyles.actionButtonText}>🗺️ View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={componentStyles.actionButton}
          onPress={() => handleDeletePlace(item.id)}
        >
          <Text style={componentStyles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={componentStyles.header}>
        <Text style={componentStyles.headerTitle}>Your Saved Places</Text>
      </View>
      {savedPlaces.length === 0 ? (
        <View style={componentStyles.emptyContainer}>
          <Text style={componentStyles.emptyText}>No saved places yet.</Text>
          <Text style={componentStyles.emptySubText}>
            Search for a place and tap 'Save' to add it here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={componentStyles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const componentStyles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: GlobalStylesWithColors.colors.lightGray,
    backgroundColor: GlobalStylesWithColors.colors.background,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: GlobalStylesWithColors.colors.textPrimary,
    textAlign: "center",
  },
  listContent: {
    padding: 10,
  },
  placeItem: {
    backgroundColor: GlobalStylesWithColors.colors.cardBackground,
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...GlobalStyles.shadow,
  },
  placeInfo: {
    flex: 1,
    marginRight: 10,
  },
  placeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: GlobalStylesWithColors.colors.textPrimary,
  },
  placeSubtitle: {
    fontSize: 14,
    color: GlobalStylesWithColors.colors.textSecondary,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: "row",
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 10,
    borderRadius: 5,
    backgroundColor: GlobalStylesWithColors.colors.primaryLight,
  },
  actionButtonText: {
    color: GlobalStylesWithColors.colors.textPrimary,
    fontWeight: "bold",
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: GlobalStylesWithColors.colors.textSecondary,
    marginBottom: 10,
    fontWeight: "bold",
  },
  emptySubText: {
    fontSize: 14,
    color: GlobalStylesWithColors.colors.textSecondary,
    textAlign: "center",
  },
});

export default SavedPlacesScreen;
