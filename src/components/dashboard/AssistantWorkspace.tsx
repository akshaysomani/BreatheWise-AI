'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { RecommendationCard } from './RecommendationCard';
import {
  Sparkles,
  Send,
  RefreshCw,
  Wind,
  Home,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  HelpCircle,
  Activity,
  CheckCircle2,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  AssistantChatResponse,
  StructuredRecommendation,
  IndoorAdviceInput,
} from '@/lib/validations/assistant.schema';
import { DailyRoutinePlan, IndoorAdviceReport } from '@/lib/ai/types';

interface AssistantWorkspaceProps {
  initialLat?: number;
  initialLon?: number;
  userCity?: string;
}

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  structuredResponse?: AssistantChatResponse;
  timestamp: string;
}

export function AssistantWorkspace({ initialLat, initialLon, userCity }: AssistantWorkspaceProps) {
  // Navigation sub-tabs
  const [activeMode, setActiveMode] = useState<'chat' | 'routine' | 'indoor'>('chat');

  // -------------------------------------------------------------------------
  // 1. Chat State
  // -------------------------------------------------------------------------
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // 2. Daily Routine State
  // -------------------------------------------------------------------------
  const [routinePlan, setRoutinePlan] = useState<DailyRoutinePlan | null>(null);
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const [routineError, setRoutineError] = useState<string | null>(null);
  const [routineVariation, setRoutineVariation] = useState<number>(0);

  const getProvenanceBadgeConfig = (prov: string) => {
    switch (prov) {
      case 'LIVE_OBSERVATION_ADAPTED':
        return { label: 'Live Observation Adapted', variant: 'success' as const };
      case 'HISTORICAL_BASELINE_ADAPTED':
        return { label: 'Historical Baseline Guidance', variant: 'warning' as const };
      case 'PRECAUTIONARY_GUIDANCE':
      case 'PRE_REVIEWED_RULE':
      default:
        return { label: 'Precautionary Advisory', variant: 'accent' as const };
    }
  };

  // -------------------------------------------------------------------------
  // 3. Indoor Advisor State
  // -------------------------------------------------------------------------
  const [indoorForm, setIndoorForm] = useState<IndoorAdviceInput>({
    roomType: 'BEDROOM',
    roomSizeSqFt: 200,
    ceilingHeightFt: 9,
    occupancy: 2,
    hasPurifier: true,
    purifierCADR: 150,
    filterType: 'TRUE_HEPA_H13',
    cookingSource: 'LPG_GAS',
    hasSmoker: false,
    hasIncenseBurning: false,
  });
  const [indoorReport, setIndoorReport] = useState<IndoorAdviceReport | null>(null);
  const [calculatingIndoor, setCalculatingIndoor] = useState(false);
  const [indoorError, setIndoorError] = useState<string | null>(null);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (activeMode === 'chat') {
      chatBottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [messages, isSending, activeMode]);

  // Load initial daily routine on mount
  useEffect(() => {
    fetchDailyRoutine();
    calculateIndoorAdvice();
  }, []);

  // Quick suggestion queries
  const quickPrompts = [
    'Is it safe to go for an outdoor walk this evening?',
    'When should I ventilate my living room today?',
    'How do I size a HEPA purifier for my bedroom?',
    'What commute mode minimizes inhaled particulate dose?',
  ];

  // -------------------------------------------------------------------------
  // Handlers: Chat
  // -------------------------------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isSending) return;

    setChatError(null);
    setInputValue('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'USER',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const payload: any = {
        message: text,
        conversationId: conversationId || undefined,
      };

      if (initialLat !== undefined && initialLon !== undefined) {
        payload.latitude = initialLat;
        payload.longitude = initialLon;
      }

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setChatError(json?.error?.message || 'Failed to receive assistant response.');
        setIsSending(false);
        return;
      }

      const data: AssistantChatResponse & { conversationId: string } = json.data;
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'ASSISTANT',
        content: data.reply,
        structuredResponse: data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setChatError('Network connection error. Please verify your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setChatError(null);
  };

  // -------------------------------------------------------------------------
  // Handlers: Daily Routine
  // -------------------------------------------------------------------------
  const fetchDailyRoutine = async (isRegeneration = false) => {
    setLoadingRoutine(true);
    setRoutineError(null);
    const nextVar = isRegeneration ? (routineVariation + 1) % 3 : routineVariation;
    if (isRegeneration) {
      setRoutineVariation(nextVar);
    }
    try {
      const res = await fetch('/api/assistant/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: initialLat,
          longitude: initialLon,
          locationName: userCity,
          variationIndex: nextVar,
          isRegeneration,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setRoutinePlan(json.data);
      } else {
        setRoutineError(json?.error?.message || 'Could not load daily routine.');
      }
    } catch {
      setRoutineError('Network error while generating daily routine. Please try again.');
    } finally {
      setLoadingRoutine(false);
    }
  };

  // -------------------------------------------------------------------------
  // Handlers: Indoor Advisor
  // -------------------------------------------------------------------------
  const calculateIndoorAdvice = async () => {
    // Client-side validation: reject out-of-range dimensions
    if (indoorForm.roomSizeSqFt < 20 || indoorForm.roomSizeSqFt > 5000) {
      setIndoorError('Room floor area must be between 20 and 5,000 sq ft.');
      return;
    }
    if (indoorForm.ceilingHeightFt < 7 || indoorForm.ceilingHeightFt > 18) {
      setIndoorError('Ceiling height must be between 7 and 18 ft.');
      return;
    }

    setCalculatingIndoor(true);
    setIndoorError(null);
    try {
      const res = await fetch('/api/assistant/indoor-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(indoorForm),
      });

      const json = await res.json();
      if (res.ok) {
        setIndoorReport(json.data);
      } else {
        setIndoorError(json?.error?.message || 'Could not calculate indoor advice.');
      }
    } catch {
      setIndoorError('Network error during indoor calculation.');
    } finally {
      setCalculatingIndoor(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8DE] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#EEF3EA] text-[#397A55] rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              BreatheWise AI Assistant
            </h2>
            <Badge variant="success" size="sm">
              AI Operational
            </Badge>
          </div>
          <p className="text-xs text-[#68766C] max-w-2xl">
            Context-grounded environmental intelligence converting verified ambient measurements,
            household characteristics, and commute routes into defensible, 6-field explainable recommendations.
          </p>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-[#F7F8F3] p-1.5 rounded-lg border border-[#E2E8DE] shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('chat')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeMode === 'chat'
                ? 'bg-[#397A55] text-white shadow-xs'
                : 'text-[#68766C] hover:text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Consultation
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('routine')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeMode === 'routine'
                ? 'bg-[#397A55] text-white shadow-xs'
                : 'text-[#68766C] hover:text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Daily Routine
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('indoor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeMode === 'indoor'
                ? 'bg-[#397A55] text-white shadow-xs'
                : 'text-[#68766C] hover:text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Indoor IAQ Advisor
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODE 1: AI CONSULTATION (CHAT)                                      */}
      {/* =================================================================== */}
      {activeMode === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Workspace (3 Cols) */}
          <div className="lg:col-span-3 flex flex-col h-[700px] bg-white rounded-xl border border-[#E2E8DE] shadow-xs overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-3.5 bg-[#F7F8F3] border-b border-[#E2E8DE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#287A4B] animate-pulse" />
                <span className="text-xs font-bold text-[#27352D] uppercase tracking-wider">
                  Grounding: Zero-Fabrication Guardrails Active
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNewConversation}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                New Chat
              </Button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F7F8F3]/40">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="p-4 bg-[#EEF3EA] text-[#397A55] rounded-full">
                    <Wind className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="text-base font-bold text-[#27352D] font-[var(--font-heading)]">
                      How can BreatheWise AI assist you today?
                    </h3>
                    <p className="text-xs text-[#68766C]">
                      Ask about outdoor walk safety, home cross-ventilation timing, HEPA purifier sizing,
                      or commute exposure. Responses cite verified local measurements and peer-reviewed rules.
                    </p>
                  </div>

                  {/* Starter Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg pt-2">
                    {quickPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(p)}
                        className="p-3 text-left bg-white border border-[#E2E8DE] rounded-lg text-xs font-medium text-[#27352D] hover:border-[#397A55] hover:bg-[#EEF3EA]/50 transition-all shadow-2xs"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'USER' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#68766C]">
                      <span className="font-semibold text-[#27352D]">
                        {msg.role === 'USER' ? 'You' : 'BreatheWise Assistant'}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`rounded-xl p-4 max-w-2xl text-xs leading-relaxed ${
                        msg.role === 'USER'
                          ? 'bg-[#397A55] text-white shadow-xs'
                          : 'bg-white border border-[#E2E8DE] text-[#27352D] shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>

                      {/* Structured Recommendations Cards */}
                      {msg.structuredResponse?.recommendations &&
                        msg.structuredResponse.recommendations.length > 0 && (
                          <div className="mt-4 space-y-3 pt-3 border-t border-[#E2E8DE]">
                            <span className="text-[11px] font-bold text-[#397A55] uppercase tracking-wider block">
                              6-Field Structured Recommendations:
                            </span>
                            {msg.structuredResponse.recommendations.map((rec, rIdx) => (
                              <RecommendationCard key={rIdx} recommendation={rec} />
                            ))}
                          </div>
                        )}

                      {/* Evidence Citations */}
                      {msg.structuredResponse?.evidenceCitations &&
                        msg.structuredResponse.evidenceCitations.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-[#E2E8DE] text-[10px] text-[#68766C]">
                            <span className="font-semibold text-[#27352D]">Authoritative Citations:</span>{' '}
                            {msg.structuredResponse.evidenceCitations.join(' | ')}
                          </div>
                        )}
                    </div>
                  </div>
                ))
              )}

              {/* Thinking / Sending Spinner */}
              {isSending && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#E2E8DE] max-w-xs text-xs text-[#68766C]">
                  <Spinner size="sm" />
                  <span>Synthesizing environmental evidence...</span>
                </div>
              )}

              {chatError && (
                <Alert variant="danger">
                  <div className="flex items-center justify-between text-xs">
                    <span>{chatError}</span>
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      className="underline font-bold ml-2"
                    >
                      Retry
                    </button>
                  </div>
                </Alert>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Composer */}
            <div className="p-4 bg-white border-t border-[#E2E8DE]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question about daily routine, indoor purification, or commute exposure..."
                  disabled={isSending}
                  className="flex-1 text-xs"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSending || !inputValue.trim()}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Send
                </Button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#68766C]">
                <span>Rate limited to 20 requests/min. PII & secrets filtered.</span>
                <span>Press Enter to send</span>
              </div>
            </div>
          </div>

          {/* Environmental Evidence Sidebar (1 Col) */}
          <div className="space-y-4">
            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Active Grounding Context</CardTitle>
                <CardDescription className="text-xs">
                  Verified telemetry used to ground responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-2.5 bg-[#F7F8F3] rounded-lg border border-[#E2E8DE] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#68766C]">Location Target:</span>
                  <p className="font-semibold text-[#27352D]">
                    {userCity || 'Delhi NCR'} {initialLat ? `(${initialLat.toFixed(2)}°N, ${initialLon?.toFixed(2)}°E)` : ''}
                  </p>
                </div>

                <div className="p-2.5 bg-[#EEF3EA] rounded-lg border border-[#397A55]/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#397A55]">Regulatory Standards:</span>
                  <p className="text-[#27352D]">
                    CPCB National AQI piecewise breakpoints with 16h/24h completeness rules.
                  </p>
                </div>

                <div className="p-2.5 bg-[#F7F8F3] rounded-lg border border-[#E2E8DE] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#68766C]">Filtration Design Target:</span>
                  <p className="text-[#27352D]">
                    5.0 Air Changes per Hour (ACH) design target for acute particulate mitigation (CDC / AHAM CADR).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Explainability Safeguards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-[#68766C]">
                <p>• Zero synthetic AQI values or simulated numbers.</p>
                <p>• 6-field explainability contract on every suggestion.</p>
                <p>• Emergency symptoms directed to clinical medical care.</p>
                <p>• Houseplant purification myths explicitly debunked.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 2: PERSONALIZED DAILY ROUTINE                                  */}
      {/* =================================================================== */}
      {activeMode === 'routine' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)]">
                Personalized Air-Quality Daily Action Plan
              </h3>
              <p className="text-xs text-[#68766C]">
                Diurnal pollution windows optimized for morning rush hour, afternoon solar mixing, and evening nocturnal inversions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDailyRoutine(true)}
              disabled={loadingRoutine}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingRoutine ? 'animate-spin' : ''}`} />}
            >
              Regenerate Daily Plan
            </Button>
          </div>

          {routineError && (
            <Alert variant="danger">
              <span>{routineError}</span>
            </Alert>
          )}

          {loadingRoutine ? (
            <div className="p-16 text-center">
              <Spinner size="md" className="mx-auto mb-2" />
              <p className="text-xs text-[#68766C]">Evaluating diurnal boundary layer dispersion models...</p>
            </div>
          ) : routinePlan ? (
            <div className="space-y-4">
              {/* Context Summary Bar */}
              <div className="p-4 bg-[#EEF3EA] rounded-xl border border-[#397A55]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 max-w-xl">
                  <span className="font-bold text-[#397A55] shrink-0">Plan Grounding:</span>
                  <span className="text-[#27352D]">{routinePlan.summary}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={getProvenanceBadgeConfig(routinePlan.provenance).variant} size="sm">
                    {getProvenanceBadgeConfig(routinePlan.provenance).label}
                  </Badge>
                  <span className="text-[#68766C] flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-[#397A55]" />
                    Generated: {new Date(routinePlan.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* 3 Periods: Morning, Afternoon, Evening */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {routinePlan.periods.map((period, idx) => (
                  <Card key={idx} className="bg-white border-[#E2E8DE] flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            period.period === 'MORNING'
                              ? 'warning'
                              : period.period === 'AFTERNOON'
                              ? 'accent'
                              : 'default'
                          }
                          size="sm"
                        >
                          {period.period}
                        </Badge>
                        <span className="text-[11px] font-semibold text-[#68766C]">
                          {period.timeRange}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-bold mt-2">
                        {period.action}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-[#397A55] uppercase block mb-0.5">
                          Scientific Rationale:
                        </span>
                        <p className="text-[#27352D] leading-relaxed">
                          {period.reason}
                        </p>
                      </div>

                      <div className="p-2.5 bg-[#F7F8F3] rounded-lg border border-[#E2E8DE]">
                        <span className="text-[10px] font-bold text-[#68766C] uppercase block mb-0.5">
                          Environmental Evidence:
                        </span>
                        <p className="text-[#27352D]">{period.environmentalEvidence}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[#27352D] uppercase block mb-1">
                          Implementation Steps:
                        </span>
                        <ul className="space-y-1 text-[#68766C]">
                          {period.implementationSteps.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-[#397A55] shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-[#E2E8DE] text-[10px] text-[#68766C] space-y-0.5">
                        <p><span className="font-semibold">Assumptions:</span> {period.assumptions}</p>
                        <p><span className="font-semibold">Uncertainty:</span> {period.uncertainty}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 border-t border-[#E2E8DE] bg-[#F7F8F3] text-[10px] text-[#68766C]">
                      {period.freshnessAndSource}
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {/* Scientific Guidance & Medical Disclaimer */}
              <div className="p-3 bg-[#FAFBF9] rounded-xl border border-[#E2E8DE] text-[11px] text-[#68766C] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#397A55] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {routinePlan.disclaimer}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 3: INDOOR AIR QUALITY ADVISOR                                  */}
      {/* =================================================================== */}
      {activeMode === 'indoor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Calculator Form (1 Col) */}
          <Card className="bg-white border-[#E2E8DE] lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Room IAQ Calculator</CardTitle>
              <CardDescription className="text-xs">
                Configure room dimensions & filtration capacity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#27352D] block mb-1">Room Type</label>
                <select
                  value={indoorForm.roomType}
                  onChange={(e) => setIndoorForm({ ...indoorForm, roomType: e.target.value as any })}
                  className="w-full p-2 border border-[#E2E8DE] rounded-lg text-xs bg-white text-[#27352D]"
                >
                  <option value="BEDROOM">Master Bedroom</option>
                  <option value="LIVING_ROOM">Living Room</option>
                  <option value="CHILD_ROOM">Child / Nursery Room</option>
                  <option value="HOME_OFFICE">Home Office / Study</option>
                  <option value="KITCHEN">Kitchen Area</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#27352D] block mb-1">Floor Area (sq ft)</label>
                <Input
                  type="number"
                  value={indoorForm.roomSizeSqFt}
                  onChange={(e) => setIndoorForm({ ...indoorForm, roomSizeSqFt: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#27352D] block mb-1">Ceiling Height (ft)</label>
                <Input
                  type="number"
                  value={indoorForm.ceilingHeightFt}
                  onChange={(e) => setIndoorForm({ ...indoorForm, ceilingHeightFt: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#27352D] block mb-1">Purifier CADR Rating (CFM)</label>
                <Input
                  type="number"
                  placeholder="0 if no purifier"
                  value={indoorForm.purifierCADR || ''}
                  onChange={(e) => setIndoorForm({ ...indoorForm, purifierCADR: Number(e.target.value) || 0 })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#27352D] block mb-1">Primary Cooking Fuel</label>
                <select
                  value={indoorForm.cookingSource}
                  onChange={(e) => setIndoorForm({ ...indoorForm, cookingSource: e.target.value as any })}
                  className="w-full p-2 border border-[#E2E8DE] rounded-lg text-xs bg-white text-[#27352D]"
                >
                  <option value="LPG_GAS">LPG Gas (Flame combustion)</option>
                  <option value="ELECTRIC_INDUCTION">Electric Induction (Zero emissions)</option>
                  <option value="BIOMASS">Biomass / Wood</option>
                  <option value="OTHER">Other / Electric Coil</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="font-semibold text-[#27352D]">Indoor Incense / Smoking?</span>
                <input
                  type="checkbox"
                  checked={indoorForm.hasIncenseBurning}
                  onChange={(e) => setIndoorForm({ ...indoorForm, hasIncenseBurning: e.target.checked })}
                  className="rounded border-[#E2E8DE] text-[#397A55]"
                />
              </div>

              {indoorError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{indoorError}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                onClick={calculateIndoorAdvice}
                disabled={calculatingIndoor}
                className="w-full mt-3"
              >
                {calculatingIndoor ? 'Recalculating...' : 'Recalculate IAQ Defense'}
              </Button>
            </CardContent>
          </Card>

          {/* Results & Scientific Sizing (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {indoorReport && (
              <>
                {/* CADR Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-white rounded-xl border border-[#E2E8DE] space-y-1">
                    <span className="text-[11px] font-semibold text-[#68766C]">Room Air Volume</span>
                    <div className="text-2xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
                      {indoorReport.cadrAnalysis.roomVolumeCuFt}
                    </div>
                    <span className="text-[10px] text-[#68766C]">cubic feet</span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-[#E2E8DE] space-y-1">
                    <span className="text-[11px] font-semibold text-[#68766C]">Required CADR (5.0 ACH)</span>
                    <div className="text-2xl font-extrabold text-[#397A55] font-[var(--font-heading)]">
                      {indoorReport.cadrAnalysis.requiredCADR_CFM} CFM
                    </div>
                    <span className="text-[10px] text-[#68766C]">({indoorReport.cadrAnalysis.requiredCADR_M3H} m³/h)</span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-[#E2E8DE] space-y-1">
                    <span className="text-[11px] font-semibold text-[#68766C]">Filtration Adequacy</span>
                    <div>
                      <Badge
                        variant={indoorReport.cadrAnalysis.isPurifierAdequate ? 'success' : 'warning'}
                        size="sm"
                      >
                        {indoorReport.cadrAnalysis.isPurifierAdequate
                          ? 'Capacity Adequate'
                          : `Deficit: ${indoorReport.cadrAnalysis.deficitCADR_CFM} CFM`}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-[#68766C]">5.0 ACH design target</span>
                  </div>
                </div>

                {/* Structured Indoor Recommendations */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#27352D]">
                    Targeted Indoor Recommendations
                  </h4>
                  {indoorReport.recommendations.map((rec, idx) => (
                    <RecommendationCard key={idx} recommendation={rec} />
                  ))}
                </div>

                {/* Scientific Myth Debunking Card */}
                <div className="p-4 bg-[#EEF3EA] rounded-xl border border-[#397A55]/20 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#397A55]">
                    <ShieldCheck className="w-4 h-4" />
                    Houseplant Myth Debunking:
                  </div>
                  <p className="text-[#27352D] leading-relaxed">
                    {indoorReport.scientificNotices.plantMythDebunked}
                  </p>
                </div>

                {/* Ventilation Notice */}
                <div className="p-4 bg-[#F7F8F3] rounded-xl border border-[#E2E8DE] space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#27352D]">
                    <Clock className="w-4 h-4 text-[#D69B47]" />
                    Diurnal Ventilation Protocol:
                  </div>
                  <p className="text-[#68766C] leading-relaxed">
                    {indoorReport.scientificNotices.ventilationTiming}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
