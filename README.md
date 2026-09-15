# OnTrack — Minimalist, Privacy-First Running & Route Planning Web App

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Portfolio](https://img.shields.io/badge/Developer-pangestudev.web.id-f97316?style=for-the-badge&logo=safari&logoColor=white)](https://pangestudev.web.id)

> **OnTrack** is a high-performance, dark-mode athletic running tracker and road-route planner built with **React 19** and **Tailwind CSS**. Designed with an uncompromising focus on **user privacy**, it operates **100% client-side** with zero backend databases, zero telemetry, and zero paywalled API keys.

---

## 🌟 Why OnTrack? (Problem & Solution)

Most modern running trackers (Strava, Nike Run Club, etc.) require mandatory accounts, sync personal location telemetry to remote servers, and gate essential route-planning features behind paid subscriptions.

**OnTrack solves this by providing:**
1. **Instant Road Route Planning**: Precise pedestrian road-snapping using OSRM algorithms directly in the browser.
2. **Live GPS Tracking with Screen Wake Lock**: Continuous outdoor tracking that prevents the phone display from sleeping while running.
3. **Instagram-Ready Social Export**: Strava-style session cards in **4:5 Post** and **9:16 Story** ratios, rendered completely on-device without uploading your photos or stats to any server.
4. **Zero-Tracking Privacy**: 100% of user data remains strictly in browser memory.

---

## 🚀 Key Engineering & Architectural Highlights

### 1. 🛡️ 100% Client-Side Privacy Architecture
- **Zero Server Footprint**: No backend, no cloud database, and no third-party tracking scripts.
- **Local Data Processing**: GPS coordinates, polyline routes, time series, and custom background images are processed strictly in the user's browser memory (`Blob`, `FileReader`, and `localStorage`).

### 2. ⚡ Modern Web Platform APIs & Screen-Off Background Keep-Alive
- **Silent Audio Keep-Alive Engine**: Overcomes mobile OS thread suspension when the phone screen is turned off/locked. Plays a microscopic looping silent audio track coupled with the **Web MediaSession API** (`navigator.mediaSession`), maintaining active background execution for continuous GPS tracking and lockscreen session status.
- **Screen Wake Lock API (`navigator.wakeLock`)**: Automatically acquires an active screen lock during Free Run mode to keep smartphones awake without needing native wrappers. Includes automatic recovery on `visibilitychange`.
- **Geolocation API (`navigator.geolocation.watchPosition`)**: High-accuracy real-time positioning with custom noise filtering.
- **Web Share API (`navigator.share`)**: Native OS share sheet trigger for direct exports to Instagram, WhatsApp, or Twitter, with automated PNG file fallback for unsupported browsers.

### 3. ⏱️ Drift-Free Timestamp Delta Stopwatch Architecture
- Standard `setInterval` counters drift or freeze when mobile browsers enter low-power background mode.
- Built a high-precision **Timestamp Delta Engine** (`Date.now() - startTime`) with instantaneous millisecond re-synchronization on `visibilitychange` and window `focus`, ensuring stopwatch time, average pace, and calories burned never lose or skip a single second.

### 4. 📐 Mathematical Haversine Step Filtering & GPS Jitter Suppression
- Outdoor GPS often experiences micro-drifts (*jitter*) when stationary.
- Implemented a pure mathematical **Haversine formula** calculator that evaluates distance between successive coordinate fixes and discards noise thresholds ($< 2.5\text{ m}$), guaranteeing accurate distance and pace metrics.

### 5. 🗺️ Keyless, High-Performance Map Infrastructure
- Replaced restricted, watermarked tile providers (e.g., CartoDB API keys) with **Esri World Dark Gray Canvas MapServer**.
- Delivers a distraction-free, retina-ready athletic aesthetic with **zero API rate limits, zero watermarks, and zero cost overhead**.

### 6. 🎨 Algorithmic Route Silhouette & Dynamic Card Rendering
- **SVG Normalization Algorithm**: Automatically computes the dynamic bounding box (`minX, maxX, minY, maxY`) of any running path, scales it to fit a $100 \times 100$ coordinate matrix with proportional padding, and outputs an SVG path string for the route silhouette.
- **Client-Side DOM Rasterization (`html-to-image`)**: Synthesizes high-resolution PNG cards with clean $90^\circ$ sharp corners, customizable dark dimming overlays, and customized typography.

### 7. 📱 Progressive Web App (PWA) & Offline Reliability
- **Homescreen Installability**: Configured with `manifest.json`, high-res athletic SVG vector icons, theme color meta tags, and standalone display mode for a native mobile experience.
- **Service Worker (`sw.js`)**: Lightweight runtime caching for core static assets, allowing runners to launch the app instantly without network friction.

### 8. 🗣️ Native Web Speech Audio Voice Cues
- **Pace Announcements Every KM**: Utilizes the native browser **Web Speech API (`speechSynthesis`)** to automatically announce kilometer milestones (e.g., *"Kilometer 3. Pace 5 menit 12 detik"* / *"Kilometer 3. Pace 5 minutes 12 seconds"*).
- **Zero Audio Overhead**: 100% synthesized on-device without external media files or network latency, with quick mute/unmute control directly from the bottom bar.

### 9. 📊 Kilometer Splits & Social Card Export Integration
- **Real-Time Lap Splits Table**: Logs granular lap times and calculates per-kilometer pace ($km/min$) throughout outdoor runs.
- **Embedded Splits on Exported Card**: Splits are integrated directly onto the Strava-style 4:5 and 9:16 Instagram cards with an on/off toggle, allowing runners to showcase their pacing strategy and negative splits alongside their route silhouette.

### 10. 🌐 Instant Reactive Localization (ID / EN)
- Complete bilingual system (Bahasa Indonesia & English) managed through a centralized translation dictionary.
- Fully synchronized: switches all metric units, voice cue languages, modal labels, date/time formatting (`Intl.DateTimeFormat`), session presets, and exported social card typography with zero cascading re-renders.

---

## 📊 Feature Comparison

| Feature | Standard Trackers (Strava, NRC) | OnTrack |
| :--- | :---: | :---: |
| **Account Required** | Yes (Mandatory) | **No (Zero Sign-up)** |
| **Data Privacy** | Cloud Servers / Trackers | **100% Local Browser Memory** |
| **PWA Installable** | Heavy App Store Download | **Instant Web Install (< 500 KB)** |
| **Audio Voice Cues** | Proprietary Audio Packs | **Native Web Speech API (ID & EN)** |
| **KM Splits on Card** | Restricted / Subscription | **Included on Exported Social Card** |
| **Road Route Builder** | Paid Subscription | **Free & Open Source** |
| **Screen-Off Background Tracking** | Native App Service | **Audio Keep-Alive + MediaSession** |
| **Stopwatch Accuracy** | Native OS Timer | **Drift-Free Timestamp Delta Math** |
| **Screen Wake Lock** | Native App Only | **Native Web API (In-Browser)** |
| **Social Card Export** | Fixed Watermarks | **Custom 4:5 & 9:16 Aesthetic Cards** |
| **API Keys Needed** | High Cost | **Keyless Free Architecture** |

---

## 🛠️ Tech Stack & Dependencies

- **Core Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Custom athletic dark palette, matte surfaces, zero neon bloat)
- **Map & Spatial Routing**: [Leaflet.js](https://leafletjs.com/), [OSRM (Open Source Routing Machine)](http://project-osrm.org/), [Esri ArcGIS Canvas](https://server.arcgisonline.com)
- **PWA & Device APIs**: Service Worker, Screen Wake Lock, Web Speech API, MediaSession API, Web Share API
- **Icons**: [Lucide React](https://lucide.dev/)
- **Image Generation**: [html-to-image](https://github.com/bubkoo/html-to-image)
- **Code Standards**: ESLint Flat Config (`react-hooks` React 19 compiler purity standards)

---

## 📂 Project Architecture

```
jog-route/
├── public/
│   ├── manifest.json            # PWA Web App Manifest
│   ├── ontrack-icon.svg         # Athletic vector logo and app icon
│   └── sw.js                    # Service Worker asset caching
├── src/
│   ├── components/
│   │   ├── ControlsBar.jsx      # Start/Pause, Voice Cue toggle, Undo, Reset, Share
│   │   ├── InfoModal.jsx        # User Guide, 100% Privacy Policy & Developer Bio
│   │   ├── MapRoute.jsx         # Leaflet container, Esri dark tiles & live GPS layer
│   │   ├── MetricCards.jsx      # Realtime Distance, Pace, Time & Calorie metrics
│   │   ├── Navbar.jsx           # Mode switcher (Builder / Free Run) & Language Toggle
│   │   └── ShareModal.jsx       # 4:5 & 9:16 Instagram card with route & KM Splits table
│   ├── utils/
│   │   ├── audioCues.js         # Web Speech API synthesized pace announcement engine
│   │   ├── backgroundAudio.js   # Silent audio loop keep-alive & MediaSession worker
│   │   ├── formatters.js        # Distance, Pace, Time & Calorie calculation helpers
│   │   ├── osrm.js              # OSRM pedestrian routing & Haversine formula
│   │   └── translations.js      # Centralized ID / EN localization dictionary
│   ├── App.jsx                  # State machine & synchronization coordinator
│   ├── index.css                # Tailwind CSS design system tokens
│   └── main.jsx                 # Entry point & PWA service worker registration
├── eslint.config.js             # Strict linting rules
├── package.json
├── vite.config.js
└── README.md
```

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm / yarn

### Installation & Development

```bash
# 1. Clone repository
git clone https://github.com/timurlauttt/joging-route.git
cd joging-route

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build & Validation

```bash
# Lint code against strict React 19 rules
npm run lint

# Build optimized production bundle
npm run build
```

---

## 👨‍💻 Developer & Author

Crafted with passion for clean code, web standards, and runner ergonomics by **pangestudev**.

- **Website / Portfolio**: [pangestudev.web.id](https://pangestudev.web.id)
- **GitHub**: [@timurlauttt](https://github.com/timurlauttt)
- **Specialization**: Frontend Engineering, Clean Architecture, React Performance & Web Platform APIs.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal, educational, and commercial exploration.
