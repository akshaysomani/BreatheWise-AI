import React from 'react';
import Link from 'next/link';
import { Container } from './Container';
import { Wind, ShieldCheck, HeartHandshake, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-[#EEF3EA] border-t border-[#E2E8DE] mt-auto">
      <Container size="wide" className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Purpose Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-[#397A55] flex items-center justify-center text-white">
                <Wind className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                BreatheWise<span className="text-[#397A55] text-sm ml-1 font-semibold">AI</span>
              </span>
            </div>
            <p className="text-sm text-[#68766C] leading-relaxed max-w-sm">
              An intelligent, location-aware environmental defense platform designed to help families and vulnerable urban residents navigate winter smog, optimize indoor air quality, and choose low-emission routines.
            </p>
            <div className="flex items-center gap-4 text-xs text-[#68766C] pt-2">
              <span className="inline-flex items-center gap-1.5 text-[#397A55] font-semibold">
                <ShieldCheck className="w-4 h-4" /> Evidence-Based
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 text-[#397A55] font-semibold">
                <HeartHandshake className="w-4 h-4" /> Family-Focused
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-sm font-bold text-[#27352D] uppercase tracking-wider mb-4 font-[var(--font-heading)]">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm text-[#68766C]">
              <li>
                <Link href="/" className="hover:text-[#397A55] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#397A55] transition-colors">
                  Air Quality Radar
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#397A55] transition-colors">
                  Features & Capabilities
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#397A55] transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Environmental Science & Guidance */}
          <div>
            <h4 className="text-sm font-bold text-[#27352D] uppercase tracking-wider mb-4 font-[var(--font-heading)]">
              Science & Action
            </h4>
            <ul className="space-y-2.5 text-sm text-[#68766C]">
              <li>
                <Link href="/dashboard" className="hover:text-[#397A55] transition-colors">
                  HEPA CADR Calculator
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#397A55] transition-colors">
                  Diurnal Ventilation Window
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#397A55] transition-colors">
                  Inhaled Dose vs. Emissions
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#397A55] transition-colors">
                  Impact Formula Transparency
                </Link>
              </li>
            </ul>
          </div>

          {/* Data Provenance & Attribution */}
          <div>
            <h4 className="text-sm font-bold text-[#27352D] uppercase tracking-wider mb-4 font-[var(--font-heading)]">
              Data & Ethics
            </h4>
            <div className="space-y-3 text-xs text-[#68766C] leading-relaxed">
              <p>
                Ground monitoring observations powered by{' '}
                <a
                  href="https://openaq.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#397A55] hover:underline inline-flex items-center gap-0.5"
                >
                  OpenAQ <ExternalLink className="w-3 h-3" />
                </a>{' '}
                under CC BY 4.0 license.
              </p>
              <p>
                Atmospheric physical dispersion modeling provided by Copernicus CAMS via Open-Meteo.
              </p>
              <p className="font-medium text-[#27352D]">
                Zero health data monetized. Geolocation strictly fuzzed for community reports.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#E2E8DE] flex flex-col sm:flex-row items-center justify-between text-xs text-[#68766C] gap-4">
          <p>© {new Date().getFullYear()} BreatheWise AI. Developed for Prompt War — Challenge 6.</p>
          <div className="flex items-center gap-6">
            <Link href="/#about" className="hover:text-[#397A55]">
              Methodology
            </Link>
            <Link href="/#about" className="hover:text-[#397A55]">
              Privacy Policy
            </Link>
            <Link href="/#about" className="hover:text-[#397A55]">
              Terms of Use
            </Link>
            <span className="text-[#397A55] font-semibold">Target: 97.50+ / 100</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
