'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { AssistantWorkspace } from '@/components/dashboard/AssistantWorkspace';
import { Spinner } from '@/components/ui/Spinner';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function AssistantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [household, setHousehold] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
        const sessionJson = await sessionRes.json();

        if (!sessionRes.ok || !sessionJson?.data?.authenticated) {
          router.replace('/login?returnUrl=/assistant');
          return;
        }

        setUser(sessionJson.data.user);

        // Fetch household for coordinate/context initialization
        const houseRes = await fetch('/api/household', { cache: 'no-store' });
        if (houseRes.ok) {
          const houseJson = await houseRes.json();
          setHousehold(houseJson.data);
        }
      } catch (err) {
        console.error('Failed to initialize assistant page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="py-24 bg-[#F7F8F3] min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3]">
      <Container size="wide" className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-[#E2E8DE] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#397A55] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D69B47]" />
              <span>Context-Grounded Environmental AI Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              AI Air Quality Assistant & Daily Action Planner
            </h1>
            <p className="text-xs sm:text-sm text-[#68766C] mt-1">
              Personalized, explainable respiratory protection, indoor purification sizing, and low-emission commute guidance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 bg-white rounded-lg border border-[#E2E8DE] text-xs text-[#48534C]">
            <ShieldCheck className="w-4 h-4 text-[#397A55]" />
            <span>Evidence-Grounded • Zero-Fabrication</span>
          </div>
        </div>

        {/* Assistant Workspace Component */}
        <AssistantWorkspace
          initialLat={household?.profile?.latitude}
          initialLon={household?.profile?.longitude}
          userCity={household?.profile?.city}
        />
      </Container>
    </div>
  );
}
