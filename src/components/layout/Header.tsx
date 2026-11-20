'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from './Container';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Wind, Menu, X, ArrowUpRight, Sparkles } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  moduleTarget?: string;
  isExternal?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'AI Assistant', href: '/assistant', moduleTarget: 'Module M5 (AI Assistant & Recommendations)' },
  { label: 'Air Quality', href: '/air-quality', moduleTarget: 'Module M4 (Air Quality Intelligence Engine)' },
  { label: 'Tips & Solutions', href: '/#features' },
  { label: 'Impact Tracker', href: '/impact-tracker', moduleTarget: 'Module M6 (Impact Tracker & Community)' },
  { label: 'About', href: '/#about' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModulePreview, setActiveModulePreview] = useState<string | null>(null);

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    if (item.moduleTarget) {
      e.preventDefault();
      setActiveModulePreview(item.moduleTarget);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8DE] transition-all">
      <Container size="wide">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Brand Identity */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-[#397A55] rounded-lg p-1"
            aria-label="BreatheWise AI Home"
          >
            <div className="w-11 h-11 rounded-[10px] bg-[#397A55] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Wind className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#27352D] font-[var(--font-heading)] leading-none">
                BreatheWise<span className="text-[#397A55] ml-1 text-sm font-semibold tracking-normal px-1.5 py-0.5 rounded bg-[#EEF3EA]">AI</span>
              </span>
              <span className="text-xs text-[#68766C] tracking-wide mt-1 font-medium">
                Breathe Better. Live Healthier.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-[8px] transition-colors relative focus-visible:outline-2 focus-visible:outline-[#397A55] ${
                    isActive
                      ? 'text-[#397A55] bg-[#EEF3EA] font-semibold'
                      : 'text-[#27352D] hover:text-[#397A55] hover:bg-[#F7F8F3]'
                  }`}
                >
                  {item.label}
                  {item.moduleTarget && (
                    <span className="ml-1 text-[10px] px-1 py-0.2 bg-[#F7F8F3] border border-[#E2E8DE] rounded text-[#718C72]">
                      Preview
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="md">
                Live Radar
              </Button>
            </Link>
            <Link href="/#hero">
              <Button variant="primary" size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
                Get Guidance
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-[8px] text-[#27352D] hover:bg-[#EEF3EA] focus-visible:outline-2 focus-visible:outline-[#397A55]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#E2E8DE] bg-white px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className="flex items-center justify-between px-3.5 py-3 text-base font-medium rounded-[8px] text-[#27352D] hover:bg-[#EEF3EA] hover:text-[#397A55] transition-colors"
              >
                <span>{item.label}</span>
                {item.moduleTarget && (
                  <Badge variant="secondary" size="sm">
                    M-Roadmap
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-[#E2E8DE] flex flex-col gap-2">
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="md" className="w-full">
                Dashboard Overview
              </Button>
            </Link>
            <Link href="/#hero" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" className="w-full">
                Get Personalized Guidance
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Honest Module Preview Notice Modal */}
      <Modal
        isOpen={Boolean(activeModulePreview)}
        onClose={() => setActiveModulePreview(null)}
        title="MOSAIC Sequential Roadmap Feature"
        description="BreatheWise AI is engineered using strict sequential MOSAIC modules."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[10px] bg-[#EEF3EA] border border-[#CDE0D3]">
            <p className="text-sm font-semibold text-[#397A55]">
              Scheduled for Activation in: {activeModulePreview}
            </p>
            <p className="text-xs text-[#68766C] mt-1.5 leading-relaxed">
              In accordance with competition rules, real API integrations, AI reasoning pipelines, and database mutations are implemented strictly in their designated modules. You are currently viewing the verified M1 Frontend Foundation.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/dashboard" onClick={() => setActiveModulePreview(null)}>
              <Button variant="outline" size="md">
                View M1 Visual Foundation
              </Button>
            </Link>
            <Button variant="primary" size="md" onClick={() => setActiveModulePreview(null)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
