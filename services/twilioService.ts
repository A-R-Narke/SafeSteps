/**
 * Twilio WhatsApp Service
 * Handles sending WhatsApp messages via Twilio API
 */

import Constants from "expo-constants";

// Get Twilio credentials from environment variables or app.json config
const TWILIO_ACCOUNT_SID = 
  process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID || 
  Constants.expoConfig?.extra?.twilioAccountSid;

const TWILIO_AUTH_TOKEN = 
  process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN || 
  Constants.expoConfig?.extra?.twilioAuthToken;

const TWILIO_WHATSAPP_NUMBER = 
  process.env.EXPO_PUBLIC_TWILIO_WHATSAPP_NUMBER || 
  Constants.expoConfig?.extra?.twilioWhatsAppNumber;

/**
 * Base64 encode function for React Native compatibility
 */
function base64Encode(str: string): string {
  // Try btoa first (available in some React Native environments)
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  
  // Fallback: Manual base64 encoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    output += chars.charAt((bitmap >> 18) & 63);
    output += chars.charAt((bitmap >> 12) & 63);
    output += chars.charAt((bitmap >> 6) & 63);
    output += chars.charAt(bitmap & 63);
  }
  
  // Add padding
  const padding = str.length % 3;
  if (padding === 1) {
    output = output.slice(0, -2) + '==';
  } else if (padding === 2) {
    output = output.slice(0, -1) + '=';
  }
  
  return output;
}

interface LocationData {
  latitude: number;
  longitude: number;
  mapsLink: string;
}

/**
 * Send WhatsApp message with live location via Twilio
 * @param toPhoneNumber - Recipient phone number (format: +91XXXXXXXXXX or whatsapp:+91XXXXXXXXXX)
 * @param locationData - Location data containing lat, lng, and maps link
 * @param contactName - Optional contact name for personalization
 * @param customMessage - Optional custom message (if not provided, uses default location message)
 * @returns Promise with success status and details
 */
export async function sendWhatsAppLocationViaTwilio(
  toPhoneNumber: string,
  locationData: LocationData,
  contactName?: string,
  customMessage?: string
): Promise<{ success: boolean; message?: string; error?: string; details?: any; messageSid?: string }> {
  try {
    // Validate Twilio credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      return {
        success: false,
        error: "Twilio credentials not configured. Please set EXPO_PUBLIC_TWILIO_ACCOUNT_SID, EXPO_PUBLIC_TWILIO_AUTH_TOKEN, and EXPO_PUBLIC_WHATSAPP_NUMBER in your environment variables.",
      };
    }

    // Format phone number for WhatsApp (ensure it starts with whatsapp:)
    let formattedNumber = toPhoneNumber.trim();
    
    // Remove any non-digit characters except +
    formattedNumber = formattedNumber.replace(/[^\d+]/g, "");
    
    // Add country code if not present (assuming India +91)
    if (!formattedNumber.startsWith("+")) {
      // If it's a 10-digit number, add +91
      if (formattedNumber.length === 10) {
        formattedNumber = `+91${formattedNumber}`;
      } else {
        formattedNumber = `+${formattedNumber}`;
      }
    }
    
    // Ensure it starts with whatsapp: prefix
    if (!formattedNumber.startsWith("whatsapp:")) {
      formattedNumber = `whatsapp:${formattedNumber}`;
    }

    // Create the message with location details (use custom message if provided)
    const messageBody = customMessage || 
      (`📍 *My Live Location*\n\n` +
      `Latitude: ${locationData.latitude.toFixed(6)}\n` +
      `Longitude: ${locationData.longitude.toFixed(6)}\n\n` +
      `View on Map: ${locationData.mapsLink}\n\n` +
      `Shared via SafeRoute`);

    // Twilio API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // Create form data
    const formData = new URLSearchParams();
    formData.append("From", TWILIO_WHATSAPP_NUMBER);
    formData.append("To", formattedNumber);
    formData.append("Body", messageBody);

    // Create Basic Auth header (base64 encode)
    const credentials = `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`;
    const base64Credentials = base64Encode(credentials);

    // Make request to Twilio API
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${base64Credentials}`,
      },
      body: formData.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Twilio API Error:", responseData);
      
      // Provide more detailed error messages
      let errorMessage = responseData.message || `Twilio API error: ${response.status}`;
      
      // Check for common Twilio WhatsApp errors
      if (response.status === 400 || response.status === 21211) {
        if (responseData.message?.includes("not a valid") || responseData.message?.includes("Invalid")) {
          errorMessage = `Invalid phone number format. Please check the number: ${formattedNumber}`;
        } else if (responseData.message?.includes("not opted in") || responseData.message?.includes("not registered")) {
          errorMessage = `The recipient ${formattedNumber} needs to join the Twilio WhatsApp Sandbox first. They should send "join [your-sandbox-code]" to +1 415 523 8886 on WhatsApp.`;
        } else {
          errorMessage = `Twilio Error: ${responseData.message || `Status ${response.status}`}. Check console for details.`;
        }
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = "Twilio authentication failed. Please check your Account SID and Auth Token.";
      } else if (response.status === 404) {
        errorMessage = "Twilio WhatsApp number not found. Please verify your WhatsApp number configuration.";
      }
      
      return {
        success: false,
        error: errorMessage,
        details: responseData, // Include full error details for debugging
      };
    }

    console.log("✅ WhatsApp message sent via Twilio successfully!");
    console.log("Message SID:", responseData.sid);
    console.log("To:", formattedNumber);
    console.log("Status:", responseData.status);
    
    return {
      success: true,
      message: `Location shared successfully with ${contactName || formattedNumber} via WhatsApp.`,
      messageSid: responseData.sid,
    };
  } catch (error: any) {
    console.error("Error sending WhatsApp message via Twilio:", error);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp message via Twilio",
    };
  }
}

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  const configured = !!(
    TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN &&
    TWILIO_WHATSAPP_NUMBER
  );
  
  console.log("Twilio Configuration Check:", {
    hasAccountSid: !!TWILIO_ACCOUNT_SID,
    hasAuthToken: !!TWILIO_AUTH_TOKEN,
    hasWhatsAppNumber: !!TWILIO_WHATSAPP_NUMBER,
    configured: configured,
    accountSid: TWILIO_ACCOUNT_SID?.substring(0, 10) + "...",
    whatsAppNumber: TWILIO_WHATSAPP_NUMBER,
  });
  
  return configured;
}
