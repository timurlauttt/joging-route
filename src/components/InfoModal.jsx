import { useState } from "react";
import {
  X,
  BookOpen,
  ShieldCheck,
  MapPin,
  Radio,
  Share2,
  ExternalLink,
  ServerOff,
  Cpu,
  Navigation,
  ArrowRight,
  Bike,
  Route,
  Globe,
} from "lucide-react";
import { playTactileSound } from "../utils/soundEffects";

/** Per-step icon + accent colour for the user-guide list. */
const GUIDE_ICONS = [
  { Icon: MapPin, cls: "bg-emerald-200 text-emerald-950" },
  { Icon: Bike, cls: "bg-orange-200 text-orange-950" },
  { Icon: Route, cls: "bg-violet-200 text-violet-950" },
  { Icon: Radio, cls: "bg-sky-200 text-sky-950" },
  { Icon: Share2, cls: "bg-purple-200 text-purple-950" },
];

/** Per-point icon for the privacy list. */
const PRIVACY_ICONS = [
  { Icon: ServerOff, cls: "bg-slate-200 text-slate-900" },
  { Icon: Cpu, cls: "bg-slate-200 text-slate-900" },
  { Icon: Navigation, cls: "bg-slate-200 text-slate-900" },
  { Icon: Globe, cls: "bg-slate-200 text-slate-900" },
];

export default function InfoModal({ isOpen, onClose, t }) {
  const [activeTab, setActiveTab] = useState("guide"); // 'guide' | 'privacy'

  if (!isOpen) return null;

  const info = t?.info || {
    modalTitle: "Panduan & Kebijakan Privasi",
    windowTitle: "Panduan & Privasi OnTrack",
    tabGuide: "Panduan Penggunaan",
    tabPrivacy: "Kebijakan Privasi",
    guideSteps: [
      {
        title: "1. Buat & Atur Rute",
        desc: "Klik peta untuk menandai jalan — semua titik otomatis menempel ke ruas jalan. Geser penanda untuk memindah titik; rute langsung dihitung ulang.",
      },
      {
        title: "2. Mode Lari & Sepeda",
        desc: "Ganti mode Lari/Sepeda di bar atas. Mode sepeda memakai peta CyclOSM, profil elevasi ~30 m, serta preferensi 'Hindari tanjakan' dan permukaan Aspal/Bebas.",
      },
      {
        title: "3. Auto-Route: Jarak, Arah & Via",
        desc: "Pilih template 3–50 km atau isi jarak sendiri. Pilih arah kompas 8 arah atau Auto, lalu dapatkan hingga 3 opsi loop + tombol Buat Ulang. Aktifkan Tempat Strategis lalu ketuk 'Lewat sini' pada alun-alun/hotel agar loop melewatinya.",
      },
      {
        title: "4. Rekam Rute GPS Langsung",
        desc: "Pindah ke menu Rekam GPS dan tekan Mulai. GPS merekam rute Anda langsung dan layar HP dijaga tetap menyala.",
      },
      {
        title: "5. Bagikan Kartu & Ekspor GPX",
        desc: "Buat kartu ringkasan ala Strava (4:5 atau 9:16) dengan foto latar, lalu unduh GPX (termasuk elevasi) untuk Strava, Garmin, atau Komoot.",
      },
    ],
    privacyTitle: "100% Client-Side & Privasi Penuh",
    privacyPoints: [
      {
        title: "Tanpa Server & Tanpa Database",
        desc: "OnTrack tidak menyimpan data Anda di server. Tidak ada akun, pelacakan, atau penjualan data aktivitas ke pihak mana pun.",
      },
      {
        title: "Diproses Lokal di Browser",
        desc: "Koordinat GPS, rute, foto latar, split, dan stopwatch sepenuhnya diproses dan disimpan di memori browser perangkat Anda.",
      },
      {
        title: "Izin Lokasi Hanya Saat Digunakan",
        desc: "Akses GPS hanya diminta untuk memusatkan peta dan merekam rute aktif. Anda memegang kendali penuh atas izin browser.",
      },
      {
        title: "Layanan Peta Publik Tanpa Akun",
        desc: "Untuk membuat rute, peta, elevasi, dan tempat terdekat, koordinat dikirim ke layanan publik gratis (Valhalla/OSM, tile Esri/CyclOSM, AWS Terrain Tiles, Overpass) tanpa akun dan tanpa menyimpan riwayat Anda.",
      },
    ],
    developerLabel: "Dibuat oleh",
    developerLinkText: "pangestudev",
    viewProfile: "Lihat profil developer selengkapnya",
    gotItBtn: "Mengerti & Mulai Gunakan",
  };

  const handleTabChange = (tab) => {
    playTactileSound("switch");
    setActiveTab(tab);
  };

  const handleClose = () => {
    playTactileSound("click");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto overflow-x-hidden w-full max-w-full animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white border-3 border-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[8px_8px_0_#000000] my-auto text-slate-900 flex flex-col gap-4 min-w-0">
        {/* Retro Window Chrome Top Bar */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 -mx-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-black inline-block" />
            <span className="ml-2 font-mono text-[11px] font-black text-slate-800">
              {info.windowTitle}
            </span>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup"
            className="p-1 text-slate-800 hover:text-black bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-md shadow-[2px_2px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-black tracking-widest text-orange-600 uppercase">
              OnTrack
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-xs font-mono font-bold text-slate-600">
              {info.modalTitle}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-mono font-black text-slate-950 tracking-tight">
            {activeTab === "guide" ? info.tabGuide : info.tabPrivacy}
          </h2>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border-2 border-black shadow-[3px_3px_0_#000000] text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => handleTabChange("guide")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all cursor-pointer ${
              activeTab === "guide"
                ? "bg-amber-300 text-black border-black shadow-[2px_2px_0_#000000]"
                : "border-transparent text-slate-700 hover:text-black hover:bg-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{info.tabGuide}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("privacy")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all cursor-pointer ${
              activeTab === "privacy"
                ? "bg-emerald-300 text-black border-black shadow-[2px_2px_0_#000000]"
                : "border-transparent text-slate-700 hover:text-black hover:bg-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{info.tabPrivacy}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[260px] flex flex-col justify-between">
          {activeTab === "guide" ? (
            <div className="flex flex-col gap-2.5 text-left animate-fadeIn">
              {/* Step 1: Builder */}
              {info.guideSteps.map((step, i) => {
                const { Icon, cls } = GUIDE_ICONS[i] || GUIDE_ICONS[0];
                return (
                  <div
                    key={`${i}-${step.title}`}
                    className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0_#000000] flex items-start gap-3"
                  >
                    <div
                      className={`p-2 rounded-lg border-2 border-black shrink-0 mt-0.5 ${cls}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-mono font-black text-slate-950">
                        {step.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 text-left animate-fadeIn">
              {/* Highlight Banner */}
              <div className="bg-emerald-300 text-black border-2 border-black rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-[3px_3px_0_#000000]">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span className="text-xs font-mono font-black leading-tight">
                  {info.privacyTitle}
                </span>
              </div>

              {/* Pillar 1: No server */}
              {info.privacyPoints.map((point, i) => {
                const { Icon, cls } = PRIVACY_ICONS[i] || PRIVACY_ICONS[0];
                return (
                  <div
                    key={`${i}-${point.title}`}
                    className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0_#000000] flex items-start gap-3"
                  >
                    <div
                      className={`p-2 rounded-lg border-2 border-black shrink-0 mt-0.5 ${cls}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-mono font-black text-slate-950">
                        {point.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">
                        {point.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Developer Credit Card Box */}
        <div className="bg-slate-100 p-3 sm:p-3.5 rounded-xl border-2 border-black shadow-[4px_4px_0_#000000] flex items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <span className="text-[11px] font-mono text-slate-600 block">
              {info.developerLabel}
            </span>
            <a
              href="https://pangestudev.web.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-mono font-black text-orange-600 hover:text-orange-500 transition-colors inline-flex items-center gap-1 mt-0.5"
            >
              <span>{info.developerLinkText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <a
            href="https://pangestudev.web.id"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 border-2 border-black shadow-[2px_2px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-mono font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>pangestudev.web.id</span>
            <ArrowRight className="w-3 h-3 text-orange-600" />
          </a>
        </div>

        {/* Bottom CTA Button */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black shadow-[4px_4px_0_#000000] font-mono font-black text-xs sm:text-sm hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          {info.gotItBtn}
        </button>
      </div>
    </div>
  );
}
