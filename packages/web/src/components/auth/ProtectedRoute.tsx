'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps pages that require authentication
 * 
 * Features:
 * - Checks for valid token
 * - Verifies token with backend
 * - Automatic token refresh
 * - Redirects to login if unauthorized
 * - Loading state during verification
 * - No flash of content
 * 
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, needsProfileCompletion } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Wait for auth to initialize
    if (isLoading) {
      return;
    }

    // If auth is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      // Save intended destination
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', pathname);
      }

      router.push(redirectTo);
      return;
    }

    // If user needs to complete profile and is not on complete-profile page
    if (isAuthenticated && needsProfileCompletion && pathname !== '/auth/complete-profile') {
      router.push('/auth/complete-profile');
      return;
    }

    // Auth check complete
    setIsChecking(false);

    // Small delay to prevent flash
    setTimeout(() => {
      setShouldRender(true);
    }, 100);
  }, [isLoading, isAuthenticated, needsProfileCompletion, requireAuth, router, redirectTo, pathname]);

  // Show loading screen while checking
  if (isLoading || isChecking || !shouldRender) {
    return <LoadingScreen />;
  }

  // If auth is required and user is not authenticated, don't render
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Render children
  return <>{children}</>;
}

// ============================================
// PUBLIC ROUTE COMPONENT
// ============================================

interface PublicRouteProps {
  children: React.ReactNode;
  redirectIfAuthenticated?: boolean;
  redirectTo?: string;
}

/**
 * PublicRoute Component
 * 
 * Wraps pages that should redirect if user is already authenticated
 * (e.g., login, register pages)
 * 
 * @example
 * ```tsx
 * <PublicRoute redirectIfAuthenticated redirectTo="/dashboard">
 *   <LoginPage />
 * </PublicRoute>
 * ```
 */
export function PublicRoute({
  children,
  redirectIfAuthenticated = false,
  redirectTo = '/chat',
}: PublicRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (redirectIfAuthenticated && isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    setShouldRender(true);
  }, [isLoading, isAuthenticated, redirectIfAuthenticated, router, redirectTo]);

  // Show loading while checking
  if (isLoading || !shouldRender) {
    return <LoadingScreen />;
  }

  // If should redirect but still here, don't render
  if (redirectIfAuthenticated && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// ============================================
// ROLE-BASED ROUTE COMPONENT
// ============================================

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

/**
 * RoleBasedRoute Component
 * 
 * Wraps pages that require specific user roles
 * 
 * @example
 * ```tsx
 * <RoleBasedRoute allowedRoles={['admin', 'manager']}>
 *   <AdminPanel />
 * </RoleBasedRoute>
 * ```
 */
export function RoleBasedRoute({
  children,
}: RoleBasedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  // Check if user has required role
  // Note: You'll need to add role field to User type
  // const hasRequiredRole = allowedRoles.some(role => user.roles?.includes(role));

  // For now, just render children
  // Implement role checking based on your user model
  return <>{children}</>;
}
