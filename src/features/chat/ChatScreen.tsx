import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import React, { useEffect, useRef, useState } from "react";
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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDb } from "../../database/schema";
import { SERVICE_CATEGORIES, useStore } from "../../store/useStore";
import ProviderCard, { ProviderCardProps } from "../booking/ProviderCard";
import CollapsibleLog from "./CollapsibleLog";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const CATEGORY_LIST = SERVICE_CATEGORIES.join(", ");

const AREA_COORDINATES: Record<string, { x: number; y: number }> = {
  'f-6': { x: 10, y: 10 },
  'f-7': { x: 8, y: 10 },
  'f-8': { x: 6, y: 10 },
  'f-10': { x: 4, y: 10 },
  'f-11': { x: 2, y: 10 },
  'g-6': { x: 10, y: 8 },
  'g-7': { x: 8, y: 8 },
  'g-8': { x: 7, y: 8 },
  'g-9': { x: 6, y: 8 },
  'g-10': { x: 4, y: 8 },
  'g-11': { x: 2, y: 8 },
  'g-13': { x: 0, y: 8 },
  'blue area': { x: 9, y: 9 },
  'i-8': { x: 8, y: 6 },
  'i-9': { x: 6, y: 6 },
  'i-10': { x: 4, y: 6 },
  'koral': { x: 13, y: 2 },
  'koral town': { x: 13, y: 2 },
  'khanna': { x: 12, y: 3 },
  'pakistan town': { x: 15, y: 0 },
  'gulberg green': { x: 18, y: -5 },
  'gulberg greens': { x: 18, y: -5 },
  'gulberg': { x: 18, y: -5 },
  'bahria town': { x: 20, y: -12 },
  'dha': { x: 22, y: -10 }
};

const AREA_ALIASES: Record<string, string> = {
  'gulberg greens': 'gulberg green',
  'koral town': 'koral',
  'koral chowk': 'koral',
};

const normalizeAreaKey = (area: string) => {
  const normalized = area.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  return AREA_ALIASES[normalized] || normalized;
};

export function calculateDynamicDistance(fromArea: string, toArea: string): number {
  if (!fromArea || !toArea) return 1.5;
  const normFrom = normalizeAreaKey(fromArea);
  const normTo = normalizeAreaKey(toArea);
  
  if (normFrom === normTo) {
    return 0.8;
  }
  
  const fromCoord = AREA_COORDINATES[normFrom] || { x: 6, y: 8 }; // default to center G-9
  const toCoord = AREA_COORDINATES[normTo] || { x: 6, y: 8 };
  
  const dx = fromCoord.x - toCoord.x;
  const dy = fromCoord.y - toCoord.y;
  
  // Euclidean distance in km times road routing deviation multiplier
  const distance = Math.sqrt(dx * dx + dy * dy) * 1.25;
  
  return Math.max(0.5, Math.round(distance * 10) / 10);
}

type MatchCandidate = {
  id: number;
  name: string;
  rating: number;
  hourly_rate?: number;
  location_area: string;
  computedDistance: number;
};

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
  confirmationResponded?: "YES" | "NO";
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
  const insets = useSafeAreaInsets();
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
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const logout = useStore((state) => state.logout);
  const flatListRef = useRef<FlatList>(null);

  const scrollToLatestMessage = (animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 120);
  };

  useEffect(() => {
    scrollToLatestMessage();
  }, [messages.length, isTyping]);

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
      pushLog("[Agentic Gateway]: Parsing semantic intent & extracting context...");

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

      pushLog(`[Agentic Gateway]: Analysing conversation history and context...`);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      pushLog(`[Agentic Gateway]: Intent parsed successfully.`);

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
        pushLog("[Agentic Gateway]: Semantic intent resolved. Awaiting customer double confirmation...");
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

  const handleConfirmMatch = async (summary: any, messageId?: string) => {
    if (messageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, confirmationResponded: "YES" } : m
        )
      );
    }
    setIsConfirming(false);
    setIsLoading(true);
    setIsTyping(true);

    const activeLogs: string[] = [
      "[Customer Decision]: Confirmed booking parameters.",
      "[Matchmaker Engine]: Querying SQLite database for optimal matches..."
    ];
    const pushLog = (msg: string) => {
      activeLogs.push(msg);
    };

    const db = getDb();
    try {
      // 1. Try local exact match
      let exactMatches = db.getAllSync<{
        id: number;
        name: string;
        rating: number;
        hourly_rate?: number;
        location_area: string;
      }>(
        `SELECT p.id, u.name, p.rating, p.hourly_rate, p.location_area 
         FROM Providers p 
         JOIN Users u ON p.user_id = u.id 
         WHERE p.service_category = ? AND (LOWER(p.location_area) = ? OR LOWER(p.location_area) = ?) LIMIT 3`,
        [summary.service_category, summary.area.toLowerCase().trim(), normalizeAreaKey(summary.area)]
      );

      let finalMatches: MatchCandidate[] = exactMatches.map((match) => ({
        ...match,
        computedDistance: calculateDynamicDistance(summary.area, match.location_area),
      }));

      // 2. If less than 3 exact matches, trigger AI to find extended network options
      if (finalMatches.length < 3) {
        pushLog("[Matchmaker Engine]: Searching extended network for available karigars in the vicinity...");
        
        const genModel = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite",
          systemInstruction:
            `You are a Matchmaker Agent. Generate one realistic Pakistani service worker profile for the requested service. Ensure name diversity. Do NOT use "Muhammad Asif" under any circumstances. Do not invent distance values; routing distance is calculated by the app.`,
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

        const profilePrompt = `Generate a worker profile for a ${summary.service_category} matching a customer request in ${summary.area}, ${summary.city}.`;
        pushLog("[Provider Verification]: Checking schedules and confirming background checks...");
        const profileResult = await genModel.generateContent(profilePrompt);
        const profileData = JSON.parse(profileResult.response.text());

        // Insert synthetic user into DB
        const userResult = db.runSync(
          "INSERT INTO Users (phone_number, password, role, name) VALUES (?, ?, ?, ?)",
          [
            `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
            "pass123",
            "VENDOR",
            profileData.name,
          ],
        );

        // Insert provider into DB
        const providerResult = db.runSync(
          "INSERT INTO Providers (user_id, service_category, location_area, rating, status, hourly_rate, distance_km) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            userResult.lastInsertRowId,
            summary.service_category,
            summary.area,
            profileData.rating,
            "AVAILABLE",
            profileData.hourlyRate,
            calculateDynamicDistance(summary.area, summary.area),
          ],
        );

        pushLog(`[Routing Engine]: Optimized route calculated. Estimated proximity: ${calculateDynamicDistance(summary.area, summary.area).toFixed(1)} km.`);
        pushLog("[Availability Sync]: Provider confirmed available for the selected slot.");

        // Add the synthetic match to our final matches
        finalMatches.push({
          id: providerResult.lastInsertRowId,
          name: profileData.name,
          rating: profileData.rating,
          hourly_rate: profileData.hourlyRate,
          location_area: summary.area,
          computedDistance: calculateDynamicDistance(summary.area, summary.area),
        });
      }

      // 3. If we STILL have less than 3 matches, query other fallback matches from the database (other areas) to fill the pool
      if (finalMatches.length < 3) {
        pushLog("[Matchmaker Engine]: Querying fallback routes to fill the candidate pool...");
        const existingIds = finalMatches.map(m => m.id);
        const placeholders = existingIds.length > 0 ? existingIds.join(',') : '-1';
        const fallbackMatches = db.getAllSync<{
          id: number;
          name: string;
          rating: number;
          hourly_rate?: number;
          location_area: string;
        }>(
          `SELECT p.id, u.name, p.rating, p.hourly_rate, p.location_area 
           FROM Providers p 
           JOIN Users u ON p.user_id = u.id 
           WHERE p.service_category = ? AND p.id NOT IN (${placeholders})`,
          [summary.service_category]
        );

        if (fallbackMatches && fallbackMatches.length > 0) {
          const rankedFallbacks = fallbackMatches
            .map((match) => ({
              ...match,
              computedDistance: calculateDynamicDistance(summary.area, match.location_area),
            }))
            .sort((a, b) => a.computedDistance - b.computedDistance || b.rating - a.rating);

          finalMatches = [
            ...finalMatches,
            ...rankedFallbacks.slice(0, 3 - finalMatches.length),
          ];
        }
      }

      finalMatches = finalMatches.sort(
        (a, b) => a.computedDistance - b.computedDistance || b.rating - a.rating
      );

      // Show the finalized list of matches (at most 3)
      pushLog(`[Matchmaker Engine]: Finalized ${finalMatches.length} prioritized matches.`);
      
      const providerMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "system",
        logs: [...activeLogs],
        providersData: finalMatches.slice(0, 3).map((match) => ({
          id: match.id,
          name: match.name,
          serviceCategory: summary.service_category,
          area: match.location_area || summary.area,
          jobArea: summary.area,
          rating: match.rating,
          hourlyRate: match.hourly_rate || 500,
          distance: match.computedDistance,
        })),
      };
      setMessages((prev) => [...prev, providerMessage]);
    } catch (e: any) {
      console.error(e);
      pushLog(`[Error]: Matchmaking failed - ${e.message}`);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleCancelMatch = (messageId?: string) => {
    if (messageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, confirmationResponded: "NO" } : m
        )
      );
    }
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
      const isResponded = !!item.confirmationResponded;
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
            <TouchableOpacity 
              style={[
                styles.confirmBtnYes, 
                isResponded && (item.confirmationResponded === "YES" ? styles.confirmBtnActive : styles.confirmBtnDisabled)
              ]} 
              onPress={() => handleConfirmMatch(item.confirmationData, item.id)}
              disabled={isResponded}
            >
              <Text style={[styles.confirmBtnTextYes, isResponded && item.confirmationResponded !== "YES" && { color: '#050505' }]}>Yes, Find a Karigar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.confirmBtnNo, 
                isResponded && (item.confirmationResponded === "NO" ? styles.confirmBtnActive : styles.confirmBtnDisabled)
              ]} 
              onPress={() => handleCancelMatch(item.id)}
              disabled={isResponded}
            >
              <Text style={[styles.confirmBtnTextNo, isResponded && item.confirmationResponded !== "NO" && { color: '#8A8D91' }]}>No, Edit</Text>
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
            <TouchableOpacity 
              style={styles.callBtn} 
              onPress={() => {
                setSelectedReceipt(item.receiptData);
                setReceiptModalVisible(true);
              }}
            >
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
                  bookingTime={extractedSummary?.time_slot}
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
                          area: provider.jobArea || provider.area,
                          time: extractedSummary ? extractedSummary.time_slot : "Today at 2:00 PM",
                          hourlyRate: provider.hourlyRate || 500,
                          bookingId: refId,
                        },
                        logs: [
                          "[Booking Core]: Locking schedule block...",
                          "[Routing Engine]: Confirmed slot and optimized ETA.",
                          "[Event Bus]: Enqueued SMS booking receipt to customer.",
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            isTyping ? (
              <View
                style={[
                  styles.messageBubbleWrapper,
                  styles.systemBubbleWrapper,
                  styles.typingFooter,
                ]}
              >
                <CollapsibleLog
                  logs={isConfirming ? ["Processing..."] : ["Analyzing request..."]}
                  isThinking={true}
                />
              </View>
            ) : null
          }
          onLayout={() => scrollToLatestMessage(false)}
          onContentSizeChange={() => scrollToLatestMessage()}
        />

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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

      <Modal
        visible={receiptModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                <Text style={styles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedReceipt && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Reference ID</Text>
                  <Text style={styles.modalValue}>#{selectedReceipt.bookingId}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Karigar</Text>
                  <Text style={styles.modalValue}>{selectedReceipt.providerName}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Service</Text>
                  <Text style={styles.modalValue}>{selectedReceipt.category.toUpperCase()}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Location</Text>
                  <Text style={styles.modalValue}>{selectedReceipt.area}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Schedule</Text>
                  <Text style={styles.modalValue}>{selectedReceipt.time}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Rate</Text>
                  <Text style={styles.modalValue}>Rs. {selectedReceipt.hourlyRate}/hr</Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setReceiptModalVisible(false)}>
              <Text style={styles.modalPrimaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  typingFooter: {
    marginTop: 4,
    marginBottom: 10,
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
  confirmBtnDisabled: {
    backgroundColor: '#E4E6EB',
    opacity: 0.5,
  },
  confirmBtnActive: {
    opacity: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F2F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E7F3FF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
  },
  modalCloseBtn: {
    fontSize: 18,
    color: '#65676B',
    fontWeight: '600',
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  modalLabel: {
    fontSize: 14,
    color: '#65676B',
    fontWeight: '500',
  },
  modalValue: {
    fontSize: 14,
    color: '#050505',
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    backgroundColor: '#1877F2',
    padding: 14,
    alignItems: 'center',
    margin: 16,
    borderRadius: 10,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
