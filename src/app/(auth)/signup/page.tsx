'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Please enter a valid email address'),
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function SignupForm() {
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');
  const docType = searchParams.get('doc_type');
  const jurisdiction = searchParams.get('jurisdiction');
  const fromAddress = searchParams.get('address');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  // Store the user's intent so we can redirect after onboarding
  useEffect(() => {
    if (intent === 'generate' && docType) {
      sessionStorage.setItem(
        'reglynx_intent',
        JSON.stringify({
          intent,
          doc_type: docType,
          jurisdiction: jurisdiction || 'federal',
        })
      );
    }
  }, [intent, docType, jurisdiction]);

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            company_name: data.companyName,
            onboarding_complete: true,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Store the scanned address for post-auth redirect
      if (fromAddress) {
        sessionStorage.setItem('reglynx_pending_address', fromAddress);
      }

      setIsSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Coming from scan flow — show simplified copy
  const isScanFlow = !!fromAddress;

  if (isSuccess) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-6 w-6 text-[#059669]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <CardTitle className="text-xl font-semibold text-[#0f172a]">
            Check your email
          </CardTitle>
          <CardDescription className="text-slate-500">
            We&apos;ve sent a confirmation link. Click it to see your full property report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-slate-500">
            Already verified?{' '}
            <Link href="/login" className="font-medium text-[#059669] hover:text-[#047857] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-semibold text-[#0f172a]">
          {isScanFlow ? 'See your full compliance report.' : 'Create your account'}
        </CardTitle>
        {!isScanFlow && (
          <CardDescription className="text-slate-500">
            Start monitoring your properties in minutes
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              {...register('name')}
              className={errors.name ? 'border-red-300 focus-visible:ring-red-200' : ''}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register('email')}
              className={errors.email ? 'border-red-300 focus-visible:ring-red-200' : ''}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-slate-700">Company</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Company or property name"
              autoComplete="organization"
              {...register('companyName')}
              className={errors.companyName ? 'border-red-300 focus-visible:ring-red-200' : ''}
            />
            {errors.companyName && <p className="text-xs text-red-600">{errors.companyName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register('password')}
              className={errors.password ? 'border-red-300 focus-visible:ring-red-200' : ''}
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-700">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-300 focus-visible:ring-red-200' : ''}
            />
            {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0f172a] text-white hover:bg-[#1e293b]"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-center text-xs text-slate-400">
            {isScanFlow ? 'Free. No credit card.' : (
              <>
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-[#059669] hover:text-[#047857] underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div />}>
      <SignupForm />
    </Suspense>
  );
}
