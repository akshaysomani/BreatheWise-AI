'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Users,
  Plus,
  ThumbsUp,
  Flag,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Filter,
  RefreshCw,
  Eye,
  Wind,
  Flame,
  Factory,
  Trees,
  HelpCircle,
  Clock,
  Compass,
} from 'lucide-react';

interface CommunityReport {
  id: string;
  reportType: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  description: string;
  fuzzedLatitude: number;
  fuzzedLongitude: number;
  neighborhood: string;
  isOfficialData: boolean;
  upvotes: number;
  status: string;
  createdAt: string;
}

interface CommunityWorkspaceProps {
  userLat?: number;
  userLon?: number;
  userCity?: string;
}

export function CommunityWorkspace({
  userLat = 28.61,
  userLon = 77.20,
  userCity = 'Delhi',
}: CommunityWorkspaceProps) {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  // Modals
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [reportToFlag, setReportToFlag] = useState<CommunityReport | null>(null);

  // Upvote tracking (client-side set of upvoted report IDs)
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  // Form State for Submission
  const [formType, setFormType] = useState('VISIBLE_SMOG');
  const [formSeverity, setFormSeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE'>('MODERATE');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLat, setFormLat] = useState(userLat.toFixed(2));
  const [formLon, setFormLon] = useState(userLon.toFixed(2));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State for Flagging
  const [flagReason, setFlagReason] = useState('SPAM_OR_ADVERTISING');
  const [flagDetails, setFlagDetails] = useState('');
  const [flagging, setFlagging] = useState(false);

  // Fetch Feed
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('lat', userLat.toString());
      params.append('lon', userLon.toString());
      if (selectedType !== 'ALL') params.append('reportType', selectedType);
      if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);
      params.append('limit', '40');

      const res = await fetch(`/api/community/reports?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch community feed');

      setReports(json.data.reports || []);
      setTotalCount(json.data.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading community reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedType, selectedSeverity, userLat, userLon]);

  // Handle Upvote
  const handleUpvote = async (reportId: string) => {
    if (upvotedIds.has(reportId)) return;

    // Optimistic update
    setUpvotedIds((prev) => new Set(prev).add(reportId));
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
    );

    try {
      const res = await fetch(`/api/community/reports/${reportId}/upvote`, {
        method: 'POST',
      });
      if (!res.ok) {
        // Rollback
        setUpvotedIds((prev) => {
          const next = new Set(prev);
          next.delete(reportId);
          return next;
        });
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, upvotes: Math.max(0, r.upvotes - 1) } : r))
        );
      }
    } catch {
      // Rollback
      setUpvotedIds((prev) => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, upvotes: Math.max(0, r.upvotes - 1) } : r))
      );
    }
  };

  // Handle Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const lat = parseFloat(formLat) || userLat;
      const lon = parseFloat(formLon) || userLon;

      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: formType,
          severity: formSeverity,
          neighborhood: formNeighborhood.trim() || userCity,
          description: formDescription.trim(),
          latitude: lat,
          longitude: lon,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to submit report');

      setSubmitModalOpen(false);
      setFormDescription('');
      setFormNeighborhood('');
      fetchReports();
    } catch (err: any) {
      setSubmitError(err.message || 'Error submitting report');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Flag Report
  const handleFlagReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportToFlag) return;
    setFlagging(true);

    try {
      const res = await fetch(`/api/community/reports/${reportToFlag.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: flagReason,
          details: flagDetails.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to report observation');

      setFlagModalOpen(false);
      setReportToFlag(null);
      setFlagDetails('');
      // Filter out flagged item locally
      setReports((prev) => prev.filter((r) => r.id !== reportToFlag.id));
    } catch (err: any) {
      alert(err.message || 'Error submitting flag');
    } finally {
      setFlagging(false);
    }
  };

  // Helper for report icons & styling
  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'OPEN_BURNING':
        return <Flame className="w-4 h-4 text-[#DC2626]" />;
      case 'INDUSTRIAL_PLUME':
        return <Factory className="w-4 h-4 text-[#D97706]" />;
      case 'GREEN_SPACE_IMPROVEMENT':
        return <Trees className="w-4 h-4 text-[#397A55]" />;
      case 'DUST_CONSTRUCTION':
        return <Wind className="w-4 h-4 text-[#B45309]" />;
      default:
        return <Eye className="w-4 h-4 text-[#68766C]" />;
    }
  };

  const getSeverityBadgeVariant = (sev: string) => {
    switch (sev) {
      case 'SEVERE':
        return 'error' as const;
      case 'MODERATE':
        return 'warning' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Disclaimers */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8DE] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                Community Environmental Intelligence
              </h2>
              <Badge variant="secondary" size="sm">
                Citizen Observations
              </Badge>
            </div>
            <p className="text-xs text-[#68766C] mt-0.5">
              Privacy-preserving local reports with ~1.1 km coarse geographic quantization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Feed
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSubmitModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Report Local Condition
            </Button>
          </div>
        </div>

        {/* Regulatory Segregation Notice (Hard Architectural Invariant) */}
        <div className="p-3 bg-[#EEF3EA] rounded-xl border border-[#397A55]/30 flex items-start gap-3 text-xs text-[#27352D]">
          <ShieldCheck className="w-5 h-5 text-[#397A55] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#397A55]">
                MANDATORY SCIENTIFIC & REGULATORY SEGREGATION
              </span>
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#E2E8DE] text-[#27352D]">
                isOfficialData: false (Hard Invariant)
              </span>
            </div>
            <p className="text-[#68766C] leading-relaxed">
              Citizen observations represent subjective qualitative feedback from neighborhood residents. They are strictly segregated from official Central Pollution Control Board (CPCB) continuous ambient air monitoring stations.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E2E8DE]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[#68766C] mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Type:
          </span>
          {[
            { id: 'ALL', label: 'All Observations' },
            { id: 'VISIBLE_SMOG', label: 'Visible Smog' },
            { id: 'ACRID_ODOR', label: 'Acrid Odor' },
            { id: 'OPEN_BURNING', label: 'Open Burning' },
            { id: 'DUST_CONSTRUCTION', label: 'Dust & Roadwork' },
            { id: 'INDUSTRIAL_PLUME', label: 'Stack Plume' },
            { id: 'GREEN_SPACE_IMPROVEMENT', label: 'Green Canopy' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedType === type.id
                  ? 'bg-[#397A55] text-white'
                  : 'bg-[#F7F8F3] text-[#27352D] hover:bg-[#EEF3EA]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[#68766C] mr-1">Severity:</span>
          {['ALL', 'SEVERE', 'MODERATE', 'MILD'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                selectedSeverity === sev
                  ? 'bg-[#27352D] text-white'
                  : 'bg-[#F7F8F3] text-[#68766C] hover:bg-[#EEF3EA]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : reports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="bg-white border-[#E2E8DE] hover:border-[#397A55]/40 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getReportTypeIcon(report.reportType)}
                      <span className="text-xs font-bold text-[#27352D] font-[var(--font-heading)]">
                        {report.reportType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityBadgeVariant(report.severity)} size="sm">
                        {report.severity}
                      </Badge>
                      <span className="text-[10px] font-mono bg-[#F7F8F3] text-[#68766C] px-1.5 py-0.5 rounded border border-[#E2E8DE]">
                        Unofficial Citizen Data
                      </span>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-2 text-xs pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#397A55] shrink-0" />
                    <span>{report.neighborhood}</span>
                    <span className="text-[#E2E8DE]">•</span>
                    <span className="font-mono text-[10px] text-[#68766C]">
                      ~{report.fuzzedLatitude.toFixed(2)}°N, {report.fuzzedLongitude.toFixed(2)}°E
                    </span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 text-xs text-[#27352D]">
                  <p className="bg-[#F7F8F3] p-3 rounded-lg border border-[#E2E8DE] leading-relaxed">
                    "{report.description}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-[#68766C] pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="text-[#397A55]">Fuzzed to 1.1 km centroid</span>
                  </div>
                </CardContent>

                <CardFooter className="py-2.5 px-4 bg-[#F7F8F3] border-t border-[#E2E8DE] flex items-center justify-between">
                  <button
                    onClick={() => handleUpvote(report.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      upvotedIds.has(report.id)
                        ? 'bg-[#397A55] text-white'
                        : 'bg-white text-[#27352D] hover:bg-[#EEF3EA] border border-[#E2E8DE]'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Helpful ({report.upvotes})</span>
                  </button>

                  <button
                    onClick={() => {
                      setReportToFlag(report);
                      setFlagModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] text-[#68766C] hover:text-[#DC2626] transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report / Flag</span>
                  </button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="w-8 h-8 text-[#68766C]" />}
            title="No Community Observations Yet"
            description="Be the first neighbor to post a local environmental observation. Coordinates are automatically quantized to ~1.1 km to protect your household privacy."
            action={
              <Button variant="primary" size="sm" onClick={() => setSubmitModalOpen(true)}>
                Submit First Observation
              </Button>
            }
          />
        )}
      </div>

      {/* Submit Observation Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit Local Environmental Observation"
        size="md"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4">
          {submitError && (
            <Alert variant="danger" title="Submission Error">
              {submitError}
            </Alert>
          )}

          <div className="p-3 bg-[#EEF3EA] rounded-lg border border-[#397A55]/30 text-xs text-[#27352D] space-y-1">
            <span className="font-bold text-[#397A55] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Privacy Guarantee Notice
            </span>
            <p className="text-[#68766C] leading-relaxed">
              Your exact street address and real identity are never broadcast. Coordinates are automatically fuzzed to a ~1.1 km neighborhood centroid ({parseFloat(formLat).toFixed(2)}°N, {parseFloat(formLon).toFixed(2)}°E).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="sub-type"
              label="Observation Category"
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              options={[
                { value: 'VISIBLE_SMOG', label: 'Visible Smog / Dense Haze' },
                { value: 'ACRID_ODOR', label: 'Acrid / Burning Plastic Odor' },
                { value: 'OPEN_BURNING', label: 'Open Biomass or Waste Burning' },
                { value: 'DUST_CONSTRUCTION', label: 'Construction Dust / Roadworks' },
                { value: 'INDUSTRIAL_PLUME', label: 'Industrial Stack Plume' },
                { value: 'WASTE_DUMPING', label: 'Illegal Waste Dumping' },
                { value: 'GREEN_SPACE_IMPROVEMENT', label: 'Green Canopy / Park Quality' },
                { value: 'GENERAL_OBSERVATION', label: 'General Weather / Ventilation Note' },
                { value: 'COMMUNITY_RECOMMENDATION', label: 'Community Tip / Low-Smog Route' },
              ]}
            />

            <Select
              id="sub-sev"
              label="Severity"
              value={formSeverity}
              onChange={(e) => setFormSeverity(e.target.value as any)}
              options={[
                { value: 'MILD', label: 'Mild (Noticeable but low impact)' },
                { value: 'MODERATE', label: 'Moderate (Discomfort / reduced visibility)' },
                { value: 'SEVERE', label: 'Severe (Eye irritation / heavy smoke)' },
              ]}
            />
          </div>

          <Input
            id="sub-neigh"
            label="Neighborhood / Sector / Landmark"
            placeholder="e.g. Sector 18, Indirapuram, or Nehru Park"
            value={formNeighborhood}
            onChange={(e) => setFormNeighborhood(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#27352D] mb-1">
              Description of Local Conditions (Max 1,000 characters)
            </label>
            <textarea
              id="sub-desc"
              rows={4}
              className="w-full rounded-lg border border-[#E2E8DE] p-2.5 text-xs text-[#27352D] focus:border-[#397A55] focus:outline-none focus:ring-1 focus:ring-[#397A55]"
              placeholder="Describe what you see or smell, affected areas, approximate wind direction, or precautions other residents might take..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              maxLength={1000}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8DE]">
            <Button variant="outline" size="sm" type="button" onClick={() => setSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Submit Observation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Flag / Moderation Modal */}
      {reportToFlag && (
        <Modal
          isOpen={flagModalOpen}
          onClose={() => setFlagModalOpen(false)}
          title="Report Inappropriate Community Observation"
          size="sm"
        >
          <form onSubmit={handleFlagReport} className="space-y-4">
            <p className="text-xs text-[#68766C]">
              Help maintain community safety and scientific credibility. Reported observations are reviewed and quarantined.
            </p>

            <Select
              id="fl-reason"
              label="Reason for Report"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              options={[
                { value: 'SPAM_OR_ADVERTISING', label: 'Spam, Commercial Promotion, or Bot' },
                { value: 'INCORRECT_LOCATION', label: 'Incorrect or Fabricated Location' },
                { value: 'OFFENSIVE_LANGUAGE', label: 'Offensive, Harassing, or Abusive' },
                { value: 'MISLEADING_OFFICIAL_CLAIM', label: 'Claims to be Official Regulatory Station' },
                { value: 'OTHER', label: 'Other Violation' },
              ]}
            />

            <div>
              <label className="block text-xs font-semibold text-[#27352D] mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                id="fl-det"
                rows={3}
                className="w-full rounded-lg border border-[#E2E8DE] p-2 text-xs text-[#27352D] focus:border-[#397A55] focus:outline-none"
                placeholder="Explain why this content should be moderated..."
                value={flagDetails}
                onChange={(e) => setFlagDetails(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8DE]">
              <Button variant="outline" size="sm" type="button" onClick={() => setFlagModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit" isLoading={flagging}>
                Submit Report
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
