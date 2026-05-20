# Karigar - Agentic AI Orchestrator

Karigar is an intelligent, agent-driven platform designed to formalize Pakistan's informal economy. It transforms unstructured, natural language requests (Urdu, Roman Urdu, English) into structured, optimized service bookings for plumbers, electricians, beauticians, and more.

## Problem Statement
The informal economy relies heavily on WhatsApp, word-of-mouth, and phone calls, leading to inefficient matching, missed opportunities, and zero automation. Customers struggle to find reliable, available artisans in real-time.

## Solution Overview
Karigar utilizes a multi-step agentic workflow orchestrated via Google Generative AI to understand intent, discover local providers, simulate booking handshakes, and manage the complete lifecycle of a service request.

### Core Features
1. **Multilingual Intent Parsing**: Natively understands Urdu, Roman Urdu, and English.
2. **Context-Aware Scheduling**: Dynamically translates relative time (e.g., "aj raat", "kal subah") into concrete, actionable time slots based on the user's real-time clock.
3. **Agentic Pipeline**: Utilizes distinct logical agents (Intake Agent, Matchmaker Engine, Synthesis/Generator Agent) to process the request end-to-end.
4. **Transparent Reasoning**: A built-in Agentic Console allows users (and judges) to see the exact execution logs, matching logic, and state changes happening under the hood.
5. **Dual-Sided Simulation**: Features both a Customer Interface (for chat-based booking) and a Vendor Dashboard (for real-time job management and completion).

---

## Agentic Architecture & Workflow

The system relies on a sequence of orchestrated agent logic loops:

1. **[Agentic Gateway] Intent Extraction**: 
   - Uses `gemini-3.1-flash-lite` to extract service type, location, city, and time. 
   - Handles gracefully rejecting out-of-scope requests (e.g., formal professions like Doctors/Lawyers).
2. **[Matchmaker Engine] Discovery & Ranking**:
   - Queries the local dataset to find exact location and category matches.
   - Computes proximity distances and ranks providers based on distance and rating.
   - If local matches are insufficient, initiates a Proximity Fallback Search to locate artisans in neighboring sectors.
3. **[Network Expansion] Extended Availability**:
   - If local matches are insufficient, the Matchmaker Engine queries the broader regional network to secure an available, culturally appropriate provider and syncs them into the active job queue.
4. **[Booking Core] Dispatch & Routing**:
   - Executes the booking by locking the schedule in the local SQLite database.
   - Dispatches internal notifications to the provider.
   - Schedules automated follow-up reminders.

---

## Technical Stack & Implementation

- **Framework**: React Native (Expo)
- **AI/LLM**: `@google/generative-ai` (Gemini Flash Lite)
- **State Management**: Zustand
- **Local Database**: SQLite (expo-sqlite) for Mock Data Simulation
- **Styling**: Custom Design System with Platform-Specific Safe Areas and Vector Icons

### APIs and Tools Used
- **Gemini SDK**: Core brain for natural language parsing and decision routing.
- **Expo Notifications**: For routing real-time push alerts to providers and customers.
- **Expo SQLite**: Handles the local cache and routing table for the central matching server.

### Operating Environment
- **Provider Network**: The system utilizes a seeded SQLite database mapping verified artisans across Islamabad for rapid proximity routing.
- **Dispatch Execution**: Payment routing and SMS dispatch logs are recorded in the application state to ensure transaction integrity.
- **Location Inference**: Assumes Islamabad as the default operational city unless explicitly specified otherwise by the user.

---

## Setup Instructions

1. **Clone the repository**
2. **Install Dependencies**: `npm install`
3. **Environment Setup**: Create a `.env` file at the root and add your Gemini API Key:
   `EXPO_PUBLIC_GEMINI_API_KEY=your_key_here`
4. **Run Application**: 
   - `npm run ios` or `npm run android`
   - *Note: On first run, the SQLite database will automatically seed. If you experience stale data, clear the app cache on the simulator/device to re-trigger the DB seed.*