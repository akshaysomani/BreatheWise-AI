'use client';

import React, { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Wind,
  ShieldCheck,
  Home,
  Flame,
  AlertTriangle,
  Sparkles,
  Calculator,
  Leaf,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sun,
  Layers,
} from 'lucide-react';

export default function TipsPage() {
  // CADR Interactive Calculator State
  const [roomLength, setRoomLength] = useState('15');
  const [roomWidth, setRoomWidth] = useState('14');
  const [ceilingHeight, setCeilingHeight] = useState('9.5');
  const [targetACH, setTargetACH] = useState('5.0'); // 5 ACH recommended for high smog

  const lengthNum = parseFloat(roomLength) || 0;
  const widthNum = parseFloat(roomWidth) || 0;
  const heightNum = parseFloat(ceilingHeight) || 0;
  const achNum = parseFloat(targetACH) || 5;

  const floorArea = Math.round(lengthNum * widthNum);
  const roomVolumeCuFt = Math.round(floorArea * heightNum);
  const requiredCADR_CFM = Math.round((roomVolumeCuFt * achNum) / 60);
  const requiredCADR_M3H = Math.round(requiredCADR_CFM * 1.699);

  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3]">
      <Container size="wide" className="space-y-8">
          {/* Header Banner */}
          <div className="border-b border-[#E2E8DE] pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#397A55] text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#397A55]" />
              <span>Evidence-Based Environmental Defense Guide</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              Air Quality & Respiratory Protection Tips
            </h1>
            <p className="text-sm text-[#68766C] mt-1 max-w-3xl">
              Scientific, peer-reviewed strategies to minimize toxic particulate inhalation, optimize mechanical HEPA purification, schedule outdoor activities, and debunk common indoor air quality myths.
            </p>
          </div>

          {/* Interactive HEPA CADR Sizing Tool */}
          <Card className="bg-white border-[#397A55]/30 shadow-sm overflow-hidden">
            <CardHeader className="bg-[#FAFBF9] border-b border-[#E2E8DE]/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#EEF3EA] rounded-lg text-[#397A55]">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-[#27352D]">
                    Mechanical HEPA Clean Air Delivery Rate (CADR) Calculator
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Based on US EPA, CDC, and ASHRAE formulas for acute wildfire smoke and winter particulate smog.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Input
                  id="cadr-length"
                  type="number"
                  label="Room Length (ft)"
                  value={roomLength}
                  onChange={(e) => setRoomLength(e.target.value)}
                />
                <Input
                  id="cadr-width"
                  type="number"
                  label="Room Width (ft)"
                  value={roomWidth}
                  onChange={(e) => setRoomWidth(e.target.value)}
                />
                <Input
                  id="cadr-height"
                  type="number"
                  label="Ceiling Height (ft)"
                  value={ceilingHeight}
                  onChange={(e) => setCeilingHeight(e.target.value)}
                />
                <div>
                  <label className="block text-xs font-semibold text-[#27352D] mb-1">Target ACH</label>
                  <select
                    value={targetACH}
                    onChange={(e) => setTargetACH(e.target.value)}
                    className="w-full text-xs rounded-md border border-[#E2E8DE] bg-white px-3 py-2 text-[#27352D] focus:outline-none focus:ring-1 focus:ring-[#397A55]"
                  >
                    <option value="5.0">5.0 ACH (EPA Winter Smog / Asthma)</option>
                    <option value="4.0">4.0 ACH (Pediatric & Elder Care)</option>
                    <option value="3.0">3.0 ACH (Moderate Urban Baseline)</option>
                    <option value="2.0">2.0 ACH (Light Maintenance)</option>
                  </select>
                </div>
              </div>

              {/* Sizing Results Box */}
              <div className="p-4 bg-[#EEF3EA] rounded-xl border border-[#CDE0D3] grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                <div>
                  <span className="text-xs text-[#556359] block">Room Dimensions & Volume</span>
                  <span className="text-lg font-bold text-[#27352D]">
                    {floorArea} sq ft <span className="text-xs font-normal text-[#68766C]">({roomVolumeCuFt.toLocaleString()} cu ft)</span>
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#556359] block">Minimum Required Purifier CADR</span>
                  <span className="text-2xl font-black text-[#397A55]">
                    {requiredCADR_CFM} <span className="text-sm font-semibold">CFM</span>
                  </span>
                  <span className="text-xs text-[#556359] block">({requiredCADR_M3H} m³/hour rating)</span>
                </div>
                <div className="text-xs text-[#48534C] space-y-1 md:border-l md:border-[#CDE0D3] md:pl-4 flex flex-col justify-center">
                  <p className="font-semibold text-[#27352D]">EPA 2/3 Rule of Thumb:</p>
                  <p>A CADR of {requiredCADR_CFM} CFM guarantees complete room air filtering every {Math.round(60 / achNum)} minutes at continuous operation.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6 Key Environmental Defense Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pillar 1: Diurnal Ventilation Windows */}
            <Card className="bg-white border-[#E2E8DE] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[#397A55] mb-1">
                  <Sun className="w-5 h-5 text-[#D69B47]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Meteorology & Dispersion</span>
                </div>
                <CardTitle className="text-base text-[#27352D]">Diurnal Solar Ventilation Windows</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2.5 flex-1">
                <p>
                  During winter in the Indo-Gangetic Plain, nocturnal thermal inversions trap surface emissions beneath cold, dense air layers. Ground PM2.5 typically peaks from <strong>6:00 AM to 10:00 AM</strong>.
                </p>
                <p>
                  <strong>Golden Ventilation Window:</strong> Between <strong>1:00 PM and 3:30 PM</strong>, maximum solar insolation breaks the inversion layer, creating convective thermal mixing and the cleanest ambient air of the 24-hour cycle.
                </p>
                <div className="p-2.5 bg-[#FAFBF9] rounded-lg border border-[#E2E8DE] font-medium text-[#27352D]">
                  💡 Air out your house briefly (15-20 min) during the early afternoon solar mixing peak, then reseal and run HEPA purifiers.
                </div>
              </CardContent>
            </Card>

            {/* Pillar 2: Certified Respirator Standards */}
            <Card className="bg-white border-[#E2E8DE] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[#397A55] mb-1">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Respiratory PPE</span>
                </div>
                <CardTitle className="text-base text-[#27352D]">N95 / FFP2 Facial Seal Science</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2.5 flex-1">
                <p>
                  Surgical and cloth masks allow 60%–80% of fine aerosolized PM2.5 to bypass through edge leaks. Only certified respirators (<strong>NIOSH N95, EN149 FFP2, or BIS ISI certified</strong>) filter 95%+ of particles down to 0.3 microns.
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55] shrink-0 mt-0.5" />
                    <span>Always mold the adjustable metallic nose clip tight against the nasal bridge.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                    <span><strong>Gas Hazard Warning:</strong> Particulate respirators do NOT filter volatile organic compounds (VOCs), ozone (O3), or carbon monoxide (CO).</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 3: Indoor Combustion Source Control */}
            <Card className="bg-white border-[#E2E8DE] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[#C85A32] mb-1">
                  <Flame className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Source Elimination</span>
                </div>
                <CardTitle className="text-base text-[#27352D]">Indoor Combustion & Cooking Sources</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2.5 flex-1">
                <p>
                  In sealed winter homes, indoor sources often exceed outdoor toxic loads:
                </p>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li><strong>Incense sticks (Agarbatti) & Dhoop:</strong> Burning 1 incense stick emits PM2.5 equivalent to 3–5 cigarettes, accompanied by benzene, formaldehyde, and PAHs.</li>
                  <li><strong>Mosquito coils:</strong> Emit high concentrations of PM2.5 and pyrethroid pesticide residues. Use ultrasonic or physical mesh screens instead.</li>
                  <li><strong>LPG / Gas Cooking:</strong> Produces acute NO2 surges. Always operate high-velocity kitchen range hoods exhausted outside during cooking.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Pillar 4: Myth Debunking — Houseplants */}
            <Card className="bg-white border-[#E2E8DE] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[#397A55] mb-1">
                  <Leaf className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Scientific Myth Debunking</span>
                </div>
                <CardTitle className="text-base text-[#27352D]">The Houseplant Air Cleaning Myth</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2.5 flex-1">
                <div className="flex items-center gap-2 p-2 bg-[#FEE2E2] text-[#A81E1E] rounded-md font-semibold text-[11px]">
                  <XCircle className="w-4 h-4 shrink-0" />
                  Myth: Potted plants clean urban smog in bedrooms.
                </div>
                <p>
                  The oft-quoted 1989 NASA Clean Air Study tested potted plants in <em>hermetically sealed 1-cubic-meter chamber boxes</em> with zero air infiltration over days.
                </p>
                <p>
                  In real-world apartments with typical air infiltration rates (0.5 to 1.5 Air Changes per Hour), peer-reviewed atmospheric studies (Drexel University, 2019) proved that you would need between <strong>10 and 100 plants per square meter</strong> to equal the CADR of even a small mechanical HEPA purifier.
                </p>
                <p className="font-semibold text-[#27352D]">
                  Conclusion: Enjoy plants for aesthetics and psychology, but rely exclusively on certified HEPA filtration for respiratory protection.
                </p>
              </CardContent>
            </Card>

            {/* Pillar 5: Active Commuting vs. Inhaled Dose */}
            <Card className="bg-white border-[#E2E8DE] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[#397A55] mb-1">
                  <Layers className="w-5 h-5 text-[#397A55]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Commute Trade-Offs</span>
                </div>
                <CardTitle className="text-base text-[#27352D]">Minute Ventilation & Inhaled Particulate Dose</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2.5 flex-1">
                <p>
                  A resting person inhales ~6–10 liters of air per minute (Ve). During active walking, ventilation jumps to <strong>20–35 L/min</strong>, and during vigorous cycling, to <strong>45–60 L/min</strong>.
                </p>
                <p>
                  Even though cycling avoids tailpipe carbon emissions, cycling along an urban arterial road at AQI 250 deposits <strong>4x to 6x more toxic PM2.5 mass deep into your alveoli</strong> than taking an air-filtered electric bus or Metro transit.
                </p>
                <div className="p-2.5 bg-[#EEF3EA] rounded-lg border border-[#CDE0D3] font-medium text-[#27352D]">
                  🌿 <strong>BreatheWise Rule:</strong> Never cycle or jog outdoors when AQI exceeds 150. Shift to Metro transit or reschedule exercise indoors.
                </div>
              </CardContent>
            </Card>

            {/* Pillar 6: Pediatric & Infant Vulnerability */}
            <Card className="bg-white border-[#E2E8DE] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-[#D69B47] mb-1">
                  <AlertTriangle className="w-5 h-5 text-[#D69B47]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Vulnerable Care</span>
                </div>
                <CardTitle className="text-base text-[#27352D]">Pediatric & Maternal Defense Tier</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-2.5 flex-1">
                <p>
                  Children breathe 50% more air per kilogram of body weight than adults and possess narrower airway diameters, making particulate obstruction far more severe.
                </p>
                <p>
                  <strong>Stroller Height Zone:</strong> Exhaust particulates (PM2.5, black carbon, NOx) concentrate heavily within 1 meter of ground level. Strollers pushed along arterial roads expose infants to up to 60% higher pollutant concentrations than adults walking upright.
                </p>
                <p>
                  During high AQI days, keep strollers off main roadways and ensure infant sleeping spaces operate HEPA purifiers continuously.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
    </div>
  );
}
