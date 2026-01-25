'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/AuthContext';
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
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
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
  allowedRoles,
  fallback,
  redirectTo = '/chat',
}: RoleBasedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      if (redirectTo) {
        router.push(redirectTo);
      }
      return;
    }

    setShouldRender(true);
  }, [isLoading, isAuthenticated, user, allowedRoles, router, redirectTo]);

  if (isLoading || !shouldRender) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// ============================================
// ADMIN ROUTE COMPONENT
// ============================================

interface AdminRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AdminRoute Component
 *
 * Convenience wrapper for admin-only pages
 * Combines ProtectedRoute + RoleBasedRoute
 *
 * @example
 * ```tsx
 * <AdminRoute>
 *   <AdminDashboard />
 * </AdminRoute>
 * ```
 */
export function AdminRoute({
  children,
  fallback,
}: AdminRouteProps) {
  return (
    <ProtectedRoute>
      <RoleBasedRoute allowedRoles={['admin']} fallback={fallback}>
        {children}
      </RoleBasedRoute>
    </ProtectedRoute>
  );
}
