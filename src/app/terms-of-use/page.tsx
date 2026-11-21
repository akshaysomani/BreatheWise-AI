'use client';

import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { ShieldAlert, FileText, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';

export default function TermsOfUsePage() {
  const lastUpdated = 'November 21, 2026';

  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3]">
      <Container size="wide" className="max-w-4xl space-y-8">
          {/* Header Banner */}
          <div className="border-b border-[#E2E8DE] pb-5 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#397A55] text-xs font-semibold mb-2">
              <Scale className="w-3.5 h-3.5 text-[#397A55]" />
              <span>Platform Terms & User Agreement</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              Terms of Use
            </h1>
            <p className="text-xs text-[#68766C]">
              Effective Date: {lastUpdated} • Please read these terms carefully before utilizing BreatheWise AI.
            </p>
          </div>

          <Card className="bg-white border-[#E2E8DE] shadow-sm">
            <CardContent className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-[#48534C] leading-relaxed">
              {/* Critical Medical Disclaimer Banner */}
              <div className="p-4 bg-[#FEE2E2] rounded-xl border border-[#DC2626]/40 text-[#7F1D1D] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
                  CRITICAL HEALTH & MEDICAL DISCLAIMER
                </div>
                <p className="text-xs text-[#7F1D1D] leading-relaxed">
                  BreatheWise AI is an environmental exposure-reduction and educational tool, <strong>NOT a licensed medical provider</strong>. The platform does not provide clinical diagnosis, disease treatment, emergency medical intervention, or pharmaceutical prescriptions. If you, your child, or a family member experience acute respiratory distress, severe wheezing, chest pain, or blue discoloration of lips, call emergency medical services immediately (e.g., <strong>112 in India</strong>) or proceed to the nearest emergency medical room. Never delay professional medical treatment based on platform guidance.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#397A55]" />
                  1. Acceptance of Terms
                </h2>
                <p>
                  By creating an account, browsing the website, querying air quality telemetry, or interacting with the BreatheWise AI assistant, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree with any provision of these terms, please discontinue use immediately.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D69B47]" />
                  2. Environmental Telemetry & Sensor Availability
                </h2>
                <p>
                  BreatheWise AI ingests observational data from external Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by the Central Pollution Control Board (CPCB), State Pollution Control Boards (SPCBs), and open scientific consortia (e.g., OpenAQ).
                </p>
                <ul className="space-y-1.5 list-disc pl-5">
                  <li>Telemetry reflects specific geographical monitoring locations and may differ from microclimatic conditions in your immediate vicinity.</li>
                  <li>Monitoring station telemetry is subject to periodic maintenance, network outages, and calibration downtime beyond our control.</li>
                  <li>Where real-time live sensor data is unavailable, BreatheWise AI explicitly marks values as cached or reports no data under our strict zero-fabrication standard.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#397A55]" />
                  3. Permitted Platform Use & Conduct
                </h2>
                <p>Users agree to utilize the platform responsibly. You agree NOT to:</p>
                <ul className="space-y-1.5 list-disc pl-5">
                  <li>Attempt prompt-injection attacks, jailbreaks, or exfiltration of system instructions and API credentials.</li>
                  <li>Submit false or fraudulent community smoke/fire reports designed to mislead public warning systems.</li>
                  <li>Execute automated scraping, denial-of-service floods, or unauthorized security penetration tests against platform endpoints.</li>
                  <li>Reverse engineer, bypass authentication, or falsify another user&apos;s identity or session tokens.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D]">
                  4. Intellectual Property & Scientific Models
                </h2>
                <p>
                  All software code, visual identity, design tokens, brand marks, and customized calculation engine algorithms in BreatheWise AI are proprietary and protected under applicable copyright and intellectual property legislation. The CPCB NAQI calculation breakpoints and formulas are statutory public domain standards established by the Ministry of Environment, Forest & Climate Change (MoEFCC), India.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D]">
                  5. Limitation of Liability
                </h2>
                <p>
                  To the maximum extent permitted by applicable law, BreatheWise AI and its contributors disclaim liability for any indirect, incidental, or consequential damages resulting from reliance on air quality telemetry, purifier sizing estimates, or scheduled commute travel decisions.
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2E8DE] text-xs text-[#68766C]">
                For legal inquiries regarding these terms, contact <code>legal@breathewise.ai</code>.
              </div>
            </CardContent>
          </Card>
        </Container>
    </div>
  );
}
