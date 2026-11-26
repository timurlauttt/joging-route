# OnTrack — Minimalist, Privacy-First Running & Cycling Route Planner

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Portfolio](https://img.shields.io/badge/Developer-pangestudev.web.id-f97316?style=for-the-badge&logo=safari&logoColor=white)](https://pangestudev.web.id)

> **OnTrack** is a high-performance athletic **running & cycling** tracker and road-route planner built with **React 19** and **Tailwind CSS**. Designed with an uncompromising focus on **user privacy**, it operates **100% client-side** with zero backend databases, zero telemetry, and zero paywalled API keys.

---

## 🌟 Why OnTrack? (Problem & Solution)

Most modern running trackers (Strava, Nike Run Club, etc.) require mandatory accounts, sync personal location telemetry to remote servers, and gate essential route-planning features behind paid subscriptions.

**OnTrack solves this by providing:**

1. **Instant Road Route Planning**: Accurate road-snapping with real **pedestrian** and **bicycle** profiles directly in the browser.
2. **Live GPS Tracking with Screen Wake Lock**: Continuous outdoor tracking that prevents the phone display from sleeping while running or riding.
3. **Google-Maps-Style Keyless Basemaps**: Esri World Street Map (Google-Maps look-alike), OpenStreetMap, CyclOSM (cycling-optimised), OpenTopoMap terrain and Esri satellite imagery — free, watermark-free, no API keys.
4. **Nearby Strategic Places**: One-tap discovery of hotels, city squares (_alun-alun_), transit hubs, food, shopping, healthcare, sport venues and attractions around the viewport.
5. **Instagram-Ready Social Export**: Strava-style session cards in **4:5 Post** and **9:16 Story** ratios, rendered completely on-device without uploading your photos or stats to any server.
6. **Zero-Tracking Privacy**: 100% of user data remains strictly in browser memory.
7. **Instant Auto-Route by Distance**: Enter a target distance (3–50 km presets or a custom value) and OnTrack generates a road-snapped **loop route** from your start point automatically.

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

- Outdoor GPS often experiences micro-drifts (_jitter_) when stationary.
- Implemented a pure mathematical **Haversine formula** calculator that evaluates distance between successive coordinate fixes and discards noise thresholds ($< 2.5\text{ m}$), guaranteeing accurate distance and pace metrics.

### 5. 🗺️ Keyless, Google-Maps-Style Map Infrastructure

- **Multi-provider basemap catalogue** with one-tap switching: **Esri World Street Map** (the closest keyless look-alike to Google Maps), **OpenStreetMap** standard, **CyclOSM** (cycling-optimised, auto-selected for rides), **OpenTopoMap** terrain, and Esri satellite, light & dark imagery. Every provider is keyless (CARTO's tiles now require an API key, so they are deliberately avoided).
- **Strategic Places (POI) engine**: Debounced, viewport-driven discovery of hotels, city squares (_alun-alun_), transit, food, shopping, healthcare, sport and attractions via the keyless **Overpass API**, rendered as category-coloured emoji markers with popups and per-category filters.
- Delivers a distraction-free, retina-ready athletic aesthetic with **zero API rate limits, zero watermarks, and zero cost overhead**.

### 6. 🎨 Algorithmic Route Silhouette & Dynamic Card Rendering

- **SVG Normalization Algorithm**: Automatically computes the dynamic bounding box (`minX, maxX, minY, maxY`) of any running path, scales it to fit a $100 \times 100$ coordinate matrix with proportional padding, and outputs an SVG path string for the route silhouette.
- **Client-Side DOM Rasterization (`html-to-image`)**: Synthesizes high-resolution PNG cards with clean $90^\circ$ sharp corners, customizable dark dimming overlays, and customized typography.

### 7. 📱 Progressive Web App (PWA) & Offline Reliability

- **Homescreen Installability**: Configured with `manifest.json`, high-res athletic SVG vector icons, theme color meta tags, and standalone display mode for a native mobile experience.
- **Service Worker (`sw.js`)**: Lightweight runtime caching for core static assets, allowing runners to launch the app instantly without network friction.

### 8. 🗣️ Native Web Speech Audio Voice Cues

- **Per-KM Announcements**: Utilizes the native browser **Web Speech API (`speechSynthesis`)** to automatically announce kilometer milestones. Runs announce **pace** (e.g., _"Kilometer 3. Pace 5 menit 12 detik"_) while rides announce **average speed** (e.g., _"Kilometer 3. Kecepatan rata-rata 24,6 kilometer per jam"_).
- **Zero Audio Overhead**: 100% synthesized on-device without external media files or network latency, with quick mute/unmute control directly from the bottom bar.

### 9. 📊 Kilometer Splits & Social Card Export Integration

- **Real-Time Lap Splits Table**: Logs granular lap times and calculates per-kilometer **pace** for runs and per-kilometer **speed** for rides throughout outdoor sessions.
- **Embedded Splits on Exported Card**: Splits are integrated directly onto the Strava-style 4:5 and 9:16 Instagram cards with an on/off toggle, allowing athletes to showcase their pacing strategy and negative splits alongside their route silhouette.

### 10. 🌐 Instant Reactive Localization (ID / EN)

- Complete bilingual system (Bahasa Indonesia & English) managed through a centralized translation dictionary.
- Fully synchronized: switches all metric units, voice cue languages, modal labels, date/time formatting (`Intl.DateTimeFormat`), session presets, and exported social card typography with zero cascading re-renders.

### 11. 🚴 Dual-Activity Engine (Run & Ride)

- A single **Run / Ride** switch (persisted in `localStorage`) re-wires the whole app Strava-style: it swaps the routing profile (Valhalla `pedestrian` ↔ `bicycle`), the metric card (average **pace** ↔ average **speed** in km/h), the calorie model (62 ↔ 30 kcal/km), the live GPS track and route colours, the voice-cue language, the share-card labels, and auto-selects the **CyclOSM** basemap for rides.
- **Elevation profile (rides)**: queries the keyless **Open-Meteo Elevation API** (Copernicus DEM) for the planned route and draws a live climb profile on the map with total ascent/descent, an **Elevation Gain** metric card, and an **ELEVATION** stat on the exported share card.

### 12. 🏨 Nearby Strategic Places (POI)

- **Category-coloured markers** (lodging 🏨, square 🏛️, transit 🚉, food 🍽️, shopping 🛍️, health 🏥, sport 🏟️, attraction 🎯) fetched on demand from OpenStreetMap data as the viewport moves.
- Accessed via a **Layers & Places** panel with a master toggle and per-category filter chips, plus a quick-access landmark button on the map.

### 13. 🧭 Auto-Route by Target Distance

- **One-tap loop generation**: pick a distance template (**3, 5, 10, 15, 20, 25, 30, 35, 50 km**) or type a custom value, and OnTrack builds a road-snapped **loop route** from your start point (the first waypoint, or your live GPS location) — for either running or cycling.
- **Convergent radius solver**: the keyless router is queried iteratively, rescaling the loop radius each pass (starting from $R = \text{target} / 2\pi$) until the routed distance lands within ±6% of the requested target. No server-side generation, no API keys.

---

## 📊 Feature Comparison

| Feature                            | Standard Trackers (Strava, NRC) |                             OnTrack                             |
| :--------------------------------- | :-----------------------------: | :-------------------------------------------------------------: |
| **Account Required**               |         Yes (Mandatory)         |                      **No (Zero Sign-up)**                      |
| **Data Privacy**                   |    Cloud Servers / Trackers     |                  **100% Local Browser Memory**                  |
| **PWA Installable**                |    Heavy App Store Download     |               **Instant Web Install (< 500 KB)**                |
| **Audio Voice Cues**               |     Proprietary Audio Packs     |               **Native Web Speech API (ID & EN)**               |
| **KM Splits on Card**              |    Restricted / Subscription    |              **Included on Exported Social Card**               |
| **Road Route Builder**             |        Paid Subscription        |                     **Free & Open Source**                      |
| **Auto-Route by Distance**         |       Paid / Manual Only        |                **Free One-Tap Loop Generation**                 |
| **Cycling Mode**                   |        Subscription Tier        |                 **Built-in Run / Ride Switch**                  |
| **Elevation Profile (Rides)**      |        Subscription Tier        |             **Free Keyless DEM Climb Data & Chart**             |
| **Nearby Places (Hotels, etc.)**   |         Paid Spotlight          |                  **Free Keyless POI Overlay**                   |
| **Basemap Choice**                 |         Locked Provider         | **Street / OSM / CyclOSM / Satellite / Terrain / Light / Dark** |
| **Screen-Off Background Tracking** |       Native App Service        |               **Audio Keep-Alive + MediaSession**               |
| **Stopwatch Accuracy**             |         Native OS Timer         |               **Drift-Free Timestamp Delta Math**               |
| **Screen Wake Lock**               |         Native App Only         |                 **Native Web API (In-Browser)**                 |
| **Social Card Export**             |        Fixed Watermarks         |              **Custom 4:5 & 9:16 Aesthetic Cards**              |
| **API Keys Needed**                |            High Cost            |                  **Keyless Free Architecture**                  |

---

## 🛠️ Tech Stack & Dependencies

- **Core Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Custom neobrutalist light palette, matte surfaces, hard-shadow accents)
- **Map & Spatial Routing**: [Leaflet.js](https://leafletjs.com/), [Valhalla Public OSM Router](https://valhalla1.openstreetmap.de/) (pedestrian & bicycle profiles), [OSRM](http://project-osrm.org/) (car fallback), [OpenStreetMap Overpass API](https://overpass-api.de/) (nearby places), [Open-Meteo Elevation API](https://open-meteo.com/) (keyless DEM elevation), [Esri World Street Map](https://server.arcgisonline.com) & [CyclOSM](https://www.cyclosm.org/) tiles
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
│   │   ├── AutoRouteModal.jsx   # Distance-based automatic loop route generator modal
│   │   ├── ControlsBar.jsx      # Start/Pause, Voice Cue toggle, Undo, Reset, Auto Route, Share
│   │   ├── InfoModal.jsx        # User Guide, 100% Privacy Policy & Developer Bio
│   │   ├── MapRoute.jsx         # Leaflet container, keyless basemaps, POI overlay & live GPS layer
│   │   ├── MetricCards.jsx      # Realtime Distance, Pace/Speed, Time & Calorie metrics
│   │   ├── Navbar.jsx           # Activity (Run/Ride) + Mode (Builder / Free Run) switchers & Language Toggle
│   │   └── ShareModal.jsx       # 4:5 & 9:16 Instagram card with route & KM Splits table
│   ├── utils/
│   │   ├── audioCues.js         # Web Speech API synthesized pace/speed announcement engine
│   │   ├── autoRoute.js         # Distance-based loop route generation (geodesic loop + convergent solver)
│   │   ├── backgroundAudio.js   # Silent audio loop keep-alive & MediaSession worker
│   │   ├── elevation.js         # Open-Meteo keyless elevation profile & gain/loss engine
│   │   ├── formatters.js        # Distance, Pace, Speed, Time & Calorie calculation helpers
│   │   ├── pois.js              # Overpass API nearby strategic-places (POI) engine
│   │   ├── routing.js           # Valhalla pedestrian/bicycle routing, OSRM fallback & Haversine formula
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

This project is free for personal, educational, and commercial exploration.
