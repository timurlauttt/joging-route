# OnTrack — Minimalist Running & Route Tracker

Aplikasi pelacak rute lari dan jogging minimalis dengan tema gelap modern, berjalan **100% di sisi klien (client-side)** tanpa ketergantungan backend ataupun API key berbayar.

---

## ⚡ Fitur Utama

### 1. Dual Mode Tracking
* **Route Builder Mode**: Klik pada peta untuk membuat rute terukur, otomatis terhubung dengan jalur jalan pedestrian kaki. Tombol Undo dan Reset rute tersedia.
* **Free Run Mode**: Pelacakan GPS real-time via `watchPosition`, dilengkapi **Screen Wake Lock API** agar layar ponsel tidak mati otomatis saat berolahraga. Jarak dihitung secara instan menggunakan **Haversine Formula**.

### 2. Metrik Esensial
* **Jarak Tempuh**: Format kilometer presisi (misal: `5.24 km`).
* **Stopwatch**: Format waktu berjalan `HH:MM:SS` (Mulai, Jeda, Reset).
* **Pace Dinamis**: Menit & detik per kilometer secara realtime (misal: `05:32 /km`).
* **Estimasi Energi**: Perhitungan kalori terbakar (~$62$ kcal/km).

### 3. Peta Bersih Bebas API Key
* Menggunakan **Esri World Dark Gray Canvas** beresolusi tinggi, **100% gratis tanpa watermark dan tanpa perlu API key**.
* Opsi beralih ke OpenStreetMap mode terang.

### 4. Kartu Sesi Lari (Export Image)
* Buat kartu ringkasan lari dalam format rasio **9:16** (Story) atau **1:1** (Feed).
* Siluet jalur rute lari yang bersih dan presisi.
* Opsi latar belakang foto pribadi atau gradien gelap minimalis.
* Unduh langsung ke format PNG atau bagikan via **Web Share API**.

---

## 🛠️ Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Build produksi:
```bash
npm run build
```
