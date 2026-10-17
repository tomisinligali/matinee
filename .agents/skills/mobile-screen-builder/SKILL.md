---
name: mobile-screen-builder
description: >-
  Use this skill when developing or modifying React Native mobile screens, components, or interactions in Matinee.
  Trigger: Creating or modifying a mobile screen, component, or user interaction.
  Load when: Building movie discovery, showtime browsing, seat selection, checkout, tickets, or operator screens.
  Teaches how to connect screens to the backend and handle loading, empty, error, success, stale-data, and accessibility states without inventing product behavior.
---

# Mobile Screen Builder

This skill defines the development guidelines and implementation sequence for Matinee's React Native (Expo) mobile screens and components.

UI implementations must adhere strictly to `design-system.md`, `coding-standard.md`, and the approved user flows in `PRD.md`. The mobile client is a presentation interface; it is never authoritative for prices, inventory, or payment verification.

---

## Architecture & Presentation Layering

```
[ React Native / Expo UI Screen ]
  ├── Design System Tokens (Semantic Colors, Typography, Spacing, Radii)
  ├── State Management (Loading, Empty, Error, Success, Refreshing)
  └── Accessibility & Touch Handlers (Min 44x44px touch targets)
         │
         ▼
[ API Client / Service Layer ] (Thin, strongly typed HTTP client)
         │
         ▼
[ Matinee Backend API ] (Authoritative Server)
```

---

## Design System & Token Compliance

All screens and components must use the semantic tokens generated from `design-tokens.tokens.json`:
- **Semantic Color Roles**:
  - Surfaces: `surface`, `on-surface`, `surface-container`, `surface-container-high`, `surface-container-low`
  - Actions: `primary`, `on-primary`, `primary-container`, `on-primary-container`
  - States: `error`, `on-error`, `warning`, `on-warning`, `success`, `on-success`, `info`, `on-info`
  - Do NOT hardcode arbitrary hex codes or use raw foundation primitives directly in components.
- **Typography**:
  - `Lora` for display headings.
  - `DM Sans` for headlines, titles, body copy, and labels.
- **Spacing & Elevation**: Use defined spacing scales (e.g. 4, 8, 12, 16, 24, 32px) and elevation tokens.

---

## The 6 Mandatory Screen States

Every mobile screen must explicitly account for and render all six operational states:

| State | Implementation Requirement |
|---|---|
| **1. Loading State** | Skeleton loaders mirroring final layout or branded activity spinners. Never leave a blank screen. |
| **2. Empty State** | Helpful illustration or icon, explanatory text, and actionable guidance (e.g. "No showtimes for this date. Try another date"). |
| **3. Error State** | Clear, non-technical explanation with a retry button. Differentiate offline/network disconnection from server errors. |
| **4. Success State** | High-fidelity, smooth interactive UI with micro-animations and proper hierarchy. |
| **5. Stale-Data / Refreshing** | Pull-to-refresh (`RefreshControl`), background revalidation, or banner warnings if offline. |
| **6. Accessibility** | `accessibilityLabel`, `accessibilityRole`, minimum 44×44 pt touch targets, dynamic font scaling support, high contrast. |

---

## Critical Screen Workflows

### 1. Movie Discovery (`/discovery`)
- Displays "Now Showing" and "Coming Soon" movies with TMDB posters and metadata.
- Allows filtering by cinema location and date.
- Shows skeleton posters during initial data fetch.

### 2. Showtime Browsing (`/movies/:id/showtimes`)
- Displays cinema list, screening format badges (e.g. `2D`, `3D`, `IMAX`, `VIP`), and showtime chips.
- Selecting a showtime checks server status before navigating to seat selection.

### 3. Interactive Seat Selection (`/showtimes/:id/seats`)
- **Advisory Rendering**: Visually renders the screen and configured seats (Available, Selected, Reserved/Held, Disabled).
- **Seat Selection Limits**: Enforce maximum seat selection limit (e.g. 6 seats per transaction).
- **Hold Countdown Timer**:
  - Once the user taps "Reserve Seats", the server grants the hold and returns `expiresAt`.
  - Render an active countdown timer.
  - When the countdown reaches `00:00`, freeze checkout, inform the user with a modal ("Your reservation has expired"), and release local selection.

### 4. Checkout & Payment Flow (`/checkout`)
- **Order Breakdown**: Display purchase summary, seat list, ticket price, taxes, and total formatted from integer minor units to local currency (e.g. `₦12,500.00`).
- **Initiating Payment**: Request backend for Flutterwave checkout session / URL with a unique idempotency key.
- **WebView / App Backgrounding**:
  - When passing control to Flutterwave checkout, listen for deep links or webview navigation callbacks.
  - On app foregrounding or navigation back: **Never assume success from the redirect**. Navigate to the `/order-status/:id` screen to let the backend poll/verify the authoritative transaction status.

### 5. Ticket & Booking Status Screen (`/tickets/:id`)
- Displays authoritative status (`CONFIRMED`, `PENDING_PAYMENT`, `CANCELLED`).
- Renders unique QR code / booking reference for cinema gate scanning.
- Provides cinema details, directions, and showtime schedule.
- Ticket remains accessible offline via secure local caching once confirmed.

---

## Prohibited Shortcuts & Anti-Patterns
- **NO Client-Authoritative Pricing**: Never calculate or display total price without fetching or validating with the server.
- **NO Premature Success**: Never display a "Payment Successful" or confirmed ticket screen solely because a WebView URL changed. Always verify with the backend.
- **NO Ignoring Android Back Button**: Ensure modal, hold, and checkout flows properly intercept Android hardware back button presses to prevent orphan holds.
- **NO Raw Primitives**: Never use raw hex colors or unapproved fonts.
