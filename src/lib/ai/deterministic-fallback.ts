import {
  AssistantChatResponse,
  StructuredRecommendation,
  IndoorAdviceInput,
  RoutineGenerateInput,
} from '@/lib/validations/assistant.schema';
import {
  AiContextPayload,
  DailyRoutinePlan,
  IndoorAdviceReport,
} from './types';
import { householdService } from '@/services/household.service';
import { routineService } from '@/services/routine.service';
import { impactService } from '@/services/impact.service';

/**
 * BreatheWise AI — Pre-Reviewed Deterministic Environmental Safety Engine
 * 
 * ROLE:
 * When external Generative AI providers (e.g., Google Gemini) are unconfigured, rate-limited,
 * or unreachable, this deterministic rules engine evaluates environmental context using
 * formulaic, peer-reviewed environmental and respiratory guidelines.
 * 
 * PROVENANCE: Strictly labeled as PRE_REVIEWED_RULE or CALCULATED_ESTIMATE.
 * NEVER fabricates an AQI or pretends to be an ungrounded generative LLM.
 */

export const deterministicFallbackEngine = {
  /**
   * Generates a deterministic conversational response based on environmental context,
   * query keywords, and optional multi-turn conversation history.
   */
  generateChatResponse(
    query: string,
    payload: AiContextPayload,
    conversationHistory?: Array<{ role: string; content: string }>
  ): AssistantChatResponse {
    const q = query.toLowerCase().trim();
    const env = payload.environment;
    const house = payload.household;
    const aqi = env.aqi;
    const isUnhealthy = aqi !== null && aqi > 100;
    const isSevere = aqi !== null && aqi > 250;
    const hasData = env.status === 'AVAILABLE' && aqi !== null;

    let reply = '';
    const recommendations: StructuredRecommendation[] = [];
    const citations: string[] = ['CPCB NAQI Technical Guidelines (2014)', 'US EPA Wildfire Smoke IAQ Guidance'];

    // 1. Check for urgent medical symptoms
    if (
      q.includes('chest pain') ||
      q.includes('cannot breathe') ||
      q.includes('severe asthma') ||
      q.includes('blue lips') ||
      q.includes('emergency') ||
      q.includes('heart attack') ||
      q.includes('fainted') ||
      q.includes('unconscious')
    ) {
      reply =
        'CRITICAL HEALTH ALERT: If you or a family member are experiencing acute respiratory distress, severe wheezing, chest pain, or difficulty speaking, please call emergency medical services immediately (e.g., India\'s Emergency Response Support System at 112). Environmental adjustments cannot substitute for emergency clinical care.';
      recommendations.push({
        action: 'Seek Immediate Emergency Medical Attention',
        reason:
          'Acute bronchospasm or cardiovascular symptoms during smog events require emergency pharmacotherapy and supplemental oxygen.',
        expectedBenefit: 'Immediate clinical stabilization and prevention of life-threatening respiratory failure.',
        measurableImpact: 'Clinical emergency triage.',
        assumptions: 'Severe acute distress reported by user.',
        uncertainty: 'Clinical triage required by licensed physicians.',
        category: 'DAILY_ROUTINE',
        priority: 'HIGH',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Call local emergency services (112 in India) or proceed to the nearest emergency medical facility immediately.',
          'Administer prescribed quick-relief inhaler (e.g., Albuterol/Salbutamol) as directed by doctor.',
          'Remain seated upright in a sealed room with active mechanical HEPA filtration.',
        ],
        disclaimer: 'BreatheWise AI does not provide emergency medical diagnosis.',
        evidenceStrength: 'PRECAUTIONARY_GUIDELINE',
        provenance: 'PRE_REVIEWED_RULE',
      });
      return {
        reply,
        recommendations,
        contextSummary: {
          aqiStatus: env.status,
          aqiValue: env.aqi,
          aqiCategory: env.category,
          dominantPollutant: env.dominantPollutant,
          provenance: env.provenance,
          isLive: env.isLive,
          observationTimeUtc: env.observationTimeUtc,
          coarseLocation: house.coarseLocation,
          vulnerabilityTier: house.vulnerabilityTier,
        },
        evidenceCitations: citations,
        disclaimer:
          'Emergency health guidance. Consult emergency medical professionals immediately.',
      };
    }

    // 2. Outdoor Physical Activity: Walk, Run, Exercise, Jog, Cycling, Marathon, Outside
    if (
      q.includes('walk') ||
      q.includes('run') ||
      q.includes('jog') ||
      q.includes('exercise') ||
      q.includes('cycling') ||
      q.includes('outside') ||
      q.includes('gym') ||
      q.includes('marathon') ||
      q.includes('stroll')
    ) {
      if (!hasData) {
        reply =
          'Localized air quality monitoring telemetry is currently unavailable for your exact location. When outdoor conditions are unverified, respiratory health guidelines advise avoiding heavy cardiovascular exertion outdoors during early morning and late evening winter hours when thermal inversion traps ground-level particulates.';
        recommendations.push({
          action: 'Shift High-Intensity Workouts Indoors or to Midday',
          reason:
            'Winter thermal inversions trap primary particulate emissions near the surface before sunrise and after sunset.',
          expectedBenefit: 'Reduces inhaled minute ventilation volume in unverified ambient air.',
          measurableImpact: 'Avoids ~30-50% elevated peak ground-level particulate exposure.',
          assumptions: 'Urban winter smog inversion dynamics.',
          uncertainty: 'Exact ground concentrations unmeasured without live telemetry.',
          category: 'DAILY_ROUTINE',
          priority: 'MEDIUM',
          timeOfDay: 'MORNING',
          implementationSteps: [
            'Exercise in a sealed indoor room with an active mechanical HEPA air cleaner.',
            'If walking outdoors, choose midday windows when solar heating breaks boundary inversion.',
            'Wear a certified, well-fitted particulate respirator (N95, N99, or FFP2) with an airtight seal if outdoor air is hazy. Note: Particulate respirators filter aerosols (PM2.5/PM10) only and DO NOT protect against toxic combustion gases (CO, NO2, ozone). Thin consumer carbon layers do not provide certified chemical gas protection.',
          ],
          disclaimer: 'Precautionary guideline due to missing local telemetry.',
          evidenceStrength: 'PRECAUTIONARY_GUIDELINE',
          provenance: 'PRE_REVIEWED_RULE',
        });
      } else if (isSevere) {
        reply = `Outdoor air quality is currently in the ${env.category} category (AQI ${aqi}, dominant pollutant: ${env.dominantPollutant}). Heavy outdoor physical exertion is strongly discouraged under CPCB public health advisories. At this pollution density, active breathing deposits fine particulate deep into alveolar tissue.`;
        recommendations.push({
          action: 'Cancel Outdoor Exercise and Remain in Filtered Indoor Spaces',
          reason: `Ambient AQI ${aqi} falls in the ${env.category} category under CPCB guidelines. Elevated minute ventilation during aerobic exercise drastically increases inhaled particulate dose.`,
          expectedBenefit: 'Avoids acute inflammatory pulmonary response and airway hyper-reactivity.',
          measurableImpact: 'Substantially reduces acute particulate inhalation dose compared to outdoor exercise (CPCB Health Advisory).',
          assumptions: 'Minute ventilation Ve = 45 L/min during running; user has access to an indoor space with mechanical filtration.',
          uncertainty: 'Individual respiratory sensitivity and building envelope leakage vary.',
          category: 'DAILY_ROUTINE',
          priority: 'HIGH',
          timeOfDay: 'ALL_DAY',
          implementationSteps: [
            'Move workouts indoors to a room with an active True HEPA air purifier.',
            'Keep doors and windows firmly sealed against ambient particulate ingress.',
            'If outdoor transit is unavoidable, wear a certified, well-fitted particulate respirator (N95, N99, or FFP2) with an airtight facial seal. Important: Particulate respirators filter solid and liquid aerosols (PM2.5 and PM10) only, and DO NOT protect against toxic combustion gases or vapors (such as carbon monoxide, nitrogen dioxide, or ozone). Thin consumer carbon layers do not provide certified chemical gas protection. When gaseous pollution is high, avoiding exposure and staying indoors is the only effective defense.',
            'Vulnerable members (asthmatic, pediatric, senior) should stay strictly indoors. If acute respiratory distress occurs, contact emergency medical care.',
          ],
          disclaimer: 'Guidance based on CPCB NAQI health advisory criteria.',
          evidenceStrength: 'MEASURED_OBSERVATION',
          provenance: 'PRE_REVIEWED_RULE',
        });
      } else if (isUnhealthy) {
        reply = `Air quality is currently ${env.category} (AQI ${aqi}). Sensitive groups should avoid prolonged outdoor exertion, and general individuals should reduce high-intensity outdoor workouts.`;
        recommendations.push({
          action: 'Limit Outdoor Exertion to Short Light Walks',
          reason: `Moderate-to-high particulate levels (AQI ${aqi}) trigger airway irritation in vulnerable individuals.`,
          expectedBenefit: 'Reduces cumulative respiratory exposure during peak pollution hours.',
          measurableImpact: 'Lowers inhaled dose compared to high-intensity cardiovascular training.',
          assumptions: 'Normal adult minute ventilation of 12-15 L/min for light walking.',
          uncertainty: 'Local traffic microclimates can exhibit higher curbside peaks.',
          category: 'DAILY_ROUTINE',
          priority: 'MEDIUM',
          timeOfDay: 'AFTERNOON',
          implementationSteps: [
            'Schedule walks between 12:00 PM and 3:00 PM when vertical atmospheric mixing is strongest.',
            'Avoid busy roadway corridors and idling traffic intersections.',
            'Wear a certified, well-fitted particulate respirator (N95, N99, or FFP2) with an airtight facial seal. Important: Particulate respirators filter solid and liquid aerosols (PM2.5 and PM10) only, and DO NOT protect against toxic combustion gases or vapors (such as carbon monoxide, nitrogen dioxide, or ozone). Thin consumer carbon layers do not provide certified chemical gas protection.',
          ],
          disclaimer: 'Based on current ambient telemetry.',
          evidenceStrength: 'MEASURED_OBSERVATION',
          provenance: 'PRE_REVIEWED_RULE',
        });
      } else {
        reply = `Air quality is currently ${env.category} (AQI ${aqi}). Outdoor activities and walks are generally safe for the general population.`;
        recommendations.push({
          action: 'Proceed with Normal Outdoor Routine',
          reason: `Ambient air quality is within the ${env.category} range.`,
          expectedBenefit: 'Cardiovascular benefit of physical exercise without elevated acute particulate exposure.',
          measurableImpact: 'Safe ambient outdoor recreation.',
          assumptions: 'Stable atmospheric conditions.',
          uncertainty: 'Wind shifts or point-source emissions may cause localized variations.',
          category: 'DAILY_ROUTINE',
          priority: 'LOW',
          timeOfDay: 'ALL_DAY',
          implementationSteps: ['Enjoy outdoor activity while monitoring for sudden evening smog accumulation.'],
          disclaimer: 'CPCB Good/Satisfactory criteria.',
          evidenceStrength: 'MEASURED_OBSERVATION',
          provenance: 'PRE_REVIEWED_RULE',
        });
      }
    }

    // 3. Houseplants Air Purification Myth Debunking
    else if (
      q.includes('plant') ||
      q.includes('plants') ||
      q.includes('houseplant') ||
      q.includes('snake plant') ||
      q.includes('areca') ||
      q.includes('spider plant') ||
      q.includes('money plant') ||
      q.includes('nasa clean air')
    ) {
      citations.push('Waring et al. (2019) Potted Plants & IAQ Review', 'NASA Clean Air Study (1989)');
      reply =
        'Scientific Reality on Houseplants: Potted plants alone have a negligible effect on urban smog or residential PM2.5. The widely quoted 1989 NASA study was conducted inside tiny, hermetically sealed 1-cubic-meter chamber boxes with zero air exchange. In actual apartments with typical ventilation rates (0.5 to 1.5 Air Changes per Hour), peer-reviewed atmospheric studies show you would need between 10 and 100 plants per square meter to match the cleaning rate of even a modest mechanical HEPA filter. Enjoy plants for biophilic aesthetics, but rely exclusively on certified True HEPA purifiers for particulate health defense.';

      recommendations.push({
        action: 'Deploy True HEPA Mechanical Filtration Over Houseplants for Smog Defense',
        reason:
          'Peer-reviewed indoor air chemistry demonstrates potted houseplants yield CADR < 0.05 CFM in dynamic residential airflows, which is mathematically insufficient to clear infiltrating ambient particulate matter.',
        expectedBenefit: 'Guaranteed 99.97% physical particle clearance of aerosolized PM2.5 and allergen mass down to 0.3 microns.',
        measurableImpact: 'Delivers 150-300 CFM CADR vs <0.05 CFM per houseplant.',
        assumptions: 'Residential space with natural building infiltration rate >= 0.5 ACH.',
        uncertainty: 'Plant species variation is clinically irrelevant at residential air infiltration scales.',
        category: 'INDOOR_PURIFICATION',
        priority: 'HIGH',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Size your mechanical air purifier to deliver at least 4.5 to 5.0 Air Changes per Hour for your bedroom.',
          'Ensure the purifier utilizes a genuine True HEPA (H13 or H14) certified filter cartridge.',
          'Position the purifier away from walls to ensure unimpeded 360-degree intake circulation.',
        ],
        disclaimer: 'Evidence based on Drexel University and ASHRAE peer-reviewed indoor air studies.',
        evidenceStrength: 'MEASURED_OBSERVATION',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 4. Mask & Respirator Selection & Effectiveness
    else if (
      q.includes('mask') ||
      q.includes('respirator') ||
      q.includes('n95') ||
      q.includes('n99') ||
      q.includes('ffp2') ||
      q.includes('cloth mask') ||
      q.includes('surgical mask') ||
      q.includes('which mask')
    ) {
      citations.push('NIOSH Respirator Standards (42 CFR Part 84)', 'BIS IS 9473 Indian Respirator Standards');
      reply =
        'Respirator Selection Protocol: For urban particulate smog (PM2.5), standard cloth masks and loose surgical masks are ineffective, allowing 60%–80% of fine particles to leak around the edges. You need a certified particulate respirator (NIOSH N95, EN 149 FFP2, or BIS ISI certified). Crucial Safety Limitation: Particulate respirators filter solid and liquid aerosols (PM2.5 and PM10) only; they DO NOT filter toxic combustion gases such as carbon monoxide (CO), nitrogen dioxide (NO2), or ground-level ozone. Thin consumer carbon layers in commercial masks provide odor suppression only, not certified industrial gas protection. When gaseous pollutants are severe, staying indoors with mechanical filtration is the only reliable defense.';

      recommendations.push({
        action: 'Deploy Certified N95 / FFP2 Particulate Respirator with Airtight Facial Seal',
        reason:
          'Electrostatic meltblown filter media in certified N95/FFP2 respirators captures >= 95% of 0.3-micron particles. An airtight perimeter seal is essential; facial hair or improper nose clips degrade filtration efficiency by over 50%.',
        expectedBenefit: 'Reduces inhaled particulate mass by over 90% during unavoidable outdoor transit.',
        measurableImpact: 'Filtration efficiency >= 95% for aerosolized PM2.5 when properly fitted.',
        assumptions: 'User has clean-shaven contact points and conforms the metallic nose clip tightly.',
        uncertainty: 'Consumer respirators do NOT protect against toxic combustion gases (NO2, CO, Ozone).',
        category: 'DAILY_ROUTINE',
        priority: 'HIGH',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Select a certified respirator labeled NIOSH N95, EN 149 FFP2, or BIS IS 9473.',
          'Position both headbands or ear loops properly and mold the flexible metallic nose clip firmly over the nasal bridge.',
          'Perform a user seal check: exhale gently; if air escapes along mask edges, readjust tension.',
          'Discard and replace disposable respirators when breathing resistance increases or after 40 cumulative hours of urban smog exposure.',
        ],
        disclaimer: 'Particulate respirators filter aerosols only, not toxic combustion gases.',
        evidenceStrength: 'MEASURED_OBSERVATION',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 5. Vulnerable Groups: Pediatric, Infant, Maternal, Asthmatic, Elderly
    else if (
      q.includes('child') ||
      q.includes('children') ||
      q.includes('baby') ||
      q.includes('babies') ||
      q.includes('infant') ||
      q.includes('kid') ||
      q.includes('kids') ||
      q.includes('pregnant') ||
      q.includes('pregnancy') ||
      q.includes('elderly') ||
      q.includes('senior') ||
      q.includes('asthma') ||
      q.includes('asthmatic') ||
      q.includes('copd') ||
      q.includes('bronchitis')
    ) {
      citations.push('WHO Air Quality & Child Health Guidelines (2018)', 'CPCB Vulnerable Population Protocol');
      reply =
        'Vulnerable Population Defense Plan: Children, pregnant mothers, seniors, and individuals with asthma are disproportionately vulnerable during smog events. Children breathe approximately 50% more air per kilogram of body weight than adults and have narrower airways. Furthermore, stroller-height transit (under 1 meter from the road) concentrates heavy vehicular exhaust (black carbon, NOx, ultrafine particulates) up to 60% higher than adult breathing height. Seniors and cardiac patients face elevated risk of acute vascular inflammation and ischemic events. Vulnerable groups must strictly curtail outdoor exertion and sleep in spaces with continuous True HEPA air cleaning.';

      recommendations.push({
        action: 'Enforce Pediatric & Respiratory Vulnerability Defense Tier',
        reason:
          'Elevated minute ventilation ratios in children and chronic airway hyper-responsiveness in asthma amplify the toxic burden of fine particulates by 2-3x compared to healthy adults.',
        expectedBenefit: 'Prevents acute bronchospasm, asthma flare-ups, and systemic vascular inflammation.',
        measurableImpact: 'Eliminates high-density curbside particulate inhalation.',
        assumptions: 'Household has access to sealed indoor quarters with mechanical HEPA filtration.',
        uncertainty: 'Individual respiratory threshold and bronchial reactivity vary.',
        category: 'DAILY_ROUTINE',
        priority: 'HIGH',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Keep children indoors during morning and late-evening thermal inversion smog peaks (before 11 AM and after 5 PM).',
          'Avoid pushing strollers along busy arterial roadways or idling school drop-off zones.',
          'Ensure continuous mechanical HEPA filtration in children\'s and seniors\' bedrooms targeting 5.0 Air Changes per Hour.',
          'Verify quick-relief bronchodilator inhalers are non-expired and immediately accessible for asthmatic members.',
        ],
        disclaimer: 'Precautionary respiratory health protocol. Consult pediatrician or pulmonologist for medical plans.',
        evidenceStrength: 'PRECAUTIONARY_GUIDELINE',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 6. AQI Meaning, Scale, and Category Inquiries
    else if (
      q.includes('what does aqi') ||
      q.includes('aqi mean') ||
      q.includes('aqi score') ||
      q.includes('aqi scale') ||
      q.includes('aqi value') ||
      q.includes('what is aqi') ||
      q.includes('what is the aqi') ||
      q.includes('aqi 1') ||
      q.includes('aqi 2') ||
      q.includes('aqi 3') ||
      q.includes('aqi 4') ||
      q.includes('aqi 5') ||
      q.includes('is aqi') ||
      (q.includes('aqi') && (q.includes('good') || q.includes('poor') || q.includes('severe') || q.includes('safe') || q.includes('danger') || q.includes('category')))
    ) {
      citations.push('CPCB National Air Quality Index Technical Report (2014)');
      reply = `Understanding the Indian National Air Quality Index (NAQI): The CPCB NAQI is a 0–500 scale that translates complex multi-pollutant concentrations into 6 clear health categories: Good (0–50), Satisfactory (51–100), Moderately Polluted (101–200), Poor (201–300), Very Poor (301–400), and Severe (401–500). The index is governed by the "Max-Operator Rule" — whichever criteria pollutant has the highest calculated sub-index becomes the dominant pollutant governing the overall AQI. ${
        hasData
          ? `Current local telemetry indicates an AQI of ${aqi} (${env.category}, dominant pollutant: ${env.dominantPollutant}).`
          : 'Live monitoring data is currently being ingested or unconfigured for your station.'
      }`;

      recommendations.push({
        action: 'Align Daily Schedule with Statutory CPCB NAQI Thresholds',
        reason:
          'NAQI breakpoints represent clinical and epidemiological thresholds of respiratory irritation and cardiovascular risk established by the Ministry of Environment, Forest & Climate Change (MoEFCC).',
        expectedBenefit: 'Eliminates ungrounded guesswork and ties physical outdoor exposure to statutory safety tiers.',
        measurableImpact: 'Protective exposure scheduling.',
        assumptions: 'Observational data corresponds to CPCB criteria pollutant sub-indices.',
        uncertainty: 'Short-term 1-hour sensor proxy readings may fluctuate faster than regulatory 24-hour averages.',
        category: 'DAILY_ROUTINE',
        priority: 'MEDIUM',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'AQI 0–100: Safe for normal outdoor recreation and exercise.',
          'AQI 101–200: Sensitive groups (asthma, children, seniors) should limit prolonged outdoor exertion.',
          'AQI 201–300 (Poor): General public should avoid strenuous outdoor exertion; use certified N95 respirators near roads.',
          'AQI 301–500 (Very Poor / Severe): Stay indoors with mechanical True HEPA air filtration. Avoid non-essential outdoor travel.',
        ],
        disclaimer: 'Statutory breakpoints defined in MoEFCC CPCB NAQI Report (2014).',
        evidenceStrength: 'MEASURED_OBSERVATION',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 7. Criteria Pollutants: PM2.5, PM10, NO2, Ozone, SO2, CO
    else if (
      q.includes('pm2.5') ||
      q.includes('pm10') ||
      q.includes('pm 2.5') ||
      q.includes('particulate') ||
      q.includes('no2') ||
      q.includes('nitrogen dioxide') ||
      q.includes('ozone') ||
      q.includes('o3') ||
      q.includes('carbon monoxide') ||
      q.includes('so2') ||
      q.includes('pollutant')
    ) {
      citations.push('CPCB NAQI Technical Report (2014)', 'WHO Global Air Quality Guidelines (2021)');
      reply =
        'Criteria Pollutant Dynamics: Urban air pollution consists of distinct particulate and gaseous fractions. PM2.5 refers to fine particles with an aerodynamic diameter under 2.5 micrometers. Unlike larger PM10 which is largely trapped in nasal passages, PM2.5 bypasses the mucociliary escalator, penetrates into the deep alveoli, and crosses into the bloodstream, triggering vascular inflammation. Nitrogen Dioxide (NO2) is a pungent combustion gas emitted primarily from diesel and petrol engines, inducing direct bronchial constriction. Ground-level Ozone (O3) forms photochemically in sunny afternoon heat and acts as a strong respiratory oxidant.';

      recommendations.push({
        action: 'Implement Fraction-Specific Particulate & Gaseous Defenses',
        reason:
          'Mechanical True HEPA filters capture solid particulates (PM2.5/PM10) with 99.97% efficiency, but do not adsorb reactive gases like NO2 or Ozone without thick activated carbon beds.',
        expectedBenefit: 'Targeted mitigation matching the specific physical and chemical state of the pollutant.',
        measurableImpact: 'Aerosol mass reduction > 90% via HEPA.',
        assumptions: 'Dominant pollutant identified from CAAQMS telemetry.',
        uncertainty: 'Microclimates near major roadways have higher localized NO2 and black carbon spikes.',
        category: 'INDOOR_PURIFICATION',
        priority: 'HIGH',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'For PM2.5 spikes: Maintain continuous mechanical HEPA filtration in sealed rooms.',
          'For NO2 / Vehicle Exhaust: Avoid ground-floor roadside exposure; keep car windows closed on recirculation mode.',
          'For Ozone spikes: Postpone outdoor afternoon aerobic workouts; ground-level ozone peaks between 1:00 PM and 4:00 PM in intense sunlight.',
        ],
        disclaimer: 'Environmental pollutant guidance based on CPCB and WHO toxicological profiles.',
        evidenceStrength: 'MEASURED_OBSERVATION',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 8. Indoor Combustion: Incense, Agarbatti, Dhoop, Mosquito Coils, Cooking
    else if (
      q.includes('incense') ||
      q.includes('agarbatti') ||
      q.includes('dhoop') ||
      q.includes('mosquito') ||
      q.includes('cooking') ||
      q.includes('gas stove') ||
      q.includes('lpg') ||
      q.includes('frying') ||
      q.includes('candle')
    ) {
      citations.push('LBNL Indoor Environment Group Research', 'Lin et al. (2008) Incense Smoke Exposure');
      reply =
        'Indoor Source Elimination Protocol: In sealed homes, indoor combustion sources frequently exceed outdoor toxic levels. Burning a single stick of incense (agarbatti) or dhoop generates particulate mass equivalent to smoking 3 to 5 cigarettes, accompanied by carcinogenic polycyclic aromatic hydrocarbons (PAHs), formaldehyde, and benzene. Mosquito coils emit high densities of fine particles and volatile pyrethroid pesticide residues. Unvented LPG gas cooking generates acute spikes of nitrogen dioxide (NO2) exceeding 400 µg/m³. Source elimination is always more effective than filtration alone.';

      recommendations.push({
        action: 'Eliminate Indoor Combustion and Exhaust Gas Cooking Byproducts',
        reason:
          'Eliminating indoor smoke sources removes the heaviest indoor particulate and VOC emissions before they saturate room air or overwhelm HEPA purifier capacity.',
        expectedBenefit: 'Prevents acute indoor PM2.5 spikes of 200–500 µg/m³ generated by indoor burning.',
        measurableImpact: 'Cuts indoor particulate and NO2 sources at origin.',
        assumptions: 'Dwelling has an operable exterior-vented kitchen exhaust fan.',
        uncertainty: 'Charcoal range hood recirculators do not vent gaseous combustion products.',
        category: 'INDOOR_PURIFICATION',
        priority: 'HIGH',
        timeOfDay: 'EVENING',
        implementationSteps: [
          'Completely cease burning incense sticks, dhoop, and mosquito coils in residential rooms.',
          'Use physical window mesh screens, electric vaporizers, or ultrasonic diffusers instead of burning coils.',
          'Always turn on your kitchen exhaust fan 1 minute prior to igniting gas burners, and keep it running for 5 minutes post-cooking.',
          'Prefer back burners under the exhaust hood where containment efficiency is highest (up to 70%).',
        ],
        disclaimer: 'Guidance based on Lawrence Berkeley National Laboratory indoor air quality studies.',
        evidenceStrength: 'MEASURED_OBSERVATION',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 9. Acute Smog Symptoms: Burning Eyes, Cough, Throat Irritation
    else if (
      q.includes('eye') ||
      q.includes('burning') ||
      q.includes('throat') ||
      q.includes('cough') ||
      q.includes('headache') ||
      q.includes('irritat') ||
      q.includes('sneeze') ||
      q.includes('itch') ||
      q.includes('tearing')
    ) {
      citations.push('AIIMS Delhi Environmental Medicine Advisory', 'CPCB Health Advisories');
      reply =
        'Smog Irritation Symptom Protocol: Eye burning, throat irritation, persistent dry cough, and sinus congestion are direct physical reactions to acidic particulate matter and oxidants (NOx, SO2, formaldehyde) adhering to sensitive corneal and mucous epithelial tissue. Non-clinical comfort measures include using preservative-free lubricating artificial tear eye drops, saline nasal rinses to clear trapped particulates, staying well hydrated, and remaining strictly in clean, filtered indoor air. If symptoms progress to difficulty breathing, chest tightness, or wheezing, seek medical attention immediately.';

      recommendations.push({
        action: 'Mitigate Acute Mucosal & Ocular Particulate Irritation',
        reason:
          'Particulate aerosols deposit directly on moist mucous membranes. Flushing with sterile saline clears accumulated particulate mass and soothes inflamed tissue.',
        expectedBenefit: 'Relieves acute ocular burning and clears particulate deposits from nasal passages.',
        measurableImpact: 'Symptomatic comfort and exposure cessation.',
        assumptions: 'Mild environmental irritation; no underlying infection or acute bronchospasm.',
        uncertainty: 'Pre-existing allergies or dry-eye syndrome can heighten sensitivity.',
        category: 'DAILY_ROUTINE',
        priority: 'MEDIUM',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Wash face and eyes with cool clean water after returning from outdoors.',
          'Use over-the-counter preservative-free lubricating eye drops to soothe stinging or dryness.',
          'Perform a gentle isotonic saline nasal rinse or steam inhalation to loosen trapped particulates.',
          'Stay indoors in a sealed room with an active True HEPA air purifier to give respiratory tissue time to recover.',
        ],
        disclaimer: 'Comfort hygiene recommendations, not medical diagnosis or prescription.',
        evidenceStrength: 'PRECAUTIONARY_GUIDELINE',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 10. Ventilation & Air Purifiers / CADR
    else if (
      q.includes('ventilate') ||
      q.includes('window') ||
      q.includes('purifier') ||
      q.includes('hepa') ||
      q.includes('cadr') ||
      q.includes('indoor') ||
      q.includes('air cleaner') ||
      q.includes('filter') ||
      q.includes('cfm') ||
      q.includes('ach')
    ) {
      citations.push('ASHRAE Standard 62.2 Ventilation Standards', 'CDC Clean Air in Buildings Challenge');

      if (isSevere || isUnhealthy) {
        reply = `With outdoor air quality in the ${env.category} bracket (AQI ${aqi ?? 'elevated'}), natural window ventilation will drive particulate pollution indoors. Maintain closed windows and operate your HEPA air filtration system continuously.`;
        recommendations.push({
          action: 'Keep Windows Sealed and Operate HEPA Filtration at 5.0 ACH Design Target',
          reason: `Outdoor PM2.5 rapidly infiltrates unsealed windows (typical infiltration factors of 0.5-0.8), rapidly elevating indoor particulate concentrations.`,
          expectedBenefit: `Maintains indoor particulate baseline below ambient levels through continuous recirculating filtration.`,
          measurableImpact: `${house.requiredCADR_CFM ?? 200} CFM clean air delivery recommended for your room volume based on a 5.0 ACH design target.`,
          assumptions: 'Selected 5.0 ACH engineering design target for acute particulate/smoke mitigation (referenced in CDC / AHAM CADR guidelines); 9 ft ceiling height.',
          uncertainty: 'Actual clean-air delivery depends on air cleaner placement, fan speed, filter loading, and room envelope leakage.',
          category: 'INDOOR_PURIFICATION',
          priority: 'HIGH',
          timeOfDay: 'ALL_DAY',
          implementationSteps: [
            'Keep all exterior windows and balconies firmly closed.',
            `Run your True HEPA filter continuously on medium-high speed (target ${house.requiredCADR_CFM ?? 200} CFM).`,
            'Avoid indoor combustion sources (incense sticks, mosquito coils, unventilated frying).',
          ],
          disclaimer: 'Guidance based on AHAM CADR sizing criteria and CDC Clean Air in Buildings Challenge recommendations.',
          evidenceStrength: hasData ? 'MEASURED_OBSERVATION' : 'PRECAUTIONARY_GUIDELINE',
          provenance: 'PRE_REVIEWED_RULE',
        });
      } else {
        reply = `Outdoor air quality is currently ${env.category} (AQI ${aqi ?? 'moderate'}). You may perform brief cross-ventilation during peak afternoon dispersion (1:00 PM – 3:00 PM), followed by closing windows and running your HEPA filter to flush indoor CO2 while trapping particulates.`;
        recommendations.push({
          action: 'Perform Controlled Midday Cross-Ventilation (20-30 Minutes)',
          reason: 'Dilutes indoor bioeffluents and carbon dioxide while outdoor particulate density is relatively diluted.',
          expectedBenefit: 'Reduces indoor CO2 below 800 ppm without severe particulate contamination.',
          measurableImpact: '1-2 air exchanges of fresh air.',
          assumptions: 'Afternoon solar boundary layer depth provides optimal diurnal dispersion.',
          uncertainty: 'Localized smoke plumes from neighborhood cooking or trash burning may interfere.',
          category: 'INDOOR_PURIFICATION',
          priority: 'MEDIUM',
          timeOfDay: 'AFTERNOON',
          implementationSteps: [
            'Open opposing windows for 20-30 minutes between 1:00 PM and 3:00 PM.',
            'Close windows securely as soon as ambient traffic intensifies in the late afternoon.',
            'Run HEPA air purifier on high for 30 minutes after closing windows to scrub introduced particulates.',
          ],
          disclaimer: 'Ventilation timing rule for urban environments.',
          evidenceStrength: 'ESTIMATED_MODEL',
          provenance: 'PRE_REVIEWED_RULE',
        });
      }
    }

    // 11. Commute & Travel
    else if (
      q.includes('commute') ||
      q.includes('travel') ||
      q.includes('metro') ||
      q.includes('bus') ||
      q.includes('car') ||
      q.includes('route') ||
      q.includes('traffic') ||
      q.includes('transit')
    ) {
      citations.push('UK DEFRA / DESNZ 2024 Greenhouse Gas Conversion Factors');
      reply =
        'For urban travel, vehicle choice directly influences both your personal inhaled particulate dose and your household carbon footprint. Sealed electric mass transit (Metro) delivers the optimal combination of clean indoor air and low emissions.';

      recommendations.push({
        action: 'Prioritize Sealed Underground Metro Over Open Roadway Commuting',
        reason:
          'Underground metro coaches utilize recirculating HVAC filtration with secondary dust filters, reducing commuter particulate exposure by 40-70% compared to curbside bus or motorcycle travel.',
        expectedBenefit: 'Cuts inhaled PM2.5 dose by ~64% and eliminates vehicle tailpipe emissions.',
        measurableImpact: 'Avoids ~0.136 kg CO2e per passenger-km shifted from solo car to electric metro.',
        assumptions: 'Average urban commute; solo petrol car baseline (0.171 kg CO2/km) vs metro (0.035 kg CO2/km).',
        uncertainty: '±15% uncertainty due to vehicle occupancy and grid electricity emission intensity.',
        category: 'COMMUTE_PLAN',
        priority: isSevere ? 'HIGH' : 'MEDIUM',
        timeOfDay: 'MORNING',
        implementationSteps: [
          'Plan travel using the nearest operational Metro rail corridor.',
          'If driving is unavoidable, set vehicle climate control to strict "Recirculation Mode" to block exterior exhaust ingestion.',
          'Avoid motorcycle or open-auto travel during peak morning rush hour when diesel particulate concentration peaks.',
        ],
        disclaimer: 'DEFRA benchmark transit emissions factors.',
        evidenceStrength: 'ESTIMATED_MODEL',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 12. Multi-Turn Follow-Up Query Resolution
    else if (
      conversationHistory &&
      conversationHistory.length > 0 &&
      (q.includes('more') ||
        q.includes('explain') ||
        q.includes('what else') ||
        q.includes('why') ||
        q.includes('elaborate') ||
        q.includes('tell me more') ||
        q.includes('and then') ||
        q.length < 25)
    ) {
      reply = `Continuing our consultation: Regarding your follow-up query, the key next step is tightening indoor source controls and maintaining disciplined filtration schedules. ${
        hasData
          ? `With current AQI at ${aqi} (${env.category}), your top exposure risk remains outdoor particulate infiltration during peak traffic hours.`
          : 'Consistently applying preventive environmental barriers provides maximum health resilience.'
      }`;

      recommendations.push({
        action: 'Execute Step-by-Step Household Respiratory Defense Audit',
        reason:
          'Systematic verification of door sealing, filter airflow, and cooking ventilation achieves up to 80% indoor exposure reduction compared to ambient levels.',
        expectedBenefit: 'Maintains sustained clean indoor air protection and prevents cumulative particulate exposure.',
        measurableImpact: 'Target indoor PM2.5 < 25 µg/m³.',
        assumptions: 'User is refining earlier recommendations.',
        uncertainty: 'Microclimatic changes and neighborhood building density.',
        category: 'DAILY_ROUTINE',
        priority: 'MEDIUM',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Verify bedroom window weather-stripping to minimize ambient draft infiltration.',
          'Check HEPA air filter pre-screens for accumulated dust and vacuum if needed.',
          'Keep your certified N95 respirator near the doorway for essential errands.',
        ],
        disclaimer: 'Continuous exposure optimization guidance.',
        evidenceStrength: 'PRECAUTIONARY_GUIDELINE',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    // 13. Default Context-Grounded Guidance
    else {
      reply = `Hello! I am your BreatheWise AI environmental health assistant. ${
        hasData
          ? `Current local air quality is ${env.category} (AQI ${aqi}, dominant pollutant: ${env.dominantPollutant}).`
          : 'Continuous monitoring telemetry is currently operating on regional baseline standards.'
      } You can ask me about outdoor walk schedules, HEPA purifier CADR sizing, certified N95 masks, pediatric air defense, or low-emission commute alternatives.`;

      recommendations.push({
        action: 'Review Household Air Quality Defense Checklist',
        reason: 'Proactive indoor source control and filtration sizing prevent up to 80% of preventable respiratory particulate exposure.',
        expectedBenefit: 'Maintains clean indoor air baseline regardless of outdoor ambient fluctuations.',
        measurableImpact: 'Protective baseline establishment.',
        assumptions: 'Residential urban dwelling.',
        uncertainty: 'Specific home layout and window tightness.',
        category: 'DAILY_ROUTINE',
        priority: 'MEDIUM',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Verify your household CADR rating meets 4.5 to 5.0 Air Changes per Hour for your living quarters.',
          'Switch kitchen cooking exhaust to high during LPG or induction frying.',
          'Keep a certified particulate respirator (N95, N99, or FFP2) ready for mandatory outdoor transit during smog alerts (particulate filtration only; does not protect against toxic gases).',
        ],
        disclaimer: 'Standard BreatheWise environmental hygiene principles.',
        evidenceStrength: 'PRECAUTIONARY_GUIDELINE',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    return {
      reply,
      recommendations,
      contextSummary: {
        aqiStatus: env.status,
        aqiValue: env.aqi,
        aqiCategory: env.category,
        dominantPollutant: env.dominantPollutant,
        provenance: env.provenance,
        isLive: env.isLive,
        observationTimeUtc: env.observationTimeUtc,
        coarseLocation: house.coarseLocation,
        vulnerabilityTier: house.vulnerabilityTier,
      },
      evidenceCitations: citations,
      disclaimer:
        'BreatheWise AI recommendations are environmental and exposure-reduction guidance, not clinical medical advice. Consult healthcare providers for individual diagnosis or treatment.',
    };
  },

  /**
   * Generates a personalized 3-period daily routine (morning, afternoon, evening).
   */
  generateDailyRoutine(
    payload: AiContextPayload,
    options?: RoutineGenerateInput
  ): DailyRoutinePlan {
    const env = payload.environment;
    const house = payload.household;
    const aqi = env.aqi;
    const isElevated = aqi === null || aqi > 100;
    const targetDate = options?.targetDate || new Date().toISOString().split('T')[0];

    const periods: DailyRoutinePlan['periods'] = [
      {
        period: 'MORNING',
        timeRange: '06:00 AM – 11:00 AM',
        action: isElevated
          ? 'Exercise Indoors & Commute in Sealed Cabin (Metro/Recirculating Car)'
          : 'Normal Outdoor Commute & Morning Walk Permitted',
        reason: isElevated
          ? 'Morning surface temperature inversions trap diesel particulate and biomass smoke at human breathing height.'
          : 'Ambient air quality meets safe baseline criteria for morning physical activity.',
        environmentalEvidence:
          env.status === 'AVAILABLE' && aqi !== null
            ? `Current AQI: ${aqi} (${env.category}, dominant: ${env.dominantPollutant})`
            : 'Localized telemetry unverified; precautionary morning inversion protocol applied.',
        expectedBenefit: isElevated
          ? 'Avoids peak ground-level particulate accumulation during rush hour.'
          : 'Cardiovascular benefit of brisk morning exercise.',
        implementationSteps: [
          'Keep home windows sealed shut during morning traffic peak.',
          'Run mechanical HEPA filter in bedrooms and living spaces.',
          'If commuting, set car ventilation to recirculate or board air-filtered metro.',
        ],
        assumptions: 'Diurnal boundary layer dynamics in urban centers.',
        uncertainty: 'Wind velocity and morning fog thickness cause localized variations.',
        freshnessAndSource: env.status === 'AVAILABLE' ? `Source: ${env.provenance}` : 'Heuristic Model',
      },
      {
        period: 'AFTERNOON',
        timeRange: '12:00 PM – 04:00 PM',
        action:
          aqi !== null && aqi <= 100
            ? 'Conditional Midday Cross-Ventilation (15–20 Mins if Verified Clean)'
            : 'Maintain Closed Windows and Continuous HEPA Air Filtration',
        reason:
          aqi !== null && aqi <= 100
            ? 'Solar convective mixing expands vertical atmospheric boundary layer, diluting ground concentrations to daily minimum. Safe to exchange air only because ambient AQI is verified <= 100.'
            : 'Ambient pollution levels exceed safe ventilation thresholds (AQI > 100 or unverified); opening windows will introduce heavy particulate and gaseous contaminants.',
        environmentalEvidence:
          env.status === 'AVAILABLE' && aqi !== null
            ? `Midday ventilation evaluated against current AQI ${aqi} (threshold: AQI <= 100).`
            : 'Ambient telemetry unverified or elevated; maintaining sealed envelope.',
        expectedBenefit:
          aqi !== null && aqi <= 100
            ? 'Flushes accumulated indoor carbon dioxide and VOCs without particulate ingress.'
            : `Protects indoor PM2.5 below ${house.indoorPM25Target} µg/m³ by preventing outdoor contaminant penetration.`,
        implementationSteps: [
          aqi !== null && aqi <= 100
            ? 'Open opposing windows for 15-20 minutes to achieve cross-ventilation, provided outdoor air is visibly clear and local AQI <= 100.'
            : 'Keep all exterior windows and doors hermetically sealed.',
          aqi !== null && aqi <= 100
            ? 'Verify outdoor ozone levels are not elevated during peak afternoon sunlight.'
            : 'Run mechanical True HEPA air purifier on continuous medium setting.',
          'Close windows promptly before 4:00 PM as ambient traffic increases and evening cooling begins.',
        ],
        assumptions: 'Thermal buoyancy peaks during solar zenith; ambient AQI <= 100 required for window opening.',
        uncertainty: 'Curbside vehicle exhaust or neighborhood biomass burning can spike local concentrations even if regional AQI is moderate.',
        freshnessAndSource: env.status === 'AVAILABLE' ? `Source: ${env.provenance}` : 'Heuristic Model',
      },
      {
        period: 'EVENING',
        timeRange: '05:00 PM – 10:00 PM',
        action: 'Seal Bedroom Windows & Engage HEPA Purifier in Sleep Mode at 5.0 ACH',
        reason:
          'Evening cooling collapses the atmospheric boundary layer, concentrating traffic exhaust and heating smoke overnight.',
        environmentalEvidence:
          env.status === 'AVAILABLE' && aqi !== null
            ? `Anticipated nocturnal inversion; baseline AQI ${aqi}.`
            : 'Evening nocturnal inversion standard protocol.',
        expectedBenefit: `Guarantees 8 hours of clean, restorative sleep air with PM2.5 < ${house.indoorPM25Target} µg/m³.`,
        implementationSteps: [
          'Close bedroom doors and windows firmly.',
          `Turn HEPA purifier on continuous medium or whisper-quiet sleep mode (target CADR ${house.requiredCADR_CFM ?? 200} CFM).`,
          'Avoid burning candles, incense sticks, or mosquito repellents in sleeping quarters.',
        ],
        assumptions: 'Occupant spends 7-8 hours in sleeping quarters.',
        uncertainty: 'Bedroom door opening frequency affects continuous filtration efficiency.',
        freshnessAndSource: env.status === 'AVAILABLE' ? `Source: ${env.provenance}` : 'Heuristic Model',
      },
    ];

    return {
      title: `Personalized Air-Quality Daily Action Plan (${targetDate})`,
      targetDate,
      summary: `Tailored daily routine designed for ${house.vulnerabilityLabel} with ${
        house.hasHEPAFilter ? 'active mechanical HEPA filtration' : 'standard residential ventilation'
      }. Prioritizes clean air during diurnal pollution peaks.`,
      periods,
      provenance: 'PRE_REVIEWED_RULE',
      generatedAt: new Date().toISOString(),
      contextSummary: {
        aqi: env.aqi,
        category: env.category,
        dominantPollutant: env.dominantPollutant,
        vulnerabilityTier: house.vulnerabilityTier,
      },
      disclaimer:
        'Conditional daily guidance based on atmospheric diurnal patterns. If outdoor conditions rapidly worsen, prioritize remaining indoors with mechanical air filtration.',
    };
  },

  /**
   * Generates structured indoor air quality advisor recommendations.
   */
  generateIndoorAdvice(
    input: IndoorAdviceInput,
    payload: AiContextPayload
  ): IndoorAdviceReport {
    const cadr = householdService.calculateCadrRequirements(
      input.roomSizeSqFt,
      input.ceilingHeightFt,
      input.purifierCADR || null,
      5.0 // Acute smog target ACH
    );

    const recommendations: StructuredRecommendation[] = [];

    // CADR recommendation
    if (!cadr.isCurrentPurifierAdequate) {
      recommendations.push({
        action: `Upgrade or Augment HEPA Filtration by ${cadr.deficitCADR_CFM} CFM`,
        reason: `Your room volume (${cadr.roomVolumeCuFt} cu ft) requires at least ${cadr.requiredCADR_CFM} CFM (${cadr.requiredCADR_M3H} m³/h) to achieve a 5.0 Air Changes per Hour (ACH) design target for acute particulate mitigation.`,
        expectedBenefit: `Accelerates indoor airborne fine particulate clearance during acute ambient smog episodes.`,
        measurableImpact: `Current rated capacity: ${input.purifierCADR || 0} CFM. Deficit to close: ${cadr.deficitCADR_CFM} CFM (${Math.round(cadr.deficitCADR_CFM * 1.69901)} m³/h).`,
        assumptions: 'Selected 5.0 ACH design target for acute particulate/smoke mitigation (referenced in CDC / AHAM CADR guidelines); room volume ' + cadr.roomVolumeCuFt + ' cu ft.',
        uncertainty: 'Real-world clean-air delivery varies with fan speed setting, filter dust loading, and room air mixing.',
        category: 'INDOOR_PURIFICATION',
        priority: 'HIGH',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          `Deploy a mechanical True HEPA air cleaner rated at >= ${cadr.requiredCADR_CFM} CFM for this room.`,
          'Place purifier centrally away from walls and curtains to maximize 360-degree intake circulation.',
          'Operate purifier on medium-high speed during periods of active room occupancy.',
        ],
        disclaimer: 'Calculated using AHAM CADR sizing criteria with a 5.0 ACH particulate mitigation design target. 5.0 ACH is an engineering design target, not a universal legal mandate.',
        evidenceStrength: 'ESTIMATED_MODEL',
        provenance: 'CALCULATED_ESTIMATE',
      });
    } else {
      recommendations.push({
        action: 'Maintain Current HEPA Purifier Operating Schedule',
        reason: `Your current purifier capacity (${input.purifierCADR} CFM) meets the required ${cadr.requiredCADR_CFM} CFM for a 5.0 Air Changes per Hour design target in this space.`,
        expectedBenefit: 'Maintains clean indoor air baseline and prevents particulate buildup.',
        measurableImpact: `Provides ${cadr.actualACHWithCurrentPurifier} ACH (target 5.0 ACH).`,
        assumptions: 'Filter is clean and within manufacturer replacement intervals.',
        uncertainty: 'Filter loading over 6+ months reduces actual air delivery rate by 15-25%.',
        category: 'INDOOR_PURIFICATION',
        priority: 'MEDIUM',
        timeOfDay: 'ALL_DAY',
        implementationSteps: [
          'Inspect pre-filter monthly and vacuum lint/hair buildup.',
          'Replace H13 True HEPA filter cartridge every 6 to 12 months depending on ambient smog density.',
        ],
        disclaimer: 'Calculated using AHAM CADR sizing criteria with a 5.0 ACH particulate mitigation design target.',
        evidenceStrength: 'ESTIMATED_MODEL',
        provenance: 'CALCULATED_ESTIMATE',
      });
    }

    // Source controls
    const sourceControls: string[] = [];

    if (input.cookingSource === 'LPG_GAS' || input.cookingSource === 'BIOMASS') {
      sourceControls.push(
        'Operate kitchen range hood / exhaust fan whenever gas burners are ignited to vent nitrogen dioxide (NO2) and carbon monoxide (CO).'
      );
      recommendations.push({
        action: 'Mitigate Gas Cooking Combustion Byproducts',
        reason:
          'Unvented combustion of LPG gas produces peak indoor NO2 concentrations up to 400-600 µg/m³, exceeding WHO guidelines and triggering airway hyper-reactivity.',
        expectedBenefit: 'Reduces indoor NO2 and ultrafine particle exposure by 60-80% during cooking.',
        measurableImpact: 'Lowers acute kitchen peak NO2 below 100 µg/m³.',
        assumptions: 'Exhaust fan flow rate >= 150 CFM vented to outdoors.',
        uncertainty: 'Recirculating charcoal hoods do not remove gaseous NO2.',
        category: 'INDOOR_PURIFICATION',
        priority: 'HIGH',
        timeOfDay: 'EVENING',
        implementationSteps: [
          'Turn on kitchen exhaust fan 1 minute before lighting burners, and leave on 5 minutes post-cooking.',
          'Use back burners preferentially where range hood capture efficiency is highest (up to 70% vs 30% on front burners).',
          'Cover pots with lids during simmering to reduce moisture and particle dispersion.',
        ],
        disclaimer: 'LBNL Indoor Environment Group gas cooking research.',
        evidenceStrength: 'PRECAUTIONARY_GUIDELINE',
        provenance: 'PRE_REVIEWED_RULE',
      });
    }

    if (input.hasIncenseBurning || input.hasSmoker) {
      sourceControls.push(
        'Eliminate indoor combustion (incense, dhoop, scented candles, smoking). A single incense stick emits as much particulate matter as 3-5 cigarettes.'
      );
    }

    return {
      roomType: input.roomType,
      cadrAnalysis: {
        roomVolumeCuFt: cadr.roomVolumeCuFt,
        targetACH: cadr.targetACH,
        requiredCADR_CFM: cadr.requiredCADR_CFM,
        requiredCADR_M3H: cadr.requiredCADR_M3H,
        isPurifierAdequate: cadr.isCurrentPurifierAdequate,
        deficitCADR_CFM: cadr.deficitCADR_CFM,
      },
      recommendations,
      sourceControls,
      scientificNotices: {
        plantMythDebunked: cadr.scientificPlantNotice,
        standardsProvenance: cadr.standardsNote,
        ventilationTiming:
          'Cross-ventilate only during peak solar afternoon hours (12:00 PM - 3:00 PM) when outdoor PM2.5 is lowest. Keep windows tightly sealed during morning and evening rush hours.',
      },
      generatedAt: new Date().toISOString(),
      disclaimer:
        'Indoor air calculations use AHAM CADR volumetric formulas with a 5.0 ACH acute particulate mitigation design target. Mechanical HEPA filtration is essential for particulate defense.',
    };
  },
};
