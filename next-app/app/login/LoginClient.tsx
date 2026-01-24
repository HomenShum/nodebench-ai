'use client';

import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export function LoginClient() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sendingLink, setSendingLink] = useState(false);

  const isValidEmail = (s: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(s.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);
    formData.set('flow', flow);

    try {
      await signIn('password', formData);
      window.location.href = '/research';
    } catch (error: any) {
      let toastTitle = '';
      if (error.message?.includes('Invalid password')) {
        toastTitle = 'Invalid password. Please try again.';
      } else {
        toastTitle =
          flow === 'signIn'
            ? "Could not sign in, did you mean to sign up?"
            : "Could not sign up, did you mean to sign in?";
      }
      toast.error(toastTitle);
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    void signIn('google', {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + '/research' : '/research',
    });
  };

  const handleMagicLink = async () => {
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSendingLink(true);
    try {
      await signIn('email', {
        email,
        redirectTo: typeof window !== 'undefined' ? window.location.origin : '/',
      });
      toast.success('Magic link sent! Check your email.');
    } catch (error) {
      toast.error('Failed to send magic link');
    } finally {
      setSendingLink(false);
    }
  };

  const handleAnonymousSignIn = () => {
    void signIn('anonymous');
    window.location.href = '/research';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {flow === 'signIn' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-gray-600 mt-1">
            {flow === 'signIn'
              ? 'Sign in to continue to NodeBench AI'
              : 'Get started with NodeBench AI'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {flow === 'signIn' ? 'Sign In' : 'Sign Up'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Toggle Flow */}
            <div className="text-center text-sm text-gray-600">
              {flow === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => setFlow(flow === 'signIn' ? 'signUp' : 'signIn')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {flow === 'signIn' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social / Alternative Login */}
          <div className="space-y-3">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 font-medium">Google</span>
            </button>

            {/* Magic Link */}
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={sendingLink || !isValidEmail(email)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingLink ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mail className="h-5 w-5 text-gray-600" />
              )}
              <span className="text-gray-700 font-medium">
                {sendingLink ? 'Sending...' : 'Email me a sign-in link'}
              </span>
            </button>

            {/* Anonymous */}
            <button
              type="button"
              onClick={handleAnonymousSignIn}
              className="w-full py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By signing in, you agree to our{' '}
          <Link href="#" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="#" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
