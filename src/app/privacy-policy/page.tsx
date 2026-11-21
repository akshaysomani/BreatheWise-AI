'use client';

import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ShieldCheck, Lock, Eye, Database, Server, RefreshCw } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'November 21, 2026';

  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3]">
      <Container size="wide" className="max-w-4xl space-y-8">
          {/* Header Banner */}
          <div className="border-b border-[#E2E8DE] pb-5 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#397A55] text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#397A55]" />
              <span>User Privacy & Data Protection</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              Privacy Policy
            </h1>
            <p className="text-xs text-[#68766C]">
              Effective Date: {lastUpdated} • Compliant with Indian Digital Personal Data Protection Act (DPDP Act 2023) and Global Privacy Principles.
            </p>
          </div>

          <Card className="bg-white border-[#E2E8DE] shadow-sm">
            <CardContent className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-[#48534C] leading-relaxed">
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#397A55]" />
                  1. Overview & Commitment
                </h2>
                <p>
                  BreatheWise AI (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) is dedicated to safeguarding your personal data and environmental health privacy. We operate under a fundamental data-minimization philosophy: we only request and retain data strictly necessary to compute accurate localized air quality telemetry, size home air purifiers, and tailor respiratory risk recommendations.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#397A55]" />
                  2. Information We Collect
                </h2>
                <ul className="space-y-2 list-disc pl-5">
                  <li>
                    <strong>Account Authentication Data:</strong> When registering, we collect your email address and an encrypted password. Passwords are never stored in plain text; they are hashed using one-way <code>scrypt</code> cryptographic hashing with unique random salts.
                  </li>
                  <li>
                    <strong>Household Physical Profile (Optional):</strong> Floor area (sq ft), ceiling height, room count, window sealing type, cooking fuel source, and purifier CADR specifications to calculate Air Changes per Hour (ACH).
                  </li>
                  <li>
                    <strong>Vulnerability Indicators (Optional):</strong> High-level flags indicating presence of infants, asthmatic individuals, elderly residents, or pregnant women. We do <em>not</em> collect clinical diagnosis records, medical billing records, or government health IDs.
                  </li>
                  <li>
                    <strong>Location Information:</strong> When you permit device geolocation or enter a city/neighborhood, we process your latitude and longitude. To protect residential privacy, public community reports strictly use <strong>privacy-fuzzed coordinates</strong> (~1.1 km neighborhood centroid) rather than exact house numbers or street coordinates.
                  </li>
                  <li>
                    <strong>Assistant Queries & Commute Logs:</strong> Questions submitted to the AI assistant and commute reduction actions logged by you to maintain personal avoidance records.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#397A55]" />
                  3. How We Use Your Information
                </h2>
                <p>We use the collected information exclusively for:</p>
                <ul className="space-y-1.5 list-disc pl-5">
                  <li>Connecting to nearby Continuous Ambient Air Quality Monitoring (CAAQMS) stations to retrieve localized telemetry.</li>
                  <li>Executing mathematical ASHRAE/EPA formulas for air changes per hour and CADR sizing.</li>
                  <li>Providing grounded, explainable respiratory protection and travel exposure schedules.</li>
                  <li>Calculating personal carbon avoidance and particulate exposure reduction metrics.</li>
                  <li>Preventing denial-of-service and brute-force abuse via client IP rate-limiting.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#397A55]" />
                  4. Third-Party Integrations & Data Flow
                </h2>
                <p>
                  BreatheWise AI interacts with select external platforms to provide live intelligence. We do not sell, rent, or monetize your personal data under any circumstances.
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  <li>
                    <strong>Continuous Air Quality Networks:</strong> We query public OpenAQ and Indian CPCB/State Pollution Control Board telemetry using geographic coordinates. No personal identity is transmitted with these environmental queries.
                  </li>
                  <li>
                    <strong>Google Gemini AI:</strong> When enabled, assistant prompts are processed server-side. Prompts contain anonymized environmental context and sanitized user queries inside strict structural XML delimiters. Direct identifiers (email, account ID) are never forwarded to generative AI endpoints.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#397A55]" />
                  5. Session Management & Cookies
                </h2>
                <p>
                  We utilize secure, HTTP-only, <code>SameSite=Strict</code> session cookies to maintain your login status across requests. These session tokens are cryptographically generated and expire automatically. We do not use third-party behavioral advertising or cross-site tracking cookies.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#27352D]">
                  6. Data Retention & Deletion Rights
                </h2>
                <p>
                  You hold full autonomy over your data. You may update or delete your household profile, clear conversation histories, or remove commute logs directly within your dashboard settings at any time. Upon account deletion requests, all associated relational records are permanently purged from our PostgreSQL database.
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2E8DE] text-xs text-[#68766C]">
                Questions regarding our privacy practices? Contact the BreatheWise AI Privacy Officer at <code>privacy@breathewise.ai</code>.
              </div>
            </CardContent>
          </Card>
        </Container>
    </div>
  );
}
