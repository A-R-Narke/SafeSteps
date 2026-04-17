// components/maps/MultiplePlacesModal.js
import React from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GlobalStyles } from "../../constants/GlobalStyles";

/**
 * MultiplePlacesModal Component
 * Displays a list of multiple nearby places (police stations or hospitals) with distance and navigation options.
 *
 * Props:
 * - isVisible: Boolean to control modal visibility.
 * - places: Array of place objects with {title, subtitle, distance, type, coordinate}.
 * - placeType: String indicating type ('police' or 'hospital').
 * - onSelectPlace: Function to call when user selects a place for navigation.
 * - onCancel: Function to call when user cancels.
 */
const MultiplePlacesModal = ({
  isVisible,
  places,
  placeType,
  onSelectPlace,
  onCancel,
}) => {
  if (!isVisible || !places || places.length === 0) {
    return null;
  }

  const placeTypeDisplay =
    placeType === "police" ? "Police Stations" : "Hospitals";
  const iconEmoji = placeType === "police" ? "🚔" : "🏥";

  const renderPlaceItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.placeItem}
      onPress={() => onSelectPlace(item)}
    >
      <View style={styles.placeItemContent}>
        <View style={styles.placeIconContainer}>
          <Text style={styles.placeIcon}>{iconEmoji}</Text>
        </View>
        <View style={styles.placeDetails}>
          <Text style={styles.placeName}>{item.title}</Text>
          <Text style={styles.placeAddress} numberOfLines={2}>
            {item.subtitle}
          </Text>
          {item.distance !== undefined && (
            <View style={styles.distanceContainer}>
              <Text style={styles.placeDistance}>
                📍 {item.distance.toFixed(2)} km away
              </Text>
              {item.distance < 1 && (
                <Text style={styles.distanceMeters}>
                  ({Math.round(item.distance * 1000)}m)
                </Text>
              )}
            </View>
          )}
        </View>
        <View style={styles.navigateButtonContainer}>
          <Text style={styles.navigateIcon}>➤</Text>
        </View>
      </View>
      {index < places.length - 1 && <View style={styles.separator} />}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Nearby {placeTypeDisplay} ({places.length})
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={places}
            renderItem={renderPlaceItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
    ...GlobalStyles.shadow,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: GlobalStyles.colors.lightGray,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: GlobalStyles.colors.textPrimary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GlobalStyles.colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: GlobalStyles.colors.textSecondary,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  placeItem: {
    paddingVertical: 15,
  },
  placeItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  placeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: GlobalStyles.colors.backgroundSelected,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  placeIcon: {
    fontSize: 24,
  },
  placeDetails: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "600",
    color: GlobalStyles.colors.textPrimary,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 13,
    color: GlobalStyles.colors.textSecondary,
    marginBottom: 4,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  placeDistance: {
    fontSize: 12,
    fontWeight: "500",
    color: GlobalStyles.colors.primary,
  },
  distanceMeters: {
    fontSize: 11,
    fontWeight: "400",
    color: GlobalStyles.colors.textSecondary,
  },
  navigateButtonContainer: {
    marginLeft: 10,
  },
  navigateIcon: {
    fontSize: 20,
    color: GlobalStyles.colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: GlobalStyles.colors.lightGray,
    marginTop: 15,
  },
  cancelButton: {
    backgroundColor: GlobalStyles.colors.lightGray,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 10,
  },
  cancelButtonText: {
    color: GlobalStyles.colors.textSecondary,
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default MultiplePlacesModal;

