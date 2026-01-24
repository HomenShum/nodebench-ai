'use client';

import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import Link from 'next/link';
import {
  Loader2,
  User,
  Mail,
  Calendar,
  Settings,
  LogOut,
  Shield,
  Bell,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

export function ProfileClient() {
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  const { signOut } = useAuthActions();

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isAnonymous = !user?.email;

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const menuItems = [
    {
      icon: <User className="h-5 w-5" />,
      label: 'Profile Settings',
      description: 'Update your personal information',
      href: '/settings',
    },
    {
      icon: <Bell className="h-5 w-5" />,
      label: 'Notifications',
      description: 'Manage your notification preferences',
      href: '/settings',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      label: 'Security',
      description: 'Password and authentication settings',
      href: '/settings',
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: 'Billing',
      description: 'Manage your subscription and payments',
      href: '/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {(user as any)?.image ? (
                <img
                  src={(user as any).image}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {isAnonymous ? 'Guest User' : user?.name || 'User'}
              </h2>
              {!isAnonymous && (
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
                <Calendar className="h-4 w-4" />
                <span>Joined recently</span>
              </div>

              {isAnonymous && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    You're currently using a guest account. Sign in to save your data and access all features.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                  >
                    Sign in now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">Documents Created</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">Research Sessions</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">Free</div>
            <div className="text-sm text-gray-600">Current Plan</div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
          {menuItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-600">{item.description}</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
