'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { User, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (!email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage('Password must contain at least one letter and one number.');
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
    <div className="py-12 sm:py-16 md:py-20 bg-[#F7F8F3] min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <Container size="narrow" className="w-full max-w-md">
        <Card className="shadow-sm border-[#E2E8DE] bg-white">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="w-12 h-12 rounded-xl bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              Create Household Account
            </h1>
            <CardDescription className="text-sm text-[#68766C]">
              Join BreatheWise AI to configure your clean air living plan and protect your family from severe urban smog.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
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

              <Input
                id="register-password"
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-[#68766C]" />}
                required
                helperText="Minimum 8 characters with at least one letter and number."
                autoComplete="new-password"
                disabled={loading}
              />

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
              />

              <div className="bg-[#EEF3EA] p-3 rounded-lg text-xs text-[#27352D] space-y-1">
                <span className="font-semibold flex items-center gap-1.5 text-[#397A55]">
                  <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Privacy-by-Design Guarantee:
                </span>
                <p className="text-[#68766C]">
                  Your password is protected using memory-hard scrypt encryption. Household health details are strictly isolated to your verified account.
                </p>
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
                Create Account & Continue
              </Button>

              <div className="text-center text-sm text-[#68766C]">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-[#397A55] hover:underline font-semibold focus-visible:outline-2 focus-visible:outline-[#397A55] rounded"
                >
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </Container>
    </div>
  );
}
