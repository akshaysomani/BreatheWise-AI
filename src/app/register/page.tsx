'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import { evaluatePasswordRequirements, SPECIAL_CHAR_REGEX } from '@/lib/validations/password-requirements';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Check,
  Activity,
  Sparkles,
  Wind,
  Home,
  UserPlus,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live password strength & requirement evaluation
  const passwordEvaluation = evaluatePasswordRequirements(password);
  const hasStartedPassword = password.length > 0;
  const hasStartedConfirm = confirmPassword.length > 0;
  const passwordsMatch = hasStartedPassword && password === confirmPassword;
  const isConfirmMismatch = hasStartedConfirm && !passwordsMatch;

  // Form validity (enforces all 5 requirements, matching confirmation, and email)
  const isFormValid =
    email.trim().length > 0 &&
    passwordEvaluation.allMet &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (!email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setErrorMessage('Password must contain at least one uppercase letter (A–Z).');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setErrorMessage('Password must contain at least one lowercase letter (a–z).');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setErrorMessage('Password must contain at least one number (0–9).');
      return;
    }

    if (!SPECIAL_CHAR_REGEX.test(password)) {
      setErrorMessage('Password must contain at least one special character (!@#$%^&*).');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error?.message || 'Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      // Successful registration sets session cookie automatically -> Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 lg:py-16 bg-[#F7F8F3] min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <Container size="default" className="w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
          {/* Left Column: Welcome & Household Introduction (~40%) */}
          <div className="lg:col-span-5 space-y-6 lg:space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EEF3EA] border border-[#D5E2D0] text-[#397A55] text-xs font-semibold tracking-wide">
                <ShieldCheck className="w-4 h-4 text-[#397A55]" aria-hidden="true" />
                <span>BreatheWise Household Protection</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#27352D] font-[var(--font-heading)] leading-[1.15] tracking-tight">
                Create a Healthier Home, Together.
              </h2>

              <p className="text-sm sm:text-base text-[#68766C] leading-relaxed">
                Set up your household account to configure personalized clean-air living plans, monitor room-by-room purification metrics, and shield your family from urban smog.
              </p>
            </div>

            {/* Three Key Benefits */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF3EA] text-[#397A55] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5E2D0]">
                  <ShieldCheck className="w-5 h-5 text-[#397A55]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#27352D] font-[var(--font-heading)]">
                    Personalized clean-air guidance
                  </h3>
                  <p className="text-xs text-[#68766C] mt-0.5 leading-relaxed">
                    Microclimate-aware precautions tailored to family vulnerability, respiratory conditions, and daily activity.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF3EA] text-[#397A55] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5E2D0]">
                  <Activity className="w-5 h-5 text-[#397A55]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#27352D] font-[var(--font-heading)]">
                    Household air-quality awareness
                  </h3>
                  <p className="text-xs text-[#68766C] mt-0.5 leading-relaxed">
                    Track live CPCB regulatory telemetry, PM2.5 concentrations, and indoor CADR deficit room by room.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF3EA] text-[#397A55] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5E2D0]">
                  <Sparkles className="w-5 h-5 text-[#397A55]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#27352D] font-[var(--font-heading)]">
                    Evidence-grounded daily recommendations
                  </h3>
                  <p className="text-xs text-[#68766C] mt-0.5 leading-relaxed">
                    Scientific exposure-reduction routines, HEPA purifier targets, and commute exposure optimization.
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle Coded Environmental & Clean-Air Home SVG Illustration */}
            <div className="hidden sm:block relative rounded-2xl bg-gradient-to-br from-[#EEF3EA] to-[#E2EBDC] border border-[#D5E2D0] p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#397A55] animate-pulse" />
                  <span className="text-xs font-bold text-[#27352D] tracking-wide">
                    Clean Air Flow Dynamics
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/80 text-[11px] font-semibold text-[#397A55] border border-[#D5E2D0]">
                  <Wind className="w-3 h-3 text-[#397A55]" />
                  True HEPA Defense
                </span>
              </div>

              {/* Architectural Environmental SVG */}
              <div className="w-full flex justify-center py-2">
                <svg
                  viewBox="0 0 360 110"
                  className="w-full max-w-[320px] h-auto drop-shadow-xs"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Outdoor smog particles (filtered outside) */}
                  <circle cx="25" cy="35" r="3" fill="#D69B47" opacity="0.6" />
                  <circle cx="45" cy="20" r="2" fill="#D69B47" opacity="0.4" />
                  <circle cx="35" cy="55" r="2.5" fill="#D69B47" opacity="0.5" />
                  <circle cx="55" cy="70" r="3" fill="#D69B47" opacity="0.6" />
                  <circle cx="15" cy="75" r="2" fill="#D69B47" opacity="0.3" />

                  {/* Flow streams into home */}
                  <path
                    d="M 50 35 C 75 35, 85 45, 110 45"
                    stroke="#D69B47"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                  <path
                    d="M 50 55 C 80 55, 90 50, 110 50"
                    stroke="#718C72"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />

                  {/* Filtration Barrier / Shield */}
                  <rect
                    x="110"
                    y="18"
                    width="6"
                    height="74"
                    rx="3"
                    fill="#397A55"
                  />
                  <line
                    x1="113"
                    y1="18"
                    x2="113"
                    y2="92"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />

                  {/* Home Silhouette */}
                  <path
                    d="M 140 45 L 200 15 L 260 45 L 260 95 L 140 95 Z"
                    fill="#FFFFFF"
                    stroke="#397A55"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {/* Roof eaves detail */}
                  <path
                    d="M 132 49 L 200 15 L 268 49"
                    stroke="#397A55"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Home window with pure clean air glow */}
                  <rect
                    x="185"
                    y="45"
                    width="30"
                    height="28"
                    rx="4"
                    fill="#EEF3EA"
                    stroke="#718C72"
                    strokeWidth="1.5"
                  />
                  <line x1="200" y1="45" x2="200" y2="73" stroke="#718C72" strokeWidth="1" />
                  <line x1="185" y1="59" x2="215" y2="59" stroke="#718C72" strokeWidth="1" />

                  {/* Clean Purified Air Waves Inside Home */}
                  <path
                    d="M 145 65 C 160 60, 170 70, 180 65"
                    stroke="#397A55"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 220 65 C 230 60, 240 70, 255 65"
                    stroke="#397A55"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 160 82 C 180 78, 220 78, 240 82"
                    stroke="#397A55"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.8"
                  />

                  {/* Clean air bubbles / oxygen indicators */}
                  <circle cx="170" cy="38" r="2.5" fill="#397A55" opacity="0.6" />
                  <circle cx="230" cy="38" r="3" fill="#397A55" opacity="0.7" />
                  <circle cx="200" cy="85" r="2" fill="#397A55" opacity="0.5" />

                  {/* Safe Household Flora / Air Purifier Silhouette */}
                  <rect x="238" y="75" width="14" height="20" rx="3" fill="#EEF3EA" stroke="#397A55" strokeWidth="1" />
                  <path d="M 245 75 L 245 70" stroke="#397A55" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="245" cy="68" r="2" fill="#397A55" />

                  {/* Clean zone badge */}
                  <g transform="translate(285, 42)">
                    <rect x="0" y="0" width="65" height="26" rx="6" fill="#FFFFFF" stroke="#D5E2D0" strokeWidth="1" />
                    <text x="32" y="16" fill="#397A55" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                      AQI &lt; 50 Clean
                    </text>
                  </g>
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#68766C] pt-1 border-t border-[#D5E2D0]/60">
                <span>External Smog Infiltration Stopped</span>
                <span className="font-semibold text-[#397A55]">99.97% Particulate Capture</span>
              </div>
            </div>
          </div>

          {/* Right Column: Registration Form Card (~60%) */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <Card className="w-full max-w-[640px] shadow-sm border-[#E2E8DE] bg-white rounded-2xl overflow-hidden">
              <CardHeader className="space-y-1.5 pb-5 pt-6 sm:pt-8 px-6 sm:px-8 border-b border-[#F0F4EE]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#397A55] tracking-wide uppercase">
                  <UserPlus className="w-4 h-4 text-[#397A55]" aria-hidden="true" />
                  <span>Household Registration</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)] tracking-tight">
                  Create Household Account
                </h1>
                <CardDescription className="text-sm text-[#68766C] leading-normal">
                  Join BreatheWise AI to configure your clean air living plan and protect your family from severe urban smog.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit} noValidate>
                <CardContent className="space-y-4 pt-6 px-6 sm:px-8">
                  {errorMessage && (
                    <Alert variant="danger" title="Registration Error" role="alert">
                      {errorMessage}
                    </Alert>
                  )}

                  <Input
                    id="register-name"
                    type="text"
                    label="Household Name or Alias"
                    placeholder="e.g. Sharma Family or Akshay"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leftIcon={<User className="w-4 h-4 text-[#68766C]" />}
                    helperText="Optional family identifier displayed on your dashboard."
                    disabled={loading}
                  />

                  <Input
                    id="register-email"
                    type="email"
                    label="Email Address"
                    placeholder="family@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4 text-[#68766C]" />}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />

                  {/* Password Input */}
                  <div className="space-y-1">
                    <Input
                      id="register-password"
                      type="password"
                      label="Password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4 text-[#68766C]" />}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                    />

                    {/* Live Password Requirements Checklist & Strength Meter */}
                    <PasswordChecklist password={password} />
                  </div>

                  {/* Confirm Password Input */}
                  <div className="space-y-1">
                    <Input
                      id="register-confirm-password"
                      type="password"
                      label="Confirm Password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4 text-[#68766C]" />}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      error={isConfirmMismatch ? 'Passwords do not match' : undefined}
                    />

                    {hasStartedConfirm && passwordsMatch && (
                      <p
                        className="text-xs text-[#397A55] font-medium flex items-center gap-1.5 pt-0.5"
                        data-testid="password-match-indicator"
                      >
                        <Check className="w-3.5 h-3.5 text-[#397A55] stroke-[2.5]" aria-hidden="true" />
                        <span>Passwords match</span>
                      </p>
                    )}
                  </div>

                  {/* Privacy-by-Design Guarantee Box */}
                  <div className="bg-[#EEF3EA] p-3.5 rounded-xl border border-[#D5E2D0] text-xs text-[#27352D] space-y-1">
                    <span className="font-semibold flex items-center gap-1.5 text-[#397A55]">
                      <CheckCircle className="w-4 h-4 text-[#397A55]" aria-hidden="true" />
                      Privacy-by-Design Guarantee:
                    </span>
                    <p className="text-[#68766C] leading-relaxed">
                      Your password is protected using memory-hard scrypt encryption. Household health details are strictly isolated to your verified account.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4 pt-4 pb-6 sm:pb-8 px-6 sm:px-8 border-t border-[#F0F4EE]">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className={`w-full transition-all text-base font-semibold py-3 ${
                      !isFormValid ? 'opacity-90' : 'opacity-100 shadow-sm'
                    }`}
                    disabled={loading}
                    aria-disabled={!isFormValid}
                    isLoading={loading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Create Account & Continue
                  </Button>

                  <div className="text-center text-sm text-[#68766C]">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="text-[#397A55] hover:text-[#2F6647] hover:underline font-semibold focus-visible:outline-2 focus-visible:outline-[#397A55] rounded"
                    >
                      Sign In
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
