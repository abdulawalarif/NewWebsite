"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Twitter, Instagram } from "lucide-react";
import { SoundWaveSeparator } from "./ui/sound-wave-separator";
import { SaillyLogoLockup } from "./sailly-signal-logo";

function SnapchatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.317.237 4.647l-.033.266c-.033.266-.033.266.066.464.133.266.464.397.795.397.364 0 .894-.166 1.49-.364.397-.133.828-.265 1.16-.265.397 0 .662.1.795.298.166.232.232.563.166 1.026-.364 2.55-1.59 3.907-3.623 4.04-.43.033-.761.232-.894.563-.1.232-.033.53.166.828.43.662 1.126 1.722 1.126 2.55 0 .364-.166.662-.53.86-.298.166-.662.232-1.06.232-.53 0-1.126-.133-1.722-.298-.53-.166-1.06-.298-1.523-.298-.397 0-.795.1-1.126.298-.563.298-1.193.53-1.855.53-.662 0-1.292-.232-1.855-.53-.331-.198-.729-.298-1.126-.298-.463 0-.993.132-1.523.298-.596.165-1.192.298-1.722.298-.398 0-.762-.066-1.06-.232-.364-.198-.53-.496-.53-.86 0-.828.696-1.888 1.126-2.55.199-.298.265-.596.166-.828-.133-.331-.464-.53-.894-.563-2.033-.133-3.259-1.49-3.623-4.04-.066-.463 0-.794.166-1.026.133-.198.398-.298.795-.298.332 0 .763.132 1.16.265.596.198 1.126.364 1.49.364.331 0 .662-.131.795-.397.099-.198.099-.198.066-.464l-.033-.266c-.166-1.33-.292-3.454.237-4.647C7.447 1.069 10.804.793 11.794.793h.412z" />
    </svg>
  );
}

interface FooterProps {
  dict?: any;
  locale?: string;
}

export function SaillyFooter({ dict, locale }: FooterProps) {
  const [currentYear, setCurrentYear] = useState(2026);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative mt-auto z-20">
      {/* Sound Wave Separator */}
      <SoundWaveSeparator />
      
      <div className="bg-white/40 backdrop-blur-md border-t border-white/50 text-slate-600 pb-16 pt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <Link href={`/${locale || ""}`} className="inline-block relative group">
                <SaillyLogoLockup wordmarkClass="text-2xl" />
              </Link>
              <p className="text-slate-600 mb-8 max-w-sm mt-4">
                {dict?.footer?.tagline || "Die KI-Telefonzentrale für den deutschen Mittelstand. Beantwortet Anrufe, vereinbart Termine und entlastet Ihr Team – 24/7."}
              </p>
              <div className="flex gap-4">
                 {/* Social links with 48px touch targets */}
                 <a href="#" className="p-3 bg-white/60 border border-white/50 rounded-full hover:bg-white transition-colors text-[#ff9b8a] shadow-sm min-h-[44px] min-w-[44px] touch-manipulation inline-flex items-center justify-center" aria-label="Snapchat"><SnapchatIcon size={20} /></a>
                 <a href="#" className="p-3 bg-white/60 border border-white/50 rounded-full hover:bg-white transition-colors text-[#ff9b8a] shadow-sm min-h-[44px] min-w-[44px] touch-manipulation inline-flex items-center justify-center" aria-label="Twitter"><Twitter size={20} /></a>
                 <a href="#" className="p-3 bg-white/60 border border-white/50 rounded-full hover:bg-white transition-colors text-[#ff9b8a] shadow-sm min-h-[44px] min-w-[44px] touch-manipulation inline-flex items-center justify-center" aria-label="Instagram"><Instagram size={20} /></a>
              </div>
            </div>

            <div>
              <h3 className="text-slate-900 font-bold mb-6">{dict?.nav?.product?.title || "Produkt"}</h3>
              <ul className="space-y-4">
                <li><Link href={`/${locale}/produkt`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.product?.items?.voice_agent || "Sailly Voice Agent"}</Link></li>
                <li><Link href={`/${locale}/produkt/integrationen`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.product?.items?.integrations || "Integrationen"}</Link></li>
                <li><Link href={`/${locale}/produkt/data-insights`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.product?.items?.data_insights || "Daten & Insights"}</Link></li>
                <li><Link href={`/${locale}/produkt/security-compliance`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.product?.items?.security || "Sicherheit & Compliance"}</Link></li>
                <li><Link href={`/${locale}/produkt/languages`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.product?.items?.languages || "Sprachen"}</Link></li>
                <li><Link href={`/${locale}/produkt/strategic-partners`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.product?.items?.partners || "Strategische Partner"}</Link></li>
                <li><Link href={`/${locale}/preise`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.pricing || "Preise"}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-slate-900 font-bold mb-6">{dict?.nav?.solutions?.title || "Lösungen"}</h3>
              <ul className="space-y-4">
                <li><Link href={`/${locale}/loesungen/hotels`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.solutions?.items?.hotels || "Hotellerie"}</Link></li>
                <li><Link href={`/${locale}/loesungen/medical`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.solutions?.items?.medical || "Arztpraxen"}</Link></li>
                <li><Link href={`/${locale}/loesungen/restaurants`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.solutions?.items?.restaurants || "Gastronomie"}</Link></li>
                <li><Link href={`/${locale}/loesungen/legal`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.solutions?.items?.legal || "Kanzleien & Steuerberatung"}</Link></li>
                <li><Link href={`/${locale}/loesungen/services`} className="hover:text-[#ff9b8a] transition-colors">{dict?.nav?.solutions?.items?.services || "Dienstleister & KMU"}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-slate-900 font-bold mb-6">{dict?.footer?.legal || "Rechtliches"}</h3>
              <ul className="space-y-4">
                <li><Link href={`/${locale}/impressum`} className="hover:text-[#ff9b8a] transition-colors">{dict?.footer?.imprint || "Impressum"}</Link></li>
                <li><Link href={`/${locale}/datenschutz`} className="hover:text-[#ff9b8a] transition-colors">{dict?.footer?.privacy || "Datenschutz"}</Link></li>
                <li><Link href={`/${locale}/agb`} className="hover:text-[#ff9b8a] transition-colors">{dict?.footer?.agb || "AGB"}</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
               {dict?.footer?.copyright || `© ${currentYear} Sailly. Alle Rechte vorbehalten.`}
            </p>
            <div className="flex gap-6 text-sm">
               <span className="text-slate-600">{dict?.footer?.made_in_germany || "Made in Germany 🇩🇪"}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
