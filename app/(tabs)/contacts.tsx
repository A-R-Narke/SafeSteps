import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native"; // Ensure useNavigation is imported
import * as Location from "expo-location";
import { useFonts } from "expo-font";
import * as React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Card, Dialog, IconButton, Portal } from "react-native-paper";
import { sendWhatsAppLocationViaTwilio, isTwilioConfigured } from "../../services/twilioService";

type Contact = {
  id: string;
  name: string;
  phone: string;
};

const CONTACTS_STORAGE_KEY = "@SafeRoute:contacts";

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const theme = {
  colors: {
    primary: "#f661ab",
    secondary: "#cd43d2",
    backgroundOverlay: "#f5f5f5",
    cardBackground: "#fff",
    text: "#fff", // This color is used for button labels, not general text in your styles
    border: "#ddd",
    danger: "#ff4444",
  },
  font: "Lufga",
};

export default function ContactsScreen() {
  const navigation = useNavigation(); // Initialize useNavigation
  const [fontsLoaded] = useFonts({
    Lufga: require("../../assets/fonts/LufgaRegular.ttf"),
  });
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const contactIdToDelete = React.useRef<string | null>(null);

  React.useEffect(() => {
    loadContacts();
  }, []);

  if (!fontsLoaded) return null;

  const loadContacts = async () => {
    try {
      const savedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    } catch (error) {
      console.error("Failed to load contacts", error);
    }
  };

  const saveContacts = React.useCallback(async (updatedContacts: Contact[]) => {
    try {
      await AsyncStorage.setItem(
        CONTACTS_STORAGE_KEY,
        JSON.stringify(updatedContacts)
      );
    } catch (error) {
      console.error("Failed to save contacts", error);
    }
  }, []);

  const handleAddContact = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    const isValidPhone = /^\d{10}$/.test(phoneDigits);

    if (!isValidPhone) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit phone number"
      );
      return;
    }

    const newContact: Contact = {
      id: generateId(),
      name: name.trim(),
      phone: phoneDigits,
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    saveContacts(updatedContacts);
    setName("");
    setPhone("");
  };

  const handleEdit = () => {
    if (!editingId || !name.trim() || !phone.trim()) return;

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit phone number"
      );
      return;
    }

    const updatedContacts = contacts.map((contact) =>
      contact.id === editingId
        ? { ...contact, name: name.trim(), phone: phoneDigits }
        : contact
    );

    setContacts(updatedContacts);
    saveContacts(updatedContacts);
    setEditingId(null);
    setName("");
    setPhone("");
    setDialogVisible(false);
  };

  const performDelete = React.useCallback(async () => {
    if (!contactIdToDelete.current) return;

    try {
      const updatedContacts = contacts.filter(
        (contact) => contact.id !== contactIdToDelete.current
      );

      setContacts(updatedContacts);

      await AsyncStorage.setItem(
        CONTACTS_STORAGE_KEY,
        JSON.stringify(updatedContacts)
      );

      contactIdToDelete.current = null;
      setDialogVisible(false); // Ensure dialog is closed after delete

      Alert.alert("Success", "Contact deleted successfully");
    } catch (error) {
      console.error("Failed to delete contact", error);
      Alert.alert("Error", "Failed to delete contact");
    }
  }, [contacts, saveContacts]); // Added saveContacts to dependency array

  const handleDelete = (id: string) => {
    contactIdToDelete.current = id;
    Alert.alert(
      "Delete Contact",
      "Are you sure you want to delete this contact?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            contactIdToDelete.current = null;
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (contactIdToDelete.current) {
              performDelete();
            }
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          contactIdToDelete.current = null;
        },
      }
    );
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const startEditing = (contact: Contact) => {
    setName(contact.name);
    setPhone(contact.phone);
    setEditingId(contact.id);
    setDialogVisible(true);
  };

  // Function to handle sharing live location via WhatsApp
  const handleShareViaWhatsApp = async (contact: Contact) => {
    try {
      // Request location permission if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is required to share your location via WhatsApp."
        );
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = currentLocation.coords.latitude;
      const lng = currentLocation.coords.longitude;

      // Create Google Maps link
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      
      // Phone number format: remove any spaces or special chars, ensure it's just digits
      const phoneNumber = contact.phone.replace(/\D/g, "");

      // Try Twilio first if configured
      if (isTwilioConfigured()) {
        try {
          const result = await sendWhatsAppLocationViaTwilio(
            phoneNumber,
            {
              latitude: lat,
              longitude: lng,
              mapsLink: mapsLink,
            },
            contact.name
          );

          if (result.success) {
            Alert.alert(
              "✅ Location Shared",
              result.message || `Location shared successfully with ${contact.name} via WhatsApp.`,
              [{ text: "OK" }]
            );
            return;
          } else {
            // Show detailed error message to user
            const errorMsg = result.error || "Unknown error occurred";
            console.warn("Twilio failed:", errorMsg);
            console.warn("Full error details:", result);
            
            // Show error but continue to fallback automatically
            // User will see the error but WhatsApp link will still open
          }
        } catch (twilioError: any) {
          console.error("Twilio error, falling back to direct WhatsApp:", twilioError);
          Alert.alert(
            "Twilio Error",
            `Failed to send via Twilio: ${twilioError.message || "Unknown error"}\n\nFalling back to direct WhatsApp link...`,
            [{ text: "OK" }]
          );
          // Continue to fallback method
        }
      }

      // Fallback: Direct WhatsApp link (original method)
      // Create WhatsApp message
      const message = encodeURIComponent(
        `📍 My Live Location\n\n` +
        `Latitude: ${lat.toFixed(6)}\n` +
        `Longitude: ${lng.toFixed(6)}\n\n` +
        `View on Map: ${mapsLink}\n\n` +
        `Shared via SafeRoute`
      );
      
      // WhatsApp URL format: https://wa.me/PHONENUMBER?text=MESSAGE
      // For India, phone should be: 91XXXXXXXXXX (country code without +)
      const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${message}`;

      // Check if WhatsApp is installed
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback: Try WhatsApp Web or show alternative
        Alert.alert(
          "WhatsApp Not Found",
          "WhatsApp is not installed. Please install WhatsApp to share location.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Copy Link",
              onPress: async () => {
                // Copy location link to clipboard as fallback
                const locationText = `My Location: ${mapsLink}`;
                // For clipboard, you'd need expo-clipboard package
                Alert.alert(
                  "Location Link",
                  `Share this link: ${mapsLink}`,
                  [{ text: "OK" }]
                );
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error);
      Alert.alert(
        "Error",
        "Failed to share location via WhatsApp. Please try again."
      );
    }
  };

  // Function to handle sharing live location for a specific contact (from previous turns)
  const handleShareLiveLocation = (contact: Contact) => {
    Alert.alert(
      "Share Live Location",
      `How would you like to share your location with ${contact.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Via WhatsApp",
          onPress: () => handleShareViaWhatsApp(contact),
        },
        {
          text: "Via App (Firebase)",
          onPress: () => {
            navigation.navigate("LiveLocationShareScreen", {
              startSharing: true,
              targetContact: {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.primary, fontFamily: theme.font },
            ]}
          >
            Emergency Contacts
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.secondary, fontFamily: theme.font },
            ]}
          >
            Save important contacts for quick access
          </Text>
        </View>

        {/* Quick Share Buttons */}
        {contacts.length > 0 && (
          <View style={styles.quickShareContainer}>
            <Button
              mode="contained"
              icon="whatsapp"
              onPress={async () => {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== "granted") {
                    Alert.alert(
                      "Permission Required",
                      "Location permission is required to share your location."
                    );
                    return;
                  }

                  const currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                  });

                  const lat = currentLocation.coords.latitude;
                  const lng = currentLocation.coords.longitude;
                  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

                  // Send to ALL contacts if Twilio is configured
                  const twilioConfigured = isTwilioConfigured();
                  console.log("Twilio configured:", twilioConfigured);
                  console.log("Total contacts to send to:", contacts.length);
                  
                  if (twilioConfigured) {
                    let successCount = 0;
                    let failCount = 0;
                    const failedContacts: string[] = [];
                    const successContacts: string[] = [];

                    // Show initial alert
                    Alert.alert(
                      "Sending Location",
                      `Sending location to ${contacts.length} contact(s) via WhatsApp...\n\nPlease wait...`,
                      [],
                      { cancelable: false }
                    );

                    // Send to each contact sequentially
                    console.log("Starting to send to all contacts...");
                    for (let i = 0; i < contacts.length; i++) {
                      const contact = contacts[i];
                      try {
                        const phoneNumber = contact.phone.replace(/\D/g, "");
                        console.log(`[${i + 1}/${contacts.length}] Sending to ${contact.name} (${phoneNumber})...`);
                        
                        const result = await sendWhatsAppLocationViaTwilio(
                          phoneNumber,
                          {
                            latitude: lat,
                            longitude: lng,
                            mapsLink: mapsLink,
                          },
                          contact.name
                        );

                        if (result.success) {
                          successCount++;
                          successContacts.push(contact.name);
                          console.log(`✅ [${i + 1}/${contacts.length}] Successfully sent to ${contact.name} (${phoneNumber})`);
                        } else {
                          failCount++;
                          failedContacts.push(contact.name);
                          console.warn(`❌ [${i + 1}/${contacts.length}] Failed to send to ${contact.name}:`, result.error);
                        }

                        // Small delay between messages to avoid rate limiting (except for last contact)
                        if (i < contacts.length - 1) {
                          await new Promise(resolve => setTimeout(resolve, 800)); // Increased delay to 800ms
                        }
                      } catch (error: any) {
                        failCount++;
                        failedContacts.push(contact.name);
                        console.error(`❌ [${i + 1}/${contacts.length}] Error sending to ${contact.name}:`, error);
                      }
                    }

                    console.log("Finished sending to all contacts.");
                    console.log(`Summary: ${successCount} success, ${failCount} failed`);

                    // Show detailed summary
                    let summaryMessage = `Location shared with ${successCount} out of ${contacts.length} contact(s).\n\n`;
                    
                    if (successCount > 0) {
                      summaryMessage += `✅ Sent to: ${successContacts.join(", ")}\n\n`;
                    }
                    
                    if (failCount > 0) {
                      summaryMessage += `❌ Failed: ${failedContacts.join(", ")}\n\n`;
                      summaryMessage += `Note: Failed recipients may need to join Twilio WhatsApp Sandbox first.`;
                    }

                    Alert.alert(
                      successCount > 0 ? "✅ Location Shared" : "⚠️ Sharing Failed",
                      summaryMessage,
                      [{ text: "OK" }]
                    );
                    return;
                  } else {
                    console.warn("Twilio not configured, falling back to direct WhatsApp link");
                  }

                  // Fallback: Direct WhatsApp link (original method) - only for first contact
                  // Note: Direct WhatsApp link can only open one conversation at a time
                  const firstContact = contacts[0];
                  const phoneNumber = firstContact.phone.replace(/\D/g, "");
                  const message = encodeURIComponent(
                    `📍 My Live Location\n\n` +
                    `Latitude: ${lat.toFixed(6)}\n` +
                    `Longitude: ${lng.toFixed(6)}\n\n` +
                    `View on Map: ${mapsLink}\n\n` +
                    `Shared via SafeRoute`
                  );
                  const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${message}`;
                  
                  const canOpen = await Linking.canOpenURL(whatsappUrl);
                  if (canOpen) {
                    await Linking.openURL(whatsappUrl);
                    if (contacts.length > 1) {
                      Alert.alert(
                        "Location Shared",
                        `Location shared with ${firstContact.name}. You can forward this message to other contacts (${contacts.length - 1} more).`,
                        [{ text: "OK" }]
                      );
                    }
                  } else {
                    Alert.alert(
                      "WhatsApp Not Found",
                      "WhatsApp is not installed. Please install WhatsApp to share location."
                    );
                  }
                } catch (error) {
                  console.error("Error sharing via WhatsApp:", error);
                  Alert.alert("Error", "Failed to share location via WhatsApp.");
                }
              }}
              style={[
                styles.shareAllButton,
                { backgroundColor: "#25D366", marginBottom: 10 },
              ]}
              labelStyle={[
                styles.shareAllButtonLabel,
                { fontFamily: theme.font },
              ]}
            >
              💬 Share Location via WhatsApp
            </Button>
            
            <Button
              mode="contained"
              icon="share-variant"
              onPress={() => {
                navigation.navigate("LiveLocationShareScreen", {
                  startSharing: true,
                  shareWithAll: true,
                });
              }}
              style={[
                styles.shareAllButton,
                { backgroundColor: theme.colors.success },
              ]}
              labelStyle={[
                styles.shareAllButtonLabel,
                { fontFamily: theme.font },
              ]}
            >
              📍 Share Live Location with All Contacts ({contacts.length})
            </Button>
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { fontFamily: theme.font }]}
            placeholder="Contact Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.colors.secondary}
          />
          <TextInput
            style={[styles.input, { fontFamily: theme.font }]}
            placeholder="+91 Phone Number"
            value={phone}
            onChangeText={(text) => {
              const formatted = text.replace(/\D/g, "");
              setPhone(formatted);
            }}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.secondary}
            maxLength={10}
          />
          <Button
            mode="contained"
            onPress={editingId ? handleEdit : handleAddContact}
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.primary },
            ]}
            labelStyle={[styles.buttonLabel, { fontFamily: theme.font }]}
          >
            {editingId ? "Update Contact" : "Add Contact"}
          </Button>
        </View>

        <View style={styles.contactsList}>
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <Card
                key={contact.id}
                style={[
                  styles.contactCard,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.secondary,
                  },
                ]}
              >
                <Card.Content>
                  <Text
                    style={[
                      styles.contactName,
                      { color: theme.colors.primary, fontFamily: theme.font },
                    ]}
                  >
                    Name: {contact.name}
                  </Text>
                  <Text
                    style={[
                      styles.contactPhone,
                      { color: theme.colors.secondary, fontFamily: theme.font },
                    ]}
                  >
                    Number: +91 {contact.phone}
                  </Text>
                </Card.Content>
                <Card.Actions style={styles.cardActions}>
                  <IconButton
                    icon="phone"
                    size={24}
                    onPress={() => handleCall(contact.phone)}
                    iconColor={theme.colors.primary}
                  />
                  <IconButton
                    icon="whatsapp" // WhatsApp icon
                    size={24}
                    onPress={() => handleShareViaWhatsApp(contact)}
                    iconColor="#25D366" // WhatsApp green color
                  />
                  <IconButton
                    icon="share-variant" // MaterialCommunityIcons share icon for Firebase sharing
                    size={24}
                    onPress={() => handleShareLiveLocation(contact)}
                    iconColor={theme.colors.success}
                    style={styles.shareButton}
                  />
                  <IconButton
                    icon="pencil"
                    size={24}
                    onPress={() => startEditing(contact)}
                    iconColor={theme.colors.secondary}
                  />
                  {/* NEW: Delete Icon Button */}
                  <IconButton
                    icon="delete" // MaterialCommunityIcons delete icon
                    size={24}
                    onPress={() => handleDelete(contact.id)} // Calls handleDelete with contact ID
                    iconColor={theme.colors.danger} // Red color for delete
                  />
                </Card.Actions>
              </Card>
            ))
          ) : (
            <Text
              style={[
                styles.noContacts,
                { fontFamily: theme.font, color: theme.colors.secondary },
              ]}
            >
              No contacts saved yet
            </Text>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title
            style={{ color: theme.colors.primary, fontFamily: theme.font }}
          >
            Edit Contact
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={[styles.dialogInput, { fontFamily: theme.font }]}
              placeholder="Contact Name"
              value={name}
              onChangeText={setName}
              autoFocus
              placeholderTextColor={theme.colors.secondary}
            />
            <TextInput
              style={[styles.dialogInput, { fontFamily: theme.font }]}
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.secondary}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDialogVisible(false)}
              textColor={theme.colors.secondary}
            >
              Cancel
            </Button>
            <Button onPress={handleEdit} textColor={theme.colors.primary}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 48, // Adjusted to match your original code
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  quickShareContainer: {
    marginBottom: 20,
    marginHorizontal: 16,
  },
  shareAllButton: {
    borderRadius: 12,
    paddingVertical: 12,
    elevation: 3,
  },
  shareAllButtonLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  form: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#f661ab",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: "#f661ab",
  },
  input: {
    backgroundColor: "#f9f6fb",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 17,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    color: theme.colors.secondary, // Ensure text color is visible
  },
  addButton: {
    marginTop: 8,
    borderRadius: 10,
    elevation: 2,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.2,
  },
  contactsList: {
    marginBottom: 24,
  },
  contactCard: {
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  contactPhone: {
    fontSize: 16,
    letterSpacing: 0.1,
  },
  cardActions: {
    justifyContent: "flex-end",
  },
  noContacts: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 16,
  },
  dialogInput: {
    backgroundColor: "#f9f6fb",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 17,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    color: theme.colors.secondary, // Ensure text color is visible
  },
});

