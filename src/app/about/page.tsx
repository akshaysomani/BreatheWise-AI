'use client';

import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CALCULATION_ENGINE_VERSION } from '@/services/calculation-engine';
import {
  Wind,
  ShieldCheck,
  Cpu,
  Database,
  BarChart2,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Globe2,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3]">
      <Container size="wide" className="space-y-8">
          {/* Hero Section */}
          <div className="border-b border-[#E2E8DE] pb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#397A55] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#397A55]" />
              <span>Evidence-First Environmental Health Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              About BreatheWise AI
            </h1>
            <p className="text-sm sm:text-base text-[#68766C] max-w-3xl leading-relaxed">
              BreatheWise AI is an intelligent urban air quality and respiratory health protection platform designed to bridge the gap between complex atmospheric science and practical, everyday household health decisions.
            </p>
          </div>

          {/* Mission & Core Principles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader>
                <div className="p-2 bg-[#EEF3EA] text-[#397A55] rounded-lg w-fit mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle className="text-base text-[#27352D]">Zero-Fabrication Standard</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2 leading-relaxed">
                <p>
                  We never simulate or fabricate air quality indices. Every metric displayed or ingested by our AI assistant stems directly from verified ground-truth CAAQMS monitoring networks (OpenAQ, CPCB, DPCC, GPCB) or transparent cached baselines.
                </p>
                <p>
                  When continuous data is unavailable, we explicitly report absence rather than hallucinate plausible numbers.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader>
                <div className="p-2 bg-[#EEF3EA] text-[#397A55] rounded-lg w-fit mb-2">
                  <Cpu className="w-5 h-5" />
                </div>
                <CardTitle className="text-base text-[#27352D]">6-Field Explainability Contract</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2 leading-relaxed">
                <p>
                  Every automated guidance recommendation must satisfy a strict 6-field transparency contract: Action, Scientific Reason, Expected Health Benefit, Measurable Impact Metric, Underlying Assumptions, and Uncertainty Bounds.
                </p>
                <p>
                  No opaque, generic advice is presented without grounded mechanistic explanations.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader>
                <div className="p-2 bg-[#EEF3EA] text-[#397A55] rounded-lg w-fit mb-2">
                  <Database className="w-5 h-5" />
                </div>
                <CardTitle className="text-base text-[#27352D]">Statutory CPCB Alignment</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2 leading-relaxed">
                <p>
                  Our calculation engine strictly implements the Indian Ministry of Environment, Forest & Climate Change (MoEFCC) CPCB NAQI Technical Guidelines (2014).
                </p>
                <p>
                  We explicitly distinguish acute 1-hour sensor proxy evaluations from certified 24-hour statutory regulatory standards requiring 16-hour completeness.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Technical Architecture & Engine Transparency */}
          <Card className="bg-white border-[#E2E8DE] overflow-hidden">
            <CardHeader className="bg-[#FAFBF9] border-b border-[#E2E8DE]/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-[#27352D]">Engineering Specifications & System Provenance</CardTitle>
                  <p className="text-xs text-[#68766C]">Verified system properties, calculation models, and operational stacks.</p>
                </div>
                <Badge variant="accent" size="sm">
                  Engine {CALCULATION_ENGINE_VERSION}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs text-[#48534C]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-[#27352D] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#397A55]" /> Architecture & Persistence
                  </h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-[#48534C]">
                    <li>Full-stack Next.js App Router with React Server Components & client workspaces.</li>
                    <li>Production PostgreSQL database with Prisma ORM relational schema.</li>
                    <li>Cryptographic user authentication using scrypt password hashing and HTTP-only session cookies.</li>
                    <li>Privacy-preserving geolocation fuzzing to ~1.1 km neighborhood centroid.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-[#27352D] flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#397A55]" /> Environmental Science References
                  </h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-[#48534C]">
                    <li>Central Pollution Control Board (CPCB) NAQI Technical Report (2014).</li>
                    <li>ASHRAE Standard 62.2 / EPA IAQ Clean Air Delivery Rate formulas.</li>
                    <li>UK DEFRA / Indian CEA Grid Emission Factors for sustainable commute avoidance.</li>
                    <li>Peer-reviewed thermal inversion & diurnal particulate dispersion dynamics.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#68766C]">
                <div>
                  <strong>Health Boundary:</strong> BreatheWise AI provides preventive environmental exposure guidance and is not a substitute for clinical diagnosis or prescription care.
                </div>
                <div className="font-mono text-[11px] shrink-0">
                  Status: Production PostgreSQL Operational
                </div>
              </div>
            </CardContent>
          </Card>
        </Container>
    </div>
  );
}
