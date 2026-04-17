// components/maps/RouteOptionsDisplay.js
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GlobalStyles } from "../../constants/GlobalStyles";
import SafetyToggle from "./SafetyToggle"; // Import the new toggle component

/**
 * RouteOptionsDisplay Component
 * Shows available route options with safety information and allows selection.
 *
 * Props:
 * - isVisible: Boolean to control visibility.
 * - routeOptions: Array of route objects with safety analysis.
 * - selectedRouteIndex: Index of the currently selected route.
 * - onSelectRoute: Function to call when a route option is selected.
 * - onViewDirections: Function to call to view detailed directions.
 * - onStartNavigation: Function to start navigation with the selected route.
 * - onRecalculateRoute: Function to trigger re-calculation of the current route. (NEW)
 * - safeRouteOnly: Boolean indicating if safe route preference is active.
 * - onToggleSafeRouteOnly: Function to toggle the safe route preference.
 */
const RouteOptionsDisplay = ({
  isVisible,
  routeOptions,
  selectedRouteIndex,
  onSelectRoute,
  onViewDirections,
  onStartNavigation,
  onRecalculateRoute, // NEW PROP
  safeRouteOnly,
  onToggleSafeRouteOnly,
}) => {
  if (!isVisible || routeOptions.length === 0) return null;

  const currentRoute = routeOptions[selectedRouteIndex];
  
  // Debug: Log route safety data
  if (routeOptions.length > 0 && routeOptions[0]) {
    console.log("RouteOptionDisplay - Route safety data:", {
      hasSafety: !!routeOptions[0].safety,
      averageScore: routeOptions[0].safety?.averageScore,
      overall: routeOptions[0].safety?.overall,
      routeId: routeOptions[0].id
    });
  }

  return (
    <View style={styles.routeOptionsContainer}>
      {/* Safety Toggle */}
      <SafetyToggle
        safeRouteOnly={safeRouteOnly}
        onToggle={onToggleSafeRouteOnly}
      />

      {/* Main Scrollable Container for all content */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {/* Horizontal Scroll for Route Options - Higher z-index */}
        <View style={styles.routeCardsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routeOptionsScrollContent}
            nestedScrollEnabled={true}
          >
        {routeOptions.map((route, index) => {
          // Calculate score with guaranteed fallback
          let score = route.safety?.averageScore;
          
          // Debug logging
          console.log(`Route ${index} - Safety data:`, {
            hasSafety: !!route.safety,
            averageScore: route.safety?.averageScore,
            overall: route.safety?.overall,
            color: route.color
          });
          
          if (score === undefined || score === null || isNaN(score)) {
            if (route.safety?.overall === "safe") score = 4.5;
            else if (route.safety?.overall === "caution") score = 3.0;
            else if (route.safety?.overall === "dangerous") score = 1.5;
            else score = 3.0; // Default fallback
          }
          score = Number(score);
          if (isNaN(score) || score < 0) score = 3.0;
          if (score > 5) score = 5.0;
          
          // Ensure we always have a valid score
          const finalScore = score || 3.0;
          
          console.log(`Route ${index} - Final score: ${finalScore}`);
          
          // Determine status
          const overall = route.safety?.overall;
          const statusText = overall === "dangerous" || finalScore < 2.5
            ? "Dangerous"
            : overall === "safe" || finalScore >= 4.0
            ? "Good"
            : "Moderate";
          
          const statusEmoji = statusText === "Dangerous" ? "⚠️" : statusText === "Good" ? "✅" : "⚡";
          
          return (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.routeOption,
                index === selectedRouteIndex && styles.selectedRouteOption,
              ]}
              onPress={() => onSelectRoute(index)}
              activeOpacity={0.7}
            >
              {/* Scrollable content container */}
              <ScrollView 
                style={styles.routeContentScroll}
                contentContainerStyle={styles.routeContentContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {/* Header with time and status badge */}
                <View style={styles.routeOptionHeader}>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeIcon}>⏱️</Text>
                    <Text style={[styles.routeOptionTime, index === selectedRouteIndex && styles.selectedRouteText, { marginLeft: 4 }]}>
                      {route.duration} min
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: route.color || "#2196F3" }]}>
                    <Text style={styles.statusBadgeText}>{statusEmoji}</Text>
                  </View>
                </View>
                
                {/* Route Title */}
                <Text style={styles.routeOptionTitle} numberOfLines={2}>{route.title}</Text>
                
                {/* Distance */}
                <View style={styles.distanceContainer}>
                  <Text style={styles.distanceIcon}>📍</Text>
                  <Text style={[styles.routeOptionDescription, { marginLeft: 4 }]}>
                    {route.distance.toFixed(1)} km
                  </Text>
                </View>
                
                {/* Safety Score - Prominent Display - ALWAYS VISIBLE */}
                <View style={[styles.safetyScoreContainer, { borderLeftColor: route.color || "#2196F3" }]}>
                  <View style={styles.safetyScoreLeft}>
                    <Text style={styles.safetyScoreIcon}>🛡️</Text>
                    <Text style={[styles.safetyScoreLabel, { marginLeft: 6 }]}>Score</Text>
                  </View>
                  <View style={styles.safetyScoreBadgeContainer}>
                    <Text style={[styles.safetyScoreValue, { color: route.color || "#2196F3" }]}>
                      {finalScore.toFixed(1)}
                    </Text>
                    <Text style={styles.safetyScoreMax}>/5</Text>
                  </View>
                </View>
                
                {/* Route Status Badge */}
                <View style={[styles.routeStatusBadge, { backgroundColor: route.color || "#2196F3", opacity: 0.15 }]}>
                  <Text style={[styles.routeStatusText, { color: route.color || "#2196F3" }]}>
                    {statusEmoji} {statusText}
                  </Text>
                </View>
              </ScrollView>
            </TouchableOpacity>
          );
        })}
          </ScrollView>
        </View>

        {/* Action Buttons for Selected Route - Lower z-index, below route cards */}
        {currentRoute && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={onViewDirections}
              activeOpacity={0.8}
            >
              <Text style={styles.directionsButtonIcon}>🧭</Text>
              <Text style={styles.directionsButtonText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startNavigationButton,
                { backgroundColor: currentRoute.color || GlobalStyles.colors.success },
              ]}
              onPress={onStartNavigation}
              activeOpacity={0.8}
            >
              <Text style={styles.startNavigationIcon}>🚀</Text>
              <Text style={styles.startNavigationText}>Start</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NEW: Recalculate Route Button */}
        {onRecalculateRoute && (
          <TouchableOpacity
            style={styles.recalculateButton}
            onPress={onRecalculateRoute}
            activeOpacity={0.8}
          >
            <Text style={styles.recalculateButtonIcon}>🔄</Text>
            <Text style={styles.recalculateButtonText}>Recalculate Route</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  routeOptionsContainer: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    ...GlobalStyles.shadow,
    maxHeight: "60%", // Increased to show more content
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    zIndex: 1000,
    elevation: 10,
  },
  mainScrollView: {
    flex: 1,
    width: "100%",
  },
  mainScrollContent: {
    paddingBottom: 20, // Extra padding at bottom for scrolling
    flexGrow: 1,
  },
  routeCardsWrapper: {
    zIndex: 1001,
    elevation: 11,
    position: "relative",
  },
  routeOptionsScrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  routeOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
    minWidth: 160,
    maxWidth: 160,
    height: 200, // Fixed height with scrolling inside
    borderWidth: 2,
    borderColor: "#E0E0E0",
    ...GlobalStyles.shadowSmall,
    overflow: "hidden",
    zIndex: 1001,
    elevation: 11,
  },
  routeContentScroll: {
    flex: 1,
    width: "100%",
  },
  routeContentContainer: {
    paddingBottom: 4,
  },
  selectedRouteOption: {
    backgroundColor: "#F0F7FF",
    borderColor: GlobalStyles.colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.02 }],
  },
  routeOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeIcon: {
    fontSize: 14,
  },
  routeOptionTime: {
    fontSize: 15,
    fontWeight: "700",
    color: GlobalStyles.colors.textPrimary,
    letterSpacing: 0.15,
  },
  selectedRouteText: {
    color: GlobalStyles.colors.primary,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...GlobalStyles.shadowSmall,
  },
  statusBadgeText: {
    fontSize: 14,
  },
  routeOptionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: GlobalStyles.colors.textPrimary,
    marginBottom: 3,
    letterSpacing: 0.1,
    lineHeight: 14,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  distanceIcon: {
    fontSize: 12,
  },
  routeOptionDescription: {
    fontSize: 11,
    color: GlobalStyles.colors.textSecondary,
    fontWeight: "500",
  },
  safetyScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 3,
    padding: 6,
    paddingLeft: 6,
    paddingRight: 6,
    borderLeftWidth: 3,
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    minHeight: 38,
    width: "100%",
  },
  safetyScoreLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  safetyScoreIcon: {
    fontSize: 12,
  },
  safetyScoreLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: GlobalStyles.colors.textPrimary,
    letterSpacing: 0.1,
  },
  safetyScoreBadgeContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  safetyScoreValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  safetyScoreMax: {
    fontSize: 11,
    fontWeight: "500",
    color: GlobalStyles.colors.textSecondary,
    marginLeft: 2,
  },
  routeStatusBadge: {
    marginTop: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    minHeight: 24,
  },
  routeStatusText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.1,
    lineHeight: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
    zIndex: 999,
    elevation: 9,
    position: "relative",
  },
  directionsButton: {
    flex: 1,
    backgroundColor: GlobalStyles.colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    ...GlobalStyles.shadowSmall,
  },
  directionsButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  directionsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  startNavigationButton: {
    flex: 1,
    backgroundColor: GlobalStyles.colors.success,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    ...GlobalStyles.shadowSmall,
  },
  startNavigationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  startNavigationText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  recalculateButton: {
    backgroundColor: GlobalStyles.colors.info,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    ...GlobalStyles.shadowSmall,
    zIndex: 999,
    elevation: 9,
    position: "relative",
  },
  recalculateButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  recalculateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default RouteOptionsDisplay;
