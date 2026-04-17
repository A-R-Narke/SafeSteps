import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts as useExpoFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as Location from "expo-location";
import { SplashScreen, useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    View
} from "react-native";
import { Button } from "react-native-paper";
import { sendWhatsAppLocationViaTwilio, isTwilioConfigured } from "../../services/twilioService";

type Contact = {
  id: string;
  name: string;
  phone: string;
};

const CONTACTS_STORAGE_KEY = "@SafeRoute:contacts";

SplashScreen.preventAutoHideAsync();

const theme = {
    colors: {
        primary: "#f661abff",
        secondary: "#cd43d2ff",
        backgroundOverlay: "rgba(232, 138, 219, 1)",
        cardBackground: "#FFFFFF",
    },
};

function useFonts(fontMap: { [key: string]: any }): [boolean] {
    const [loaded] = useExpoFonts(fontMap);
    return [loaded];
}

const HomePage = () => {
    const router = useRouter();
    const [Loading, setLoading] = React.useState(false);
    const [fontsLoaded] = useFonts({
        'Lufga': require('../../assets/fonts/LufgaRegular.ttf'), 
        'Magesta': require('../../assets/fonts/Magesta.ttf'),
    });

    React.useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    const loadEmergencyContacts = async (): Promise<Contact[]> => {
        try {
            const savedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
            if (savedContacts) {
                return JSON.parse(savedContacts);
            }
            return [];
        } catch (error) {
            console.error("Failed to load emergency contacts:", error);
            return [];
        }
    };

    const sendLocationToAllContacts = async (contacts: Contact[]) => {
        if (contacts.length === 0) {
            console.log("No emergency contacts found to share location with");
            return { successCount: 0, failCount: 0 };
        }

        try {
            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                console.warn("Location permission not granted for SOS location sharing");
                return { successCount: 0, failCount: contacts.length };
            }

            // Get current location
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const lat = currentLocation.coords.latitude;
            const lng = currentLocation.coords.longitude;
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

            // Create emergency message
            const emergencyMessage = `🚨 *EMERGENCY SOS - Live Location*\n\n` +
                `I need help! This is my current location:\n\n` +
                `Latitude: ${lat.toFixed(6)}\n` +
                `Longitude: ${lng.toFixed(6)}\n\n` +
                `View on Map: ${mapsLink}\n\n` +
                `Sent via SafeRoute SOS`;

            let successCount = 0;
            let failCount = 0;
            const successContacts: string[] = [];
            const failedContacts: string[] = [];

            // Send to all contacts via Twilio if configured
            if (isTwilioConfigured()) {
                console.log(`SOS: Sending location to ${contacts.length} emergency contact(s) via Twilio...`);
                
                for (let i = 0; i < contacts.length; i++) {
                    const contact = contacts[i];
                    try {
                        const phoneNumber = contact.phone.replace(/\D/g, "");
                        console.log(`SOS: [${i + 1}/${contacts.length}] Sending to ${contact.name} (${phoneNumber})...`);
                        
                        const result = await sendWhatsAppLocationViaTwilio(
                            phoneNumber,
                            {
                                latitude: lat,
                                longitude: lng,
                                mapsLink: mapsLink,
                            },
                            contact.name,
                            emergencyMessage // Use custom emergency message
                        );

                        if (result.success) {
                            successCount++;
                            successContacts.push(contact.name);
                            console.log(`SOS: ✅ Successfully sent to ${contact.name}`);
                        } else {
                            failCount++;
                            failedContacts.push(contact.name);
                            console.warn(`SOS: ❌ Failed to send to ${contact.name}:`, result.error);
                        }

                        // Small delay between messages
                        if (i < contacts.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    } catch (error: any) {
                        failCount++;
                        failedContacts.push(contact.name);
                        console.error(`SOS: Error sending to ${contact.name}:`, error);
                    }
                }
            } else {
                console.warn("SOS: Twilio not configured, cannot send location via WhatsApp");
                failCount = contacts.length;
            }

            return { successCount, failCount, successContacts, failedContacts };
        } catch (error) {
            console.error("SOS: Error getting location or sending messages:", error);
            return { successCount: 0, failCount: contacts.length, successContacts: [], failedContacts: contacts.map(c => c.name) };
        }
    };

    const onButtonPress = async () => {
        setLoading(true);
        try {
            // Make emergency call first
            await Linking.openURL('tel:122');
            
            // Load emergency contacts and send location
            const contacts = await loadEmergencyContacts();
            
            if (contacts.length > 0) {
                // Send location in background (don't block the UI)
                sendLocationToAllContacts(contacts).then((result) => {
                    if (result.successCount > 0) {
                        let message = `🚨 Emergency call made!\n\n`;
                        message += `Location shared with ${result.successCount} out of ${contacts.length} contact(s).\n\n`;
                        
                        if (result.successContacts.length > 0) {
                            message += `✅ Sent to: ${result.successContacts.join(", ")}\n\n`;
                        }
                        
                        if (result.failCount > 0 && result.failedContacts) {
                            message += `❌ Failed: ${result.failedContacts.join(", ")}\n\n`;
                            message += `Note: Recipients need to join Twilio WhatsApp Sandbox first.`;
                        }
                        
                        Alert.alert(
                            "🚨 SOS Activated",
                            message,
                            [{ text: "OK" }]
                        );
                    } else if (contacts.length > 0) {
                        Alert.alert(
                            "🚨 SOS Activated",
                            `Emergency call made!\n\nCould not share location via WhatsApp. Please share your location manually if needed.`,
                            [{ text: "OK" }]
                        );
                    }
                }).catch((error) => {
                    console.error("SOS: Error in location sharing:", error);
                });
            } else {
                Alert.alert(
                    "🚨 Emergency Call Made",
                    "Emergency call initiated. No emergency contacts found to share location with.",
                    [{ text: "OK" }]
                );
            }
        } catch (error) {
            console.error("SOS: Error making emergency call:", error);
            Alert.alert(
                "Error",
                "Failed to make emergency call. Please try again or dial 122 manually.",
                [{ text: "OK" }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.background}>
            <View style={[styles.overlay, { backgroundColor: "#AC1754" }]}>
            <Text style={styles.title}>SafeRoute</Text>
            <View style={styles.card}>
                <Text style={styles.header}>Emergency SOS</Text>
                <Image source={require('../../assets/images/Alert.png')} style={styles.logo} />
                <Text style={[styles.description, { textAlign: 'center', marginBottom: 30, color: '#666' }]}>
                {Loading ? 'Making emergency call... Please remain calm and stay safe' : 'Press the button below to make an emergency SOS call'}
                </Text>
                <Button
                    mode="contained"
                    onPress={onButtonPress}
                    loading={Loading}
                    disabled={Loading}
                    style={[styles.button, { backgroundColor: '#e74c3c' }]}
                    labelStyle={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
                >
                    {Loading ? 'Calling...' : 'Emergency Call'}
                </Button>
            </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        backgroundColor: theme.colors.cardBackground,
        padding: 20,
        borderRadius: 12,
        width: "80%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
    title: {
        fontFamily: 'Magesta',
        fontSize: 50,
        color: 'white',
        fontWeight: "bold",
        margin: 24,
    },
    header: {
        fontFamily: 'Magesta',
        fontSize: 24,
        color: theme.colors.primary,
        fontWeight: "bold",
        margin: 24,
    },
    subHeader: {
        fontFamily: 'Lufga',
        fontSize: 18,
        fontWeight: "500",
    },
    description: {
        fontFamily: 'Lufga',
        fontSize: 14,
        lineHeight: 20,
    },
    button: {
        marginTop: 10,
        width: "100%",
    },
});

export default HomePage;
