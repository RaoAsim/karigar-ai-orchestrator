---
name: Karigar
version: "1.0"
description: Clean, utilitarian design system focused on trust and clear agentic reasoning visibility.
colors:
  primary: "#1877F2"
  secondary: "#65676B"
  tertiary: "#E7F3FF"
  neutral: "#FFFFFF"
  surface-background: "#F0F2F5"
  success: "#31A24C"
  warning: "#F2A100"
  ink: "#050505"
typography:
  h1:
    fontFamily: System
    fontSize: 1.5rem
    fontWeight: 700
  body-md:
    fontFamily: System
    fontSize: 1rem
    fontWeight: 400
  label-sm:
    fontFamily: System
    fontSize: 0.85rem
    fontWeight: 500
rounded:
  sm: 6px
  md: 12px
  lg: 20px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  chat-bubble-user:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  chat-bubble-system:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  reasoning-console:
    backgroundColor: "{colors.surface-background}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
---

## Overview

The UI must evoke trust, speed, and transparency. It avoids the "hacker" aesthetic entirely, opting for a clean, consumer-ready service application feel. The defining feature is the transparent visibility of the AI's internal reasoning.

## Colors

The palette relies on high-contrast, accessible tones common in trusted utility apps.

- **Primary (#1877F2):** "Trust Blue" used for primary actions, user chat bubbles, and confirmations.
- **Secondary (#65676B):** Used for timestamps, metadata, and the AI reasoning console logs.
- **Surface Background (#F0F2F5):** A slight off-white to allow pure white (`#FFFFFF`) components, like provider profile cards, to pop visually without heavy drop shadows.

## Typography

Strictly utilize the native system fonts (San Francisco on iOS, Roboto on Android) to ensure the app feels native and performant without requiring custom font loading.

- **h1:** Used for the main header (e.g., "Find a Service").
- **body-md:** The core chat text and provider descriptions.
- **label-sm:** Used heavily in the reasoning console to display tool execution logs.

## Layout & Spacing

- Rely heavily on `{spacing.md}` (16px) for screen margins and component gaps.
- The chat interface should take up the primary vertical space, with a floating input field pinned to the bottom.

## Components

**Reasoning Console:** This is a critical custom component. It should look distinct from normal chat bubbles. Use the `{colors.surface-background}` to create a muted, inset terminal feel. Text inside must use the `label-sm` typography to distinguish it from conversational output.
