# Karigar: Agentic AI for the Informal Economy

Karigar is an Agentic AI system designed to automate the end-to-end lifecycle of informal service requests in Pakistan. By replacing fragmented WhatsApp messages and phone calls with an intelligent orchestration pipeline, Karigar connects customers with local professionals such as plumbers, electricians, AC technicians, and tutors.

## Project Solution
This prototype demonstrates a closed-loop economy driven entirely by a multi-agent reasoning pipeline. It handles intent extraction in Roman Urdu and English, geographic matchmaking, simulated bookings, and automated follow-ups.

### Key Features
1. **Natural Language Intake:** Users can submit requests in natural language (e.g., "Mujhe kal subah G-13 mein AC technician chahiye").
2. **Dynamic Matchmaking:** Providers are ranked based on simulated proximity (distance_km), availability, and ratings.
3. **Traceable Agentic UI:** Users can expand collapsed bubbles to view the exact reasoning logs of the internal agents.
4. **Action and Follow-Up Automation:** Complete simulation of booking records, dispatch updates, and status-completion loops.
5. **Dual-Role Economy:** A Customer chat interface coupled with a dedicated Vendor Dashboard for managing statuses.

---

## System Architecture and Agentic Workflow

The application relies on a structured reasoning pipeline powered by the Gemini API, orchestrated into distinct agents that handle specific lifecycle phases.

### 1. The Intake Agent (Planning)
- **Role:** Parses unstructured, multilingual input using strict JSON schemas.
- **Logic:** Extracts the service category, city, area, and time slot. If context is missing, it performs geographic inference (e.g., mapping a specific neighborhood to its city). If it detects a formal profession (e.g., Doctor, Software Engineer), it triggers a scoped refusal to maintain informal economy guardrails.

### 2. The Matchmaker Agent (Decision)
- **Role:** Interfaces the LLM output with the local database.
- **Logic:** Executes SQL queries across the Providers and Users tables. It calculates proximity, evaluates ratings, and ranks the top 3 viable matching providers.

### 3. The Generator Agent (Fallback)
- **Role:** Synthesizes mock provider profiles.
- **Logic:** If no local SQLite match is found, this agent generates a realistic provider profile and seeds the database dynamically, ensuring the user always receives a viable recommendation.

### 4. Action and Follow-Up (Execution)
- **Action:** Clicking "Book Now" executes local SQLite transactions (INSERT INTO Bookings).
- **Follow-Up Automation:** Staggered asynchronous loops simulate dispatch updates ("Provider is on their way"), mock SMS receipts, and status updates (Vendors marking jobs as COMPLETED triggers customer feedback requests).

---

## Technical Stack and Tools Used

- **Frontend:** React Native (Expo)
- **Local Database:** expo-sqlite (Managing the provider dataset and tracking booking states locally).
- **State Management:** Zustand (Managing user sessions and global notification states).
- **AI Integration:** @google/generative-ai (Gemini models used for schema-enforced intent extraction).

---

## How Google Antigravity is Used

Google Antigravity served as the central autonomous orchestration platform for building this system. Antigravity functioned as the primary development and architectural partner to:
- **Orchestrate Agent Workflows:** Designing the prompt engineering state-machines that allow the Intake and Matchmaker agents to pass data contextually.
- **Manage Multi-Step Reasoning:** Architecting the collapsible log interface and local trace-state logic to expose the internal planning loop directly to the user.
- **Execute Actions:** Writing secure SQLite schema migrations and transaction loops necessary for the simulation requirements.

---

## Assumptions and Limitations

1. **Mock Database:** Due to hackathon scope, provider discovery is simulated via a seeded local SQLite database rather than a live Google Maps/Places API integration.
2. **Simulated Notifications:** SMS receipts, automated reminders, and push notifications are simulated via timed in-app UI Toasts and Chat Bubbles rather than external Twilio/Firebase integrations.
3. **Proximity:** Proximity calculations are currently based on area overlap to demonstrate ranking logic rather than using strict GPS coordinate delta calculations.
