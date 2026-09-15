# Minimalist Jogging Route Tracker

Aplikasi pelacak rute lari dan jogging minimalis berbasis **React (Vite) + Tailwind CSS** yang berjalan **100% di sisi klien (client-side)** tanpa backend ataupun database.

---

## 🚀 Fitur Utama

### 1. Dual Mode Tracking (Route Builder & Free Run)
- **Route Builder Mode (Manual Snapping)**:
  - Inisialisasi peta Leaflet CartoDB Dark Matter (dengan opsi ganti ke OpenStreetMap).
  - Klik di peta untuk menandai titik rute jalan (waypoints).
  - Integrasi otomatis dengan **OSRM Foot-Walking API** (`router.project-osrm.org`) saat $\ge 2$ titik koordinat ditandai.
  - Render jalur GeoJSON dengan efek garis neon glow ganda (emerald/cyan).
  - Tombol **Undo Titik Terakhir** dan **Reset Rute**.
- **Free Run Mode (Live GPS Tracking)**:
  - Pelacakan koordinat real-time menggunakan `navigator.geolocation.watchPosition()`.
  - **Screen Wake Lock API** (`navigator.wakeLock.request('screen')`) aktif saat lari berjalan, menjaga layar HP tetap menyala agar GPS tidak mengalami throttling di latar belakang.
  - Render rute live polyline secara dinamis di peta dengan user position pulse dot (animasi radar).
  - Kalkulasi jarak live murni menggunakan **Haversine Formula** (filter jitter $\ge 2.5$ meter untuk akurasi tinggi).

### 2. Metrik Real-time
- **Jarak Total**: Ditampilkan dalam format kilometer presisi 2 desimal (misal: `5.24 km`).
- **Stopwatch / Timer**: Timer akurat dalam format `HH:MM:SS` dengan tombol Mulai, Jeda, dan Reset.
- **Pace Dinamis**: Dihitung real-time menggunakan rumus `(totalDetik / 60) / km` dalam format `MM:SS /km` (misal: `05:32 /km`).
- **Estimasi Kalori**: Kalkulasi pembakaran kalori berdasarkan jarak lari (~$62$ kcal/km).

### 3. Strava-Style Share Card & Image Export
- Modal kartu preview bergaya kartu Strava dengan pilihan rasio:
  - **9:16** (Instagram Stories & TikTok)
  - **1:1** (Square Feed)
- Fitur unggah foto pribadi sebagai latar belakang kartu dengan slider keredupan (dimming), atau default mesh gradient gelap elegan.
- Visualisasi bentuk rute yang ditempuh dalam bentuk siluet SVG neon glow.
- Overlay teks metrik: Total Jarak, Waktu Tempuh, Pace Rata-rata, Kalori, dan tanggal lari.
- Ekspor kartu ke file PNG menggunakan library `html-to-image`.
- Fitur **Web Share API** (`navigator.share`) dengan fallback otomatis unduh file PNG jika browser tidak mendukung sharing file.

---

## 🛠️ Menjalankan Aplikasi Secara Lokal

1. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:5173`.

2. **Linter & Type Check**:
   ```bash
   npm run lint
   ```

3. **Build Bundle Produksi**:
   ```bash
   npm run build
   ```
