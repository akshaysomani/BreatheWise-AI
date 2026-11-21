'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { ImpactWorkspace } from '@/components/dashboard/ImpactWorkspace';
import { CommunityWorkspace } from '@/components/dashboard/CommunityWorkspace';
import { Spinner } from '@/components/ui/Spinner';
import { Leaf, Users, ShieldCheck, Activity } from 'lucide-react';

export default function ImpactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'personal' | 'community'>('personal');

  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok || !json?.data?.authenticated) {
          router.replace('/login?returnUrl=/impact');
          return;
        }

        setUser(json.data.user);
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
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
          {/* Header Banner */}
          <div className="border-b border-[#E2E8DE] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#397A55] text-xs font-semibold mb-2">
                <Leaf className="w-3.5 h-3.5 text-[#397A55]" />
                <span>Environmental Science & Emission Tracking</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
                Environmental Impact & Collective Action
              </h1>
              <p className="text-xs sm:text-sm text-[#68766C] mt-1">
                Transparent carbon avoidance calculations, particulate exposure mitigation, and community air observations.
              </p>
            </div>

            {/* Toggle View Tabs */}
            <div className="flex items-center bg-[#EEF3EA] p-1 rounded-lg border border-[#CDE0D3] self-start sm:self-auto">
              <button
                onClick={() => setView('personal')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  view === 'personal'
                    ? 'bg-[#397A55] text-white shadow-xs'
                    : 'text-[#48534C] hover:text-[#27352D]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Personal Impact
              </button>
              <button
                onClick={() => setView('community')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  view === 'community'
                    ? 'bg-[#397A55] text-white shadow-xs'
                    : 'text-[#48534C] hover:text-[#27352D]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Neighborhood Reports
              </button>
            </div>
          </div>

          {/* Active Workspace View */}
          {view === 'personal' ? (
            <ImpactWorkspace />
          ) : (
            <CommunityWorkspace />
          )}
        </Container>
    </div>
  );
}
