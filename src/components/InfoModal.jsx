import { useState } from 'react';
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
} from 'lucide-react';

export default function InfoModal({ isOpen, onClose, t }) {
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'privacy'

  if (!isOpen) return null;

  const info = t?.info || {
    modalTitle: 'Panduan & Kebijakan Privasi',
    tabGuide: 'Panduan Penggunaan',
    tabPrivacy: 'Kebijakan Privasi',
    guideStep1Title: '1. Rencanakan Rute (Builder Mode)',
    guideStep1Desc: 'Klik titik jalan di peta untuk membuat rute. Titik-titik akan otomatis menempel di ruas jalan (road snapping) dengan kalkulasi jarak akurat.',
    guideStep2Title: '2. Lari Bebas GPS (Free Run Mode)',
    guideStep2Desc: 'Pindah ke tab Free Run dan klik tombol "Mulai" saat berlari di luar ruangan. GPS live merekam pergerakan Anda, dan layar HP dijaga tetap menyala (Wake Lock).',
    guideStep3Title: '3. Bagikan Kartu Hasil Lari (Share)',
    guideStep3Desc: 'Beri nama sesi lari kustom (ala Strava), pilih format rasio (4:5 Post IG atau 9:16 Story), pasang foto latar Anda, lalu bagikan atau unduh kartu ringkasannya.',
    privacyTitle: '100% Client-Side & Privasi Penuh',
    privacyPoint1Title: 'Tanpa Server & Tanpa Database',
    privacyPoint1Desc: 'OnTrack tidak memiliki server database untuk menyimpan data Anda. Kami tidak mengumpulkan, melacak, atau menjual data aktivitas Anda ke pihak mana pun.',
    privacyPoint2Title: 'Diproses Lokal di Browser Anda',
    privacyPoint2Desc: 'Seluruh koordinat GPS, rute jalan, foto yang dipilih, dan waktu latihan sepenuhnya diproses dan disimpan hanya di memori browser lokal perangkat Anda.',
    privacyPoint3Title: 'Izin Lokasi Hanya Saat Digunakan',
    privacyPoint3Desc: 'Akses GPS hanya diminta untuk memusatkan peta dan melacak rute aktif Anda secara real-time. Anda memegang kendali penuh atas izin browser Anda.',
    developerLabel: 'Dibuat oleh',
    developerLinkText: 'pangestudev',
    viewProfile: 'Lihat profil developer selengkapnya',
    gotItBtn: 'Mengerti & Mulai Gunakan',
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto overflow-x-hidden w-full max-w-full animate-fadeIn">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl my-auto text-zinc-100 flex flex-col gap-4 min-w-0">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-left pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black tracking-widest text-orange-500 uppercase">
              ONTRACK
            </span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-xs font-medium text-zinc-400">
              {info.modalTitle}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            {activeTab === 'guide' ? info.tabGuide : info.tabPrivacy}
          </h2>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-orange-400" />
            <span>{info.tabGuide}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{info.tabPrivacy}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[260px] flex flex-col justify-between">
          {activeTab === 'guide' ? (
            <div className="flex flex-col gap-2.5 text-left animate-fadeIn">
              {/* Step 1: Builder */}
              <div className="bg-zinc-950/60 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    {info.guideStep1Title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {info.guideStep1Desc}
                  </p>
                </div>
              </div>

              {/* Step 2: Free Run */}
              <div className="bg-zinc-950/60 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0 mt-0.5">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    {info.guideStep2Title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {info.guideStep2Desc}
                  </p>
                </div>
              </div>

              {/* Step 3: Share */}
              <div className="bg-zinc-950/60 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    {info.guideStep3Title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {info.guideStep3Desc}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 text-left animate-fadeIn">
              {/* Highlight Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-emerald-400">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold leading-tight">
                  {info.privacyTitle}
                </span>
              </div>

              {/* Pillar 1: No server */}
              <div className="bg-zinc-950/60 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                  <ServerOff className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    {info.privacyPoint1Title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {info.privacyPoint1Desc}
                  </p>
                </div>
              </div>

              {/* Pillar 2: Local execution */}
              <div className="bg-zinc-950/60 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    {info.privacyPoint2Title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {info.privacyPoint2Desc}
                  </p>
                </div>
              </div>

              {/* Pillar 3: On-demand GPS */}
              <div className="bg-zinc-950/60 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    {info.privacyPoint3Title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {info.privacyPoint3Desc}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Developer Credit Card Box */}
        <div className="bg-zinc-950 p-3 sm:p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <span className="text-[11px] text-zinc-400 block">
              {info.developerLabel}
            </span>
            <a
              href="https://pangestudev.web.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-extrabold text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1 mt-0.5"
            >
              <span>{info.developerLinkText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <a
            href="https://pangestudev.web.id"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>pangestudev.web.id</span>
            <ArrowRight className="w-3 h-3 text-orange-400" />
          </a>
        </div>

        {/* Bottom CTA Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-sm transition-all active:scale-[0.98] cursor-pointer shadow-md"
        >
          {info.gotItBtn}
        </button>
      </div>
    </div>
  );
}
