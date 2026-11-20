'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
  CALCULATION_ENGINE_VERSION,
} from '@/services/calculation-engine';
import {
  Activity,
  Plus,
  Download,
  Filter,
  Calendar,
  Layers,
  Leaf,
  Zap,
  Trash2,
  Edit2,
  Info,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Car,
  Recycle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ImpactLog {
  id: string;
  actionType: string;
  title: string;
  date: string;
  co2AvoidedKg: number;
  pm25AvoidedGrams: number;
  distanceShiftedKm: number | null;
  calculationFormula: string;
  uncertaintyMargin: number;
  createdAt: string;
}

interface ImpactAggregates {
  totalCO2AvoidedKg: number;
  totalPM25AvoidedGrams: number;
  totalDistanceShiftedKm: number;
  totalLogsCount: number;
  categoryBreakdown?: Record<string, { count: number; co2Kg: number; pm25Grams: number }>;
}

export function ImpactWorkspace() {
  const [logs, setLogs] = useState<ImpactLog[]>([]);
  const [aggregates, setAggregates] = useState<ImpactAggregates | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('ALL');

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedLogForInspect, setSelectedLogForInspect] = useState<ImpactLog | null>(null);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<ImpactLog | null>(null);

  // Log Form State
  const [logDomain, setLogDomain] = useState<'TRANSPORT' | 'WASTE' | 'ENERGY'>('TRANSPORT');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Transport inputs
  const [transportDistance, setTransportDistance] = useState('12');
  const [transportBaseline, setTransportBaseline] = useState('SOLO_CAR');
  const [transportOptimized, setTransportOptimized] = useState('METRO');

  // Waste inputs
  const [wasteType, setWasteType] = useState('ORGANIC_COMPOSTING');
  const [wasteQuantity, setWasteQuantity] = useState('5');

  // Energy inputs
  const [energyKwh, setEnergyKwh] = useState('15');
  const [energyAction, setEnergyAction] = useState('HEPA_PURIFIER_OPTIMIZATION');

  // Live calculation preview
  const [calcPreview, setCalcPreview] = useState<{
    co2AvoidedKg: number;
    pm25AvoidedGrams: number;
    formula: string;
    uncertainty: number;
    source: string;
  } | null>(null);
  const [savingLog, setSavingLog] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch Logs
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (dateRange !== 'ALL') {
        const now = new Date();
        const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : 90;
        const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        params.append('startDate', past.toISOString());
      }
      params.append('limit', '50');

      const res = await fetch(`/api/impact?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load impact logs');

      setLogs(json.data.logs || []);
      setTotalCount(json.data.totalCount || 0);
      setAggregates(json.data.aggregates || null);
    } catch (err: any) {
      setError(err.message || 'Error fetching impact data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedCategory, dateRange]);

  // Update live preview when inputs change
  useEffect(() => {
    const updatePreview = async () => {
      try {
        let payload: any;
        if (logDomain === 'TRANSPORT') {
          const dist = parseFloat(transportDistance) || 0;
          if (dist <= 0) return;
          payload = {
            domain: 'TRANSPORT',
            distanceKm: dist,
            baselineMode: transportBaseline,
            optimizedMode: transportOptimized,
          };
        } else if (logDomain === 'WASTE') {
          const qty = parseFloat(wasteQuantity) || 0;
          if (qty <= 0) return;
          payload = {
            domain: 'WASTE',
            wasteType,
            quantityKg: qty,
          };
        } else {
          const kwh = parseFloat(energyKwh) || 0;
          if (kwh <= 0) return;
          payload = {
            domain: 'ENERGY',
            kwhSaved: kwh,
            gridRegion: 'INDIA_NATIONAL_GRID',
            actionType: energyAction,
          };
        }

        const res = await fetch('/api/impact/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok && json.data) {
          setCalcPreview({
            co2AvoidedKg: json.data.co2AvoidedKg,
            pm25AvoidedGrams: json.data.pm25AvoidedGrams,
            formula: json.data.calculationFormula,
            uncertainty: json.data.uncertaintyMargin,
            source: json.data.standardReference || 'UK DESNZ / DEFRA / CEA 2024',
          });
        }
      } catch {
        // Silent catch for preview
      }
    };

    updatePreview();
  }, [
    logDomain,
    transportDistance,
    transportBaseline,
    transportOptimized,
    wasteType,
    wasteQuantity,
    energyKwh,
    energyAction,
  ]);

  // Handle Create Log
  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcPreview) return;
    setSavingLog(true);

    try {
      let actionType = 'COMMUTE_SHIFT';
      let title = formTitle.trim();
      let distanceShiftedKm: number | null = null;

      if (logDomain === 'TRANSPORT') {
        actionType = 'COMMUTE_SHIFT';
        if (!title) title = `Clean Transit (${transportBaseline} → ${transportOptimized})`;
        distanceShiftedKm = parseFloat(transportDistance);
      } else if (logDomain === 'WASTE') {
        actionType = 'WASTE_DIVERSION';
        if (!title) title = `Waste Diverted (${wasteType.replace(/_/g, ' ')})`;
      } else {
        actionType = 'ENERGY_SAVING';
        if (!title) title = `Energy Saved (${energyAction.replace(/_/g, ' ')})`;
      }

      const res = await fetch('/api/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          title,
          date: new Date(formDate).toISOString(),
          co2AvoidedKg: calcPreview.co2AvoidedKg,
          pm25AvoidedGrams: calcPreview.pm25AvoidedGrams,
          distanceShiftedKm,
          calculationFormula: calcPreview.formula,
          uncertaintyMargin: calcPreview.uncertainty,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to record impact activity');

      setLogModalOpen(false);
      setFormTitle('');
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Error recording log');
    } finally {
      setSavingLog(false);
    }
  };

  // Handle Delete Log
  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    try {
      const res = await fetch(`/api/impact/${logToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete impact log');
      setDeleteConfirmModalOpen(false);
      setLogToDelete(null);
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Error deleting log');
    }
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      params.append('format', 'csv');

      const res = await fetch(`/api/impact?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `breathewise-impact-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8DE] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
              Personal Impact Tracker
            </h2>
            <Badge variant="accent" size="sm">
              Methodology v{CALCULATION_ENGINE_VERSION}
            </Badge>
          </div>
          <p className="text-xs text-[#68766C] mt-0.5">
            Deterministic avoided emissions and primary particulate matter reduction tracking with zero simulated metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            isLoading={exporting}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setLogModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Log Activity
          </Button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      {aggregates && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-[#E2E8DE]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF3EA] flex items-center justify-center text-[#397A55]">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#68766C] uppercase tracking-wider block">
                  Avoided Carbon
                </span>
                <span className="text-2xl font-extrabold text-[#397A55] font-[var(--font-heading)]">
                  {aggregates.totalCO2AvoidedKg.toFixed(2)} <span className="text-sm font-semibold">kg CO2e</span>
                </span>
                <span className="text-[10px] text-[#68766C] block">UK DEFRA / India CEA benchmark</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8DE]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF3EA] flex items-center justify-center text-[#287A4B]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#68766C] uppercase tracking-wider block">
                  Avoided Particulates
                </span>
                <span className="text-2xl font-extrabold text-[#287A4B] font-[var(--font-heading)]">
                  {aggregates.totalPM25AvoidedGrams.toFixed(2)} <span className="text-sm font-semibold">g PM2.5</span>
                </span>
                <span className="text-[10px] text-[#68766C] block">Primary exhaust & stack prevention</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8DE]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F8F3] flex items-center justify-center text-[#27352D]">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#68766C] uppercase tracking-wider block">
                  Clean Transit Shift
                </span>
                <span className="text-2xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
                  {aggregates.totalDistanceShiftedKm.toFixed(1)} <span className="text-sm font-semibold">km</span>
                </span>
                <span className="text-[10px] text-[#68766C] block">Shifted to low-emission modes</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E2E8DE]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F8F3] flex items-center justify-center text-[#27352D]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#68766C] uppercase tracking-wider block">
                  Logged Actions
                </span>
                <span className="text-2xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
                  {aggregates.totalLogsCount} <span className="text-sm font-semibold">records</span>
                </span>
                <span className="text-[10px] text-[#68766C] block">Audit-verifiable entries</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E2E8DE]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[#68766C] mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {[
            { id: 'ALL', label: 'All Activities' },
            { id: 'COMMUTE_SHIFT', label: 'Transport' },
            { id: 'WASTE_DIVERSION', label: 'Waste' },
            { id: 'ENERGY_SAVING', label: 'Energy' },
            { id: 'HEPA_PURIFICATION', label: 'HEPA Clean Air' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#397A55] text-white'
                  : 'bg-[#F7F8F3] text-[#27352D] hover:bg-[#EEF3EA]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[#68766C] mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Range:
          </span>
          {(['ALL', '90D', '30D', '7D'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                dateRange === range
                  ? 'bg-[#27352D] text-white'
                  : 'bg-[#F7F8F3] text-[#68766C] hover:bg-[#EEF3EA]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Main Historical Table / Feed */}
      <Card className="bg-white border-[#E2E8DE]">
        <CardHeader className="py-3 px-4 border-b border-[#E2E8DE]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#27352D]">
              Historical Audit Trail ({totalCount} entries)
            </CardTitle>
            <span className="text-[11px] text-[#68766C]">
              Strictly authenticated • User data isolation enforced
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : logs.length > 0 ? (
            <div className="divide-y divide-[#E2E8DE]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8F3] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.actionType === 'COMMUTE_SHIFT'
                            ? 'accent'
                            : log.actionType === 'WASTE_DIVERSION'
                            ? 'success'
                            : 'secondary'
                        }
                        size="sm"
                      >
                        {log.actionType.replace(/_/g, ' ')}
                      </Badge>
                      <h4 className="text-sm font-bold text-[#27352D] font-[var(--font-heading)]">
                        {log.title}
                      </h4>
                    </div>
                    <p className="text-xs font-mono text-[#68766C] line-clamp-1">
                      {log.calculationFormula}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-[#68766C]">
                      <span>{new Date(log.date).toLocaleDateString()}</span>
                      {log.distanceShiftedKm && (
                        <>
                          <span>•</span>
                          <span>{log.distanceShiftedKm} km clean transit</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-[#397A55] font-medium">
                        ±{Math.round(log.uncertaintyMargin * 100)}% standard margin
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#397A55] block">
                        +{log.co2AvoidedKg.toFixed(2)} kg CO2e
                      </span>
                      <span className="text-xs font-semibold text-[#287A4B] block">
                        +{log.pm25AvoidedGrams.toFixed(2)} g PM2.5
                      </span>
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#E2E8DE] pl-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLogForInspect(log);
                          setInspectModalOpen(true);
                        }}
                        title="Inspect calculation details"
                      >
                        <Info className="w-4 h-4 text-[#68766C]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLogToDelete(log);
                          setDeleteConfirmModalOpen(true);
                        }}
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4 text-[#DC2626]" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="w-8 h-8 text-[#68766C]" />}
              title="No Impact Entries Found"
              description="No activities recorded for this filter. Log a commute shift, waste diversion, or energy efficiency action to establish your verified audit trail."
              action={
                <Button variant="primary" size="sm" onClick={() => setLogModalOpen(true)}>
                  Log First Activity
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Activity Logger Modal */}
      <Modal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        title="Log Verifiable Environmental Action"
        size="lg"
      >
        <form onSubmit={handleCreateLog} className="space-y-4">
          {/* Domain Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-[#EEF3EA] rounded-lg">
            <button
              type="button"
              onClick={() => setLogDomain('TRANSPORT')}
              className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                logDomain === 'TRANSPORT'
                  ? 'bg-white text-[#397A55] shadow-xs'
                  : 'text-[#68766C] hover:text-[#27352D]'
              }`}
            >
              <Car className="w-3.5 h-3.5" /> Lower-Emission Travel
            </button>
            <button
              type="button"
              onClick={() => setLogDomain('WASTE')}
              className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                logDomain === 'WASTE'
                  ? 'bg-white text-[#397A55] shadow-xs'
                  : 'text-[#68766C] hover:text-[#27352D]'
              }`}
            >
              <Recycle className="w-3.5 h-3.5" /> Waste Diversion
            </button>
            <button
              type="button"
              onClick={() => setLogDomain('ENERGY')}
              className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                logDomain === 'ENERGY'
                  ? 'bg-white text-[#397A55] shadow-xs'
                  : 'text-[#68766C] hover:text-[#27352D]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Energy Efficiency
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="log-title"
              label="Activity Title (Optional)"
              placeholder="e.g. Metro office commute or Compost batch"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
            <Input
              id="log-date"
              type="date"
              label="Date of Action"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            />
          </div>

          {/* Dynamic Domain Inputs */}
          {logDomain === 'TRANSPORT' && (
            <div className="space-y-3 bg-[#F7F8F3] p-3 rounded-xl border border-[#E2E8DE]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  id="tr-dist"
                  type="number"
                  label="Distance (km)"
                  value={transportDistance}
                  onChange={(e) => setTransportDistance(e.target.value)}
                  required
                />
                <Select
                  id="tr-base"
                  label="Replaced Baseline Mode"
                  value={transportBaseline}
                  onChange={(e) => setTransportBaseline(e.target.value)}
                  options={[
                    { value: 'SOLO_CAR', label: 'Solo Petrol Car (171 g/km)' },
                    { value: 'DIESEL_CAR', label: 'Diesel Car (165 g/km)' },
                    { value: 'MOTORCYCLE', label: 'Motorcycle / Scooter (105 g/km)' },
                    { value: 'BUS', label: 'Standard Diesel Bus (89 g/km)' },
                  ]}
                />
                <Select
                  id="tr-opt"
                  label="Low-Emission Shift"
                  value={transportOptimized}
                  onChange={(e) => setTransportOptimized(e.target.value)}
                  options={[
                    { value: 'METRO', label: 'Metro / Rapid Rail (35 g/km)' },
                    { value: 'ELECTRIC_VEHICLE', label: 'Electric Vehicle (52 g/km)' },
                    { value: 'CARPOOL', label: 'Carpool (2+ shared) (85 g/km)' },
                    { value: 'BICYCLE', label: 'Bicycle (0 g/km)' },
                    { value: 'WALK', label: 'Walking (0 g/km)' },
                  ]}
                />
              </div>
            </div>
          )}

          {logDomain === 'WASTE' && (
            <div className="space-y-3 bg-[#F7F8F3] p-3 rounded-xl border border-[#E2E8DE]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  id="ws-type"
                  label="Waste Diversion Type"
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                  options={[
                    { value: 'ORGANIC_COMPOSTING', label: 'Organic Composting (0.48 kg CO2e/kg)' },
                    { value: 'PLASTIC_RECYCLING', label: 'Plastic Recycling (1.25 kg CO2e/kg)' },
                    { value: 'PAPER_CARDBOARD', label: 'Paper & Cardboard (0.95 kg CO2e/kg)' },
                    { value: 'ALUMINUM_RECYCLING', label: 'Aluminum Cans (8.14 kg CO2e/kg)' },
                    { value: 'GLASS_RECYCLING', label: 'Glass Containers (0.28 kg CO2e/kg)' },
                  ]}
                />
                <Input
                  id="ws-qty"
                  type="number"
                  label="Diverted Weight (kg)"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {logDomain === 'ENERGY' && (
            <div className="space-y-3 bg-[#F7F8F3] p-3 rounded-xl border border-[#E2E8DE]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="en-kwh"
                  type="number"
                  label="Electricity Saved (kWh)"
                  value={energyKwh}
                  onChange={(e) => setEnergyKwh(e.target.value)}
                  required
                />
                <Select
                  id="en-act"
                  label="Efficiency Action"
                  value={energyAction}
                  onChange={(e) => setEnergyAction(e.target.value)}
                  options={[
                    { value: 'HEPA_PURIFIER_OPTIMIZATION', label: 'HEPA Purifier Speed Optimization' },
                    { value: 'AC_TEMPERATURE_SETBACK', label: 'AC Temperature Setback (24°C+)' },
                    { value: 'LED_LIGHTING_RETROFIT', label: 'LED Efficient Lighting' },
                    { value: 'ROOFTOP_SOLAR_GENERATION', label: 'Rooftop Solar Displacement' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Mathematical Proof Preview */}
          {calcPreview && (
            <div className="p-3 bg-[#EEF3EA] rounded-xl border border-[#397A55]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#397A55] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Deterministic Calculation Preview
                </span>
                <span className="text-[11px] font-mono text-[#397A55]">
                  ±{(calcPreview.uncertainty * 100).toFixed(0)}% uncertainty
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center py-1">
                <div className="bg-white p-2 rounded-lg border border-[#E2E8DE]">
                  <span className="text-[10px] text-[#68766C] block">Avoided Greenhouse Gas</span>
                  <span className="text-base font-extrabold text-[#397A55]">
                    +{calcPreview.co2AvoidedKg.toFixed(2)} kg CO2e
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#E2E8DE]">
                  <span className="text-[10px] text-[#68766C] block">Primary PM2.5 Prevented</span>
                  <span className="text-base font-extrabold text-[#287A4B]">
                    +{calcPreview.pm25AvoidedGrams.toFixed(2)} g PM2.5
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-mono text-[#27352D] bg-white p-2 rounded border border-[#E2E8DE] break-all">
                {calcPreview.formula}
              </p>
              <span className="text-[10px] text-[#68766C] block">
                Standard: {calcPreview.source}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8DE]">
            <Button variant="outline" size="sm" type="button" onClick={() => setLogModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingLog}>
              Save to Audit Trail
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inspect Calculation Modal */}
      {selectedLogForInspect && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title="Audit Calculation Inspection"
          size="md"
        >
          <div className="space-y-4 text-xs text-[#27352D]">
            <div className="bg-[#F7F8F3] p-3 rounded-lg border border-[#E2E8DE] space-y-1.5">
              <span className="font-bold text-[#27352D] block text-sm">{selectedLogForInspect.title}</span>
              <span className="text-[#68766C]">Action ID: {selectedLogForInspect.id}</span>
              <span className="block text-[#68766C]">
                Logged Date: {new Date(selectedLogForInspect.date).toUTCString()}
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-[#397A55] uppercase tracking-wider block">
                Mathematical Formula
              </span>
              <div className="p-3 bg-[#EEF3EA] rounded-lg font-mono text-xs break-all border border-[#397A55]/30">
                {selectedLogForInspect.calculationFormula}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border border-[#E2E8DE]">
                <span className="text-[#68766C] block">Avoided Carbon</span>
                <span className="text-base font-bold text-[#397A55]">
                  +{selectedLogForInspect.co2AvoidedKg} kg CO2e
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#E2E8DE]">
                <span className="text-[#68766C] block">Avoided PM2.5</span>
                <span className="text-base font-bold text-[#287A4B]">
                  +{selectedLogForInspect.pm25AvoidedGrams} g PM2.5
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-[#E2E8DE] space-y-1">
              <span className="font-bold text-[#27352D] block">Methodological Standards</span>
              <p className="text-[#68766C] leading-relaxed">
                UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors, US EPA WARM v15, and India CEA Baseline Database v19.0.
                Uncertainty margin of ±{Math.round(selectedLogForInspect.uncertaintyMargin * 100)}% reflects regional grid mix and vehicle occupancy bounds.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {logToDelete && (
        <Modal
          isOpen={deleteConfirmModalOpen}
          onClose={() => setDeleteConfirmModalOpen(false)}
          title="Confirm Log Removal"
          size="sm"
        >
          <div className="space-y-3 text-xs text-[#27352D]">
            <p>
              Are you sure you want to remove the record <strong className="font-bold">{logToDelete.title}</strong>?
            </p>
            <p className="text-[#68766C]">
              This action will deduct +{logToDelete.co2AvoidedKg} kg CO2e from your cumulative audit ledger.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8DE]">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteLog}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
