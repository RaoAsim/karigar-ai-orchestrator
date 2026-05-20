# Product Requirements Document (PRD): Karigar (کاریگر)

## 1. Project Overview

"Karigar" is a React Native mobile application built for a Google Hackathon (Challenge 2: Informal Economy). It acts as an Agentic AI System that automates the lifecycle of a service request from natural language intent to booking simulation.

## 2. Tech Stack

- **Frontend/Mobile:** React Native (via Expo)
- **State Management:** Zustand
- **Database:** `expo-sqlite` (Local, strictly handles all state changes for demo purposes)
- **AI Orchestration:** Google Gemini API (`@google/generative-ai` SDK) executed directly within the React Native client.
- **Styling:** React Native StyleSheet (adhering to `DESIGN.md` tokens)

## 3. Database Schema (SQLite)

_(Same as previous Phase 1 setup)_

- `Users`: id, phone_number, password, role ('CUSTOMER' or 'VENDOR'), name.
- `Providers`: id, user_id, service_category, location_area, rating, status.
- `Bookings`: id, customer_id, provider_id, service_time, status.

## 4. The Agentic Pipeline (Gemini Integration)

Instead of a backend, the React Native app acts as the "Orchestrator" using the Gemini SDK:

1. **Agent 1 (The Intake Router):** The user sends a chat message. The app calls Gemini with a strict System Instruction to extract the intent and return a JSON object containing `{ service_category, location, time_slot }`.
2. **Agent 2 (The Matchmaker):** The app takes Gemini's JSON and executes a local SQL query on `expo-sqlite`.
   - _Fallback:_ If SQLite returns 0 results, the app calls Gemini again to dynamically expand the provider network, finds the best match in the extended vicinity, and proceeds.
3. **Agent 3 (The Coordinator):** When the user clicks "Book", the app writes to the `Bookings` table and updates the UI state to show simulated notifications.

## 5. Phased Implementation Plan

- **Phase 1: Foundation (DB & Auth)** - _(COMPLETED)_
- **Phase 2: Core UI & Gemini Intake Integration**
  - Build the main chat interface (`ChatScreen`).
  - Install `@google/generative-ai`.
  - Implement the "Intake Agent" to parse user chat into structured JSON using Gemini.
- **Phase 3: Matchmaking & Reasoning Console**
  - Build the `ReasoningConsole` UI to show the step-by-step logs.
  - Connect the Gemini JSON output to the SQLite database to fetch/generate Provider cards.
- **Phase 4: Vendor Dashboard & Polish**
  - Build the VENDOR view for incoming bookings.