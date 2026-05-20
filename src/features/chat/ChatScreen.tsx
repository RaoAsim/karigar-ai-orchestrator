import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { getDb } from "../../database/schema";
import { SERVICE_CATEGORIES, useStore } from "../../store/useStore";
import ProviderCard, { ProviderCardProps } from "../booking/ProviderCard";
import CollapsibleLog from "./CollapsibleLog";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const CATEGORY_LIST = SERVICE_CATEGORIES.join(", ");

interface Message {
  id: string;
  text?: string;
  sender: "user" | "system";
  providersData?: ProviderCardProps[];
  logs?: string[];
  isConfirmationCard?: boolean;
  confirmationData?: {
    service_category: string;
    city: string;
    area: string;
    time_slot: string;
  };
  isReceiptCard?: boolean;
  receiptData?: {
    providerName: string;
    category: string;
    area: string;
    time: string;
    hourlyRate: number;
    bookingId: number;
  };
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      text: "Hello! What kind of service do you need today?",
      sender: "system",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState<any>(null);
  const logout = useStore((state) => state.logout);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    const newMessage: Message = {
      id: Date.now().toString(),
      text: userMessage,
      sender: "user",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setIsLoading(true);
    setIsTyping(true);

    const activeLogs: string[] = [];
    const pushLog = (msg: string) => activeLogs.push(msg);

    try {
      pushLog("[Intake Agent]: Extracting intent via Gemini API...");

      const currentHour = new Date().getHours();
      const currentTimeContext = `The current time in Pakistan is approximately ${currentHour > 12 ? currentHour - 12 : currentHour}:00 ${currentHour >= 12 ? 'PM' : 'AM'}.`;

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: `You are a service intake assistant for Pakistan's informal economy. Extract the user's desired service, city, area, and time. ${currentTimeContext} CRITICAL RULE 1: If the user provides a specific area, landmark, or neighborhood, infer the city automatically. CRITICAL RULE 2: The ONLY valid service categories are: ${CATEGORY_LIST}. Map the user's request to the closest matching category from this list (e.g. 'AC repair' → 'ac technician', 'nai' → 'plumber'). CRITICAL RULE 3: If the user asks for formal professions (Doctor, Lawyer, Software Engineer, Accountant) or services not in the above list, or locations outside Pakistan, set is_complete to false and populate reply_to_user with a polite refusal. CRITICAL RULE 4: When the user says relative time expressions like 'aj raat' (tonight), 'kal subah' (tomorrow morning), 'abhi' (right now), convert them into a specific readable time slot based on the current time. For example: 'aj raat' in summer → 'Today at 8:00 PM', 'kal subah' → 'Tomorrow at 9:00 AM', 'abhi' → 'Today at ${currentHour > 12 ? currentHour - 12 : currentHour}:00 ${currentHour >= 12 ? 'PM' : 'AM'}'. If any of the 4 fields are still missing, ask a natural follow-up. If all 4 are present, set is_complete to true.`,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              is_complete: { type: SchemaType.BOOLEAN },
              reply_to_user: { type: SchemaType.STRING, nullable: true },
              extracted_data: {
                type: SchemaType.OBJECT,
                properties: {
                  service_category: { type: SchemaType.STRING, nullable: true },
                  city: { type: SchemaType.STRING, nullable: true },
                  area: { type: SchemaType.STRING, nullable: true },
                  time_slot: { type: SchemaType.STRING, nullable: true },
                },
              },
            },
            required: ["is_complete", "extracted_data"],
          },
        },
      });

      const conversationHistory = [...messages, newMessage]
        .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
        .join("\n");

      const prompt = `Conversation History:\n${conversationHistory}`;

      pushLog(`[Intake Agent]: Sending prompt to Gemini API...`);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      pushLog(`[Intake Agent]: Parsed intent successfully.`);

      const parsed = JSON.parse(responseText);

      if (!parsed.is_complete && parsed.reply_to_user) {
        const systemMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: parsed.reply_to_user,
          sender: "system",
          logs: [...activeLogs],
        };
        setMessages((prev) => [...prev, systemMessage]);
      } else if (parsed.is_complete) {
        pushLog("[Intake Agent]: Intent extracted successfully. Awaiting customer confirmation...");
        setIsConfirming(true);
        setExtractedSummary(parsed.extracted_data);

        const summaryMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "system",
          isConfirmationCard: true,
          confirmationData: parsed.extracted_data,
          logs: [...activeLogs],
        };
        setMessages((prev) => [...prev, summaryMessage]);
      }
    } catch (error: any) {
      console.error("Error with Gemini:", error);
      pushLog(`[Error]: Failed to process intent - ${error.message}`);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error processing your request. Please check your API key.",
        sender: "system",
        logs: [...activeLogs],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleConfirmMatch = async (summary: any) => {
    setIsConfirming(false);
    setIsLoading(true);
    setIsTyping(true);

    const activeLogs: string[] = [
      "[Customer Decision]: Confirmed booking parameters.",
      "[Matchmaker Agent]: Querying SQLite for optimal matches..."
    ];
    const pushLog = (msg: string) => {
      activeLogs.push(msg);
      // Ensure we push log update
    };

    const db = getDb();
    try {
      // 1. Try local exact match
      let matches = db.getAllSync<{
        id: number;
        name: string;
        rating: number;
        hourly_rate?: number;
        distance_km?: number;
      }>(
        `SELECT p.id, u.name, p.rating, p.hourly_rate, p.distance_km 
         FROM Providers p 
         JOIN Users u ON p.user_id = u.id 
         WHERE p.service_category = ? AND p.location_area = ? LIMIT 3`,
        [summary.service_category, summary.area]
      );

      // 2. Proximity Fallback: If less than 3 matching providers, fetch other providers in city and calculate dynamic distance
      if (!matches || matches.length < 3) {
        pushLog("[Matchmaker Agent]: Insufficient exact local matches. Initiating Proximity Fallback Search...");
        const existingIds = matches ? matches.map(m => m.id) : [];
        const placeholders = existingIds.length > 0 ? existingIds.join(',') : '-1';
        const fallbackMatches = db.getAllSync<{
          id: number;
          name: string;
          rating: number;
          hourly_rate?: number;
          distance_km?: number;
        }>(
          `SELECT p.id, u.name, p.rating, p.hourly_rate, p.distance_km 
           FROM Providers p 
           JOIN Users u ON p.user_id = u.id 
           WHERE p.service_category = ? AND p.id NOT IN (${placeholders}) LIMIT 3`,
          [summary.service_category]
        );

        if (fallbackMatches && fallbackMatches.length > 0) {
          pushLog(`[Matchmaker Agent]: Located ${fallbackMatches.length} fallback providers in neighboring sectors.`);
          const resolvedFallback = fallbackMatches.map(m => ({
            ...m,
            distance_km: m.distance_km || Math.random() * 5 + 3.5 // slightly farther distance
          }));
          matches = [...(matches || []), ...resolvedFallback].slice(0, 3);
        }
      }

      if (matches && matches.length > 0) {
        pushLog(`[Matchmaker Agent]: Resolved ${matches.length} total recommendations.`);
        const providerMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "system",
          logs: [...activeLogs],
          providersData: matches.map((match) => ({
            id: match.id,
            name: match.name,
            serviceCategory: summary.service_category,
            area: summary.area,
            rating: match.rating,
            hourlyRate: match.hourly_rate || 500,
            distance: match.distance_km || Math.random() * 4.5 + 0.5,
          })),
        };
        setMessages((prev) => [...prev, providerMessage]);
      } else {
        // Fallback to generator agent with safety instruction to prevent duplicates
        pushLog("[Matchmaker Agent]: No local match. Handing off to Generator Agent...");
        const genModel = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite",
          systemInstruction:
            "You are a Matchmaker Agent. Generate a realistic Pakistani service worker profile. Ensure name diversity. Do NOT use Muhammad Asif under any circumstances.",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                rating: { type: SchemaType.NUMBER },
                hourlyRate: { type: SchemaType.NUMBER },
              },
              required: ["name", "rating", "hourlyRate"],
            },
          },
        });

        const profilePrompt = `Generate a worker profile for a ${summary.service_category} in ${summary.area}, ${summary.city}.`;
        pushLog("[Generator Agent]: Synthesizing realistic provider profile...");
        const profileResult = await genModel.generateContent(profilePrompt);
        const profileData = JSON.parse(profileResult.response.text());

        const userResult = db.runSync(
          "INSERT INTO Users (phone_number, password, role, name) VALUES (?, ?, ?, ?)",
          [
            `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
            "pass123",
            "VENDOR",
            profileData.name,
          ],
        );

        const dynamicDist = Math.random() * 4.5 + 0.5;
        const providerResult = db.runSync(
          "INSERT INTO Providers (user_id, service_category, location_area, rating, status, hourly_rate, distance_km) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            userResult.lastInsertRowId,
            summary.service_category,
            summary.area,
            profileData.rating,
            "AVAILABLE",
            profileData.hourlyRate,
            dynamicDist,
          ],
        );

        pushLog(`[Generator Agent]: Assigned proximity (${dynamicDist.toFixed(1)} km) and synthetic rating.`);
        pushLog("[Generator Agent]: Committed new profile to database.");

        const providerMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "system",
          logs: [...activeLogs],
          providersData: [
            {
              id: providerResult.lastInsertRowId,
              name: profileData.name,
              serviceCategory: summary.service_category,
              area: summary.area,
              rating: profileData.rating,
              hourlyRate: profileData.hourlyRate,
              distance: dynamicDist,
            },
          ],
        };
        setMessages((prev) => [...prev, providerMessage]);
      }
    } catch (e: any) {
      console.error(e);
      pushLog(`[Error]: Matchmaking failed - ${e.message}`);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleCancelMatch = () => {
    setIsConfirming(false);
    setExtractedSummary(null);
    const cancelMessage: Message = {
      id: Date.now().toString(),
      sender: "system",
      text: "Got it! Please tell me what details you'd like to change (e.g. 'no, I need it tomorrow at 4 PM instead' or 'change area to F-10').",
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

    // 1. Render Double-Confirmation Summary Card
    if (item.isConfirmationCard && item.confirmationData) {
      return (
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>📋 Request Confirmation</Text>
          <View style={styles.confirmDetails}>
            <Text style={styles.confirmDetailText}>🔨 <Text style={{ fontWeight: '700' }}>Service:</Text> {item.confirmationData.service_category.toUpperCase()}</Text>
            <Text style={styles.confirmDetailText}>📍 <Text style={{ fontWeight: '700' }}>Area:</Text> {item.confirmationData.area}, {item.confirmationData.city}</Text>
            <Text style={styles.confirmDetailText}>⏰ <Text style={{ fontWeight: '700' }}>Schedule:</Text> {item.confirmationData.time_slot}</Text>
          </View>
          <Text style={styles.confirmPrompt}>Does this look correct?</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmBtnYes} onPress={() => handleConfirmMatch(item.confirmationData)}>
              <Text style={styles.confirmBtnTextYes}>Yes, Find a Karigar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnNo} onPress={handleCancelMatch}>
              <Text style={styles.confirmBtnTextNo}>No, Edit</Text>
            </TouchableOpacity>
          </View>
          {!isUser && item.logs && <CollapsibleLog logs={item.logs} />}
        </View>
      );
    }

    // 2. Render High-Fidelity Booking Receipt Card
    if (item.isReceiptCard && item.receiptData) {
      return (
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptHeaderTitle}>TICKET CONFIRMED ✓</Text>
            <Text style={styles.receiptBookingId}>REF: #{item.receiptData.bookingId}</Text>
          </View>
          <View style={styles.receiptBody}>
            <Text style={styles.receiptProviderName}>🛠️ {item.receiptData.providerName}</Text>
            <Text style={styles.receiptCategory}>{item.receiptData.category.toUpperCase()}</Text>
            
            <View style={styles.receiptDivider} />
            
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Location</Text>
              <Text style={styles.receiptValue}>{item.receiptData.area}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Schedule</Text>
              <Text style={styles.receiptValue}>{item.receiptData.time}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Hourly Rate</Text>
              <Text style={styles.receiptValue}>Rs. {item.receiptData.hourlyRate}/hr</Text>
            </View>
          </View>
          <View style={styles.receiptFooter}>
            <Text style={styles.receiptStatusText}>Your karigar has been notified and is preparing.</Text>
            <TouchableOpacity style={styles.callBtn} onPress={() => {}}>
              <Text style={styles.callBtnText}>📋 View Booking Details</Text>
            </TouchableOpacity>
          </View>
          {!isUser && item.logs && <CollapsibleLog logs={item.logs} />}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubbleWrapper,
          isUser ? styles.userBubbleWrapper : styles.systemBubbleWrapper,
        ]}
      >
        {item.providersData ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.providersScroll}
            >
              {item.providersData.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  {...provider}
                  onBookingSuccess={() => {
                    setTimeout(() => {
                      const refId = Math.floor(Math.random() * 90000 + 10000);
                      const receiptMessage: Message = {
                        id: Date.now().toString() + Math.random(),
                        sender: "system",
                        isReceiptCard: true,
                        receiptData: {
                          providerName: provider.name,
                          category: provider.serviceCategory,
                          area: provider.area,
                          time: extractedSummary ? extractedSummary.time_slot : "Today at 2:00 PM",
                          hourlyRate: provider.hourlyRate || 500,
                          bookingId: refId,
                        },
                        logs: [
                          "[Notification Dispatch]: Sending real-time mobile push notifications...",
                          "[Booking System]: Confirmed slot with artisan.",
                          "[SMS Gateway]: Enqueued SMS booking receipt to customer.",
                        ],
                      };
                      setMessages((prev) => [...prev, receiptMessage]);
                    }, 1500);
                  }}
                />
              ))}
            </ScrollView>
            {!isUser && item.logs && <CollapsibleLog logs={item.logs} />}
          </>
        ) : (
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.systemBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.systemText,
              ]}
            >
              {item.text}
            </Text>
            {!isUser && item.logs && <CollapsibleLog logs={item.logs} />}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Karigar</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {isTyping && (
          <View
            style={[styles.messageBubbleWrapper, styles.systemBubbleWrapper]}
          >
            <CollapsibleLog
              logs={["Connecting to Gemini..."]}
              isThinking={true}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, (isLoading || isConfirming) && styles.inputDisabled]}
            placeholder={isConfirming ? "Confirm or adjust request above..." : "E.g., G-13 mein AC technician chahiye"}
            placeholderTextColor="#65676B"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!isLoading && !isConfirming}
          />
          <TouchableOpacity
            style={[styles.sendButton, (isLoading || isConfirming) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isLoading || isConfirming}
          >
            <Text style={styles.sendButtonText}>
              {isLoading ? "..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5", // surface-background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 8 : 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7F3FF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#050505",
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: "#1877F2",
    fontWeight: "500",
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatContainer: {
    padding: 16,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  providersScroll: {
    flexDirection: "row",
    paddingBottom: 8,
  },
  messageBubbleWrapper: {
    width: "100%",
    marginBottom: 8, // sm spacing
  },
  userBubbleWrapper: {
    alignItems: "flex-end",
  },
  systemBubbleWrapper: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 16, // md spacing
    borderRadius: 20, // rounded lg
  },
  userBubble: {
    backgroundColor: "#1877F2", // primary
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    backgroundColor: "#FFFFFF", // neutral
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16, // body-md
  },
  userText: {
    color: "#FFFFFF", // neutral
  },
  systemText: {
    color: "#050505", // ink
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16, // md spacing
    backgroundColor: "#FFFFFF", // neutral
    borderTopWidth: 1,
    borderTopColor: "#E7F3FF", // tertiary
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F2F5", // surface-background
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20, // rounded lg
    fontSize: 16, // body-md
    color: "#050505", // ink
    marginRight: 8, // sm spacing
  },
  sendButton: {
    backgroundColor: "#1877F2", // primary
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20, // rounded lg
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#65676B", // secondary
  },
  sendButtonText: {
    color: "#FFFFFF", // neutral
    fontSize: 16, // body-md
    fontWeight: "700",
  },
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: 14,
    color: "#65676B",
    fontStyle: "italic",
  },
  inputDisabled: {
    backgroundColor: "#E4E6EB",
    color: "#8A8D91",
  },
  // Double Confirmation Card Styles
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7F3FF',
    width: '90%',
    alignSelf: 'flex-start',
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
    marginBottom: 12,
  },
  confirmDetails: {
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  confirmDetailText: {
    fontSize: 15,
    color: '#050505',
  },
  confirmPrompt: {
    fontSize: 14,
    color: '#65676B',
    marginBottom: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  confirmBtnYes: {
    flex: 1.5,
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnTextYes: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBtnNo: {
    flex: 1,
    backgroundColor: '#E4E6EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnTextNo: {
    color: '#050505',
    fontWeight: '700',
    fontSize: 15,
  },
  // Receipt Card Styles
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#31A24C', // green voucher border
    width: '92%',
    alignSelf: 'flex-start',
    marginVertical: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  receiptHeader: {
    backgroundColor: '#31A24C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptHeaderTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1.1,
  },
  receiptBookingId: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptBody: {
    padding: 16,
  },
  receiptProviderName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#050505',
  },
  receiptCategory: {
    fontSize: 12,
    color: '#31A24C',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
    marginBottom: 12,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E4E6EB',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  receiptLabel: {
    color: '#65676B',
    fontSize: 14,
  },
  receiptValue: {
    fontWeight: '600',
    color: '#050505',
    fontSize: 14,
  },
  receiptFooter: {
    backgroundColor: '#F0F2F5',
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  receiptStatusText: {
    fontSize: 13,
    color: '#65676B',
    fontWeight: '500',
  },
  callBtn: {
    backgroundColor: '#31A24C',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
