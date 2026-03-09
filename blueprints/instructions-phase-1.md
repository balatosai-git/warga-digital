# PHASE 1 — MOBILE-FIRST ONBOARDING & REGISTRATION  
**Platform:** Warga Digital  
**Tenant Context:** Sawangan Regensi RT 03  

---

## 1. Core UX Intent (Non-Negotiable)

This is **not a website pretending to be mobile**.  
This is a **mobile-app-like experience delivered via web**.

### Mandatory Characteristics
- Full viewport height (`100dvh`)
- Touch-first interaction model
- App-style page transitions
- No dependency on browser UI
- Persistent local state (onboarding, auth)

---

## 2. Tech Stack (Strict Recommendation)

### Framework
- Next.js (App Router)
- TypeScript

### Rendering Strategy
- Client-first rendering
- SSR deferred (SEO later phase)

### UI System
- **NextUI** (primary component library)
- Custom CSS variables for theme tokens

### Motion
- Framer Motion (required for swipe onboarding)

### State Management
- Zustand
- Zustand persist middleware (localStorage)

---

## 3. App Shell Architecture

App directory structure:

    /app
     ├─ layout.tsx            # Mobile app shell
     ├─ page.tsx              # Entry gate (onboarding check)
     ├─ onboarding/
     │   └─ page.tsx          # Swipe-based welcome
     ├─ auth/
     │   ├─ register/
     │   │   └─ page.tsx
     │   └─ otp/
     │       └─ page.tsx
     └─ (protected)/
         └─ landing/          # NOT implemented in this phase

---

## 4. Global App Shell (Mobile Illusion)

### Layout Rules
- Maximum width: 430px
- Centered on desktop, edge-to-edge on mobile
- Full height (`100dvh`)
- No body scroll
- Safe-area padding enabled

### Conceptual Layout Structure
- Outer wrapper centers the app
- Inner container represents the “device”
- All screens live inside this container

---

## 5. First-Time User Gate (Critical)

### Behavior
- If onboarding is not completed, **all routes are blocked**
- No partial access
- No skip option

### State Flag
- onboardingCompleted = true / false

### Persistence
- Stored in localStorage
- Later synced with backend

---

## 6. Onboarding — Full-Page Blocking Welcome

### General Rules
- Full-screen takeover
- No close button
- Horizontal swipe only
- Pagination dots required

Built using:
- NextUI Card
- NextUI Button
- Framer Motion for swipe & transitions

---

## Screen 1 — Welcome (MANDATORY COPY)

### Text (Exact, Do Not Change)

Title:
Selamat datang di warga digital  
Sawangan Regensi RT 03

### Layout
- Illustration occupies ~50% of vertical space
- Illustration centered
- Rounded container
- Soft background accents
- Text and dots placed in bottom section

### Interaction
- Swipe to continue
- No button
- No skip

---

## Screen 2 — Community Value

### Copy

Title:
Dari Warga, Untuk Warga

Body:
Akses informasi, layanan, dan komunikasi warga dalam satu platform resmi lingkungan Anda.

### Visual Direction
- Community / housing illustration
- Friendly, inclusive tone
- Calm color palette

---

## Screen 3 — Trust & Legitimacy

### Copy

Title:
Aman, Resmi, dan Terverifikasi

Body:
Setiap akun terhubung dengan identitas dan tempat tinggal. Tidak anonim. Tidak palsu.

### CTA
- Primary NextUI Button: “Mulai”
- On press:
  - Set onboardingCompleted = true
  - Navigate to /auth/register

---

## 7. Swipe Mechanics (UX Rules)

- Horizontal swipe gesture only
- Snap points for each screen
- Exactly 3 pagination dots
- Active dot animated
- Vertical scrolling disabled

---

## 8. Registration Wizard (Phase Scope)

### Step 1 — Identity Input

Fields:
- Full Name
- WhatsApp Number

Rules:
- WhatsApp is the primary identifier
- Basic format validation only
- Email not required

UI Guidelines:
- NextUI Input components
- Large touch-friendly spacing
- Sticky bottom “Lanjutkan” button

---

### Step 2 — OTP Verification

Behavior:
- 6-digit OTP
- Auto-focus and auto-advance
- Countdown timer for resend

State Handling:
- Loading state blocks interaction
- Errors shown inline (no modal)

---

## 9. Navigation Rules

- Browser back disabled during onboarding
- Mobile gesture back disabled
- Navigation controlled strictly by app state

---

## 10. Visual Tone (Inspired by Example Image)

Apply consistently:
- Rounded cards (large radius)
- Soft elevation / shadow
- Strong primary CTA color
- Illustration-led screens
- Minimal but confident typography

---

## 11. Explicit Exclusions (This Phase)

Not implemented in this phase:
- Landing page content
- Tenant switching
- House selection
- Authority or role UI
- Verification workflows

These start **after onboarding + registration success**.

---

## 12. Phase Completion Criteria

This phase is considered complete when:
- Onboarding is fully blocking and unskippable
- Experience feels like a native mobile app
- Registration + OTP flow works end-to-end
- Returning users bypass onboarding automatically
