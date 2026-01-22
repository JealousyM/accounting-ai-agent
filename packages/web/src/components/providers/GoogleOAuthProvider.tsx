'use client';

import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google';

interface GoogleOAuthProviderProps {
  children: React.ReactNode;
}

export function GoogleOAuthProvider({ children }: GoogleOAuthProviderProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn('Google OAuth Client ID not configured');
    return <>{children}</>;
  }

  return (
    <GoogleProvider clientId={clientId}>
      {children}
    </GoogleProvider>
  );
}
