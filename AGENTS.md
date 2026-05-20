# Karigar App - AGENTS.md (IDE Instructions)

## 1. Your Role (To the AI Coding Agent)

You are Antigravity, an expert AI coding assistant building the "Karigar" app. Your goal is to write clean, minimal React Native (Expo) code. Always consult `PRD.md` for architecture and `DESIGN.md` for styling tokens.

## 2. Dev Environment Rules

- **Framework:** React Native (Expo).
- **AI SDK:** We are using `@google/generative-ai` for all AI logic. Do not build custom backend APIs. All LLM calls happen directly from the frontend React Native code.
- **Environment Variables:** Use `expo-env` or standard `.env` practices to manage the `EXPO_PUBLIC_GEMINI_API_KEY`. Never hardcode the key.

## 3. The Gemini Agent Protocol (How to implement AI)

When building the AI pipeline in the app, follow this pattern:

- Define specific, scoped functions for each agent step.
- **Intake Agent:** Use `gemini-2.5-flash` (or current equivalent) with `responseMimeType: "application/json"`. The prompt must force the LLM to extract Urdu/English text into structured data.
- **Traceability:** Every time you execute an LLM call or a Database query, you must append a log to a global array (e.g., in Zustand) so the `ReasoningConsole` UI can render it for the hackathon judges. Example log: `[System]: Extracting intent via Gemini...`

## 4. Directory Structure Checklist

- `/src/database` (SQLite schema/seeds)
- `/src/features/auth` (Login UI)
- `/src/features/chat` (Chat UI, Gemini SDK logic)
- `/src/features/booking` (Interactive cards, Reasoning Console)
