'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Wind, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { sanitizeReturnUrl } from '@/lib/sanitize-redirect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl');
  const safeReturnUrl = sanitizeReturnUrl(rawReturnUrl);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error?.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      // Successful login -> Redirect to sanitized return URL or dashboard
      router.push(safeReturnUrl);
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm border-[#E2E8DE] bg-white">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="w-12 h-12 rounded-xl bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mx-auto mb-2">
          <Lock className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
          Welcome Back
        </h1>
        <CardDescription className="text-sm text-[#68766C]">
          Sign in to access your family air quality radar and personalized household defense plan.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="danger" title="Authentication Error" role="alert">
              {errorMessage}
            </Alert>
          )}

          <Input
            id="login-email"
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

          <Input
            id="login-password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-[#68766C]" />}
            required
            autoComplete="current-password"
            disabled={loading}
          />

          <div className="flex items-center justify-between text-xs text-[#68766C] pt-1">
            <span className="flex items-center gap-1.5 text-[#397A55]">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Encrypted session
            </span>
            <Link
              href="/register"
              className="text-[#397A55] hover:underline font-semibold focus-visible:outline-2 focus-visible:outline-[#397A55] rounded"
            >
              Need an account?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Dashboard
          </Button>

          <p className="text-xs text-center text-[#68766C]">
            Protected by server-side cryptographic sessions and rate-limited authentication boundaries.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="py-12 sm:py-16 md:py-20 bg-[#F7F8F3] min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <Container size="narrow" className="w-full max-w-md">
        <Suspense fallback={<div className="p-8 text-center text-[#68766C]">Loading sign-in...</div>}>
          <LoginForm />
        </Suspense>
      </Container>
    </div>
  );
}
