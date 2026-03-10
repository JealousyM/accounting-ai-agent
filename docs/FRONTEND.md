# Frontend Documentation

This document describes the Next.js frontend application for the Accounting AI Agent.

## Overview

| Property | Value |
|----------|-------|
| Framework | Next.js 15 (App Router) |
| React | 19 (with Server Components) |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Data Fetching | React Query |
| Forms | React Hook Form + Zod |
| i18n | next-intl |

## Project Structure

```
packages/web/src/
├── app/                        # Next.js App Router
│   ├── [locale]/               # Locale-prefixed routes
│   │   └── register/           # Registration page
│   ├── (auth-pages)/           # Auth pages: login, register, forgot/reset-password
│   ├── admin/                  # Admin pages (role-protected)
│   │   ├── page.tsx            # Admin dashboard
│   │   └── audit-log/          # Audit log viewer
│   ├── chat/                   # AI Chat page
│   ├── dashboard/              # KPI dashboard page
│   ├── invoices/               # Invoices page
│   ├── settings/               # Settings page
│   ├── pricing/                # Public pricing page (with OG image)
│   ├── terms/                  # Terms of service
│   ├── privacy-policy/         # Privacy policy
│   ├── rodo/                   # RODO/GDPR page
│   ├── cookies/                # Cookie policy
│   ├── layout.tsx              # Root layout (OG meta, GA4)
│   ├── page.tsx                # Landing page (public) / Chat (authenticated)
│   ├── opengraph-image.tsx     # Root OG image generator
│   └── globals.css             # Global styles
│
├── components/                 # React components
│   ├── admin/                  # Admin components
│   │   ├── AdminDashboard.tsx
│   │   └── AuditLogTable.tsx
│   ├── analytics/              # Analytics
│   │   └── GoogleAnalytics.tsx
│   ├── auth/                   # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── RegistrationForm.tsx
│   │   └── OAuthButtons.tsx
│   ├── chat/                   # AI Chat components
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── ChatMessage.tsx
│   ├── dashboard/              # KPI dashboard components
│   │   ├── SummaryCards.tsx
│   │   ├── RevenueExpenseChart.tsx
│   │   ├── UnpaidInvoicesCard.tsx
│   │   ├── TaxDeadlines.tsx
│   │   ├── HRSummaryCard.tsx
│   │   └── KSeFStatusCard.tsx
│   ├── landing/                # Public landing page
│   │   ├── LandingHeader.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── PricingPreviewSection.tsx
│   │   ├── CTASection.tsx
│   │   └── LandingFooter.tsx
│   ├── layout/                 # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── legal/                  # Legal page components
│   │   ├── LegalPageLayout.tsx
│   │   └── LegalFooter.tsx
│   └── ui/                     # Base UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       └── ...
│
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts              # Authentication hook
│   ├── useChat.ts              # Chat functionality hook
│   ├── useDashboard.ts         # Dashboard KPI data hook
│   ├── useTextToSpeech.ts      # Text-to-speech hook
│   ├── useVoiceDictation.ts    # Voice input hook
│   └── useWFirma.ts            # wFirma data hook
│
├── lib/                        # Utilities
│   ├── api/                    # API client
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.ts             # Auth API calls
│   │   ├── chat.ts             # Chat API calls
│   │   └── dashboard.ts        # Dashboard API calls
│   ├── gtag.ts                 # GA4 pageview/event helpers
│   ├── validations/            # Zod schemas
│   │   └── auth.ts
│   └── utils.ts                # Helper functions
│
├── i18n/                       # Internationalization
│   ├── config.ts               # i18n configuration
│   └── locales/                # Translation files
│       ├── en.json
│       ├── pl.json
│       └── ru.json
│
├── stores/                     # Zustand stores
│   ├── authStore.ts
│   └── chatStore.ts
│
└── types/                      # TypeScript types
    ├── auth.ts
    ├── chat.ts
    └── api.ts
```

## Key Features

### Server Components

Next.js 15 with React 19 enables Server Components by default:

```tsx
// Server Component (default)
export default async function InvoicesPage() {
  const invoices = await fetchInvoices(); // Server-side data fetching

  return (
    <div>
      <InvoiceList invoices={invoices} />
    </div>
  );
}
```

### Client Components

Use `'use client'` directive for interactive components:

```tsx
'use client';

import { useState } from 'react';

export function ChatInput() {
  const [message, setMessage] = useState('');

  return (
    <input
      value={message}
      onChange={(e) => setMessage(e.target.value)}
    />
  );
}
```

## Internationalization

### Supported Languages

| Language | Code | Default |
|----------|------|---------|
| English | en | Yes |
| Polish | pl | No |
| Russian | ru | No |

### Route Structure

```
/en/login     # English login
/pl/login     # Polish login
/ru/login     # Russian login
```

### Translation Usage

```tsx
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth');

  return (
    <form>
      <label>{t('email')}</label>
      <button>{t('login')}</button>
    </form>
  );
}
```

### Translation Files

```json
// locales/en.json
{
  "auth": {
    "email": "Email",
    "password": "Password",
    "login": "Sign In",
    "register": "Create Account"
  },
  "chat": {
    "placeholder": "Type your message...",
    "send": "Send"
  }
}
```

## State Management

### Zustand Store

```tsx
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

### React Query

```tsx
// hooks/useChat.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => api.sendMessage(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
```

## API Client

### Configuration

```tsx
// lib/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token refresh interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await refreshToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
```

### API Functions

```tsx
// lib/api/auth.ts
import api from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: RegisterInput) =>
    api.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () =>
    api.post('/auth/logout'),
};
```

## Form Handling

### Zod Validation

```tsx
// lib/validations/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[!@#$%^&*]/, 'Must contain special character'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});
```

### React Hook Form

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validations/auth';

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    await authApi.login(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        type="password"
        {...register('password')}
        error={errors.password?.message}
      />
      <Button type="submit" loading={isSubmitting}>
        Sign In
      </Button>
    </form>
  );
}
```

## UI Components

### Button Component

```tsx
// components/ui/Button.tsx
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        // Variant styles
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        variant === 'outline' && 'border border-gray-300 hover:bg-gray-50',
        variant === 'ghost' && 'hover:bg-gray-100',
        // Size styles
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-12 px-6 text-lg',
        // Disabled state
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
}
```

### Input Component

```tsx
// components/ui/Input.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-md border border-gray-300 px-3 py-2',
            'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
```

## Chat Interface

### Chat Container

```tsx
// components/chat/ChatContainer.tsx
'use client';

import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatContainer() {
  const { messages, sendMessage, isLoading } = useChat();

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
```

### Message Component

```tsx
// components/chat/ChatMessage.tsx
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={cn(
      'flex',
      role === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[80%] rounded-lg px-4 py-2',
        role === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-900'
      )}>
        {role === 'assistant' ? (
          <ReactMarkdown className="prose prose-sm">
            {content}
          </ReactMarkdown>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );
}
```

## KPI Dashboard

The dashboard page (`/dashboard`) aggregates data from wFirma, HR, and KSeF into a single view.

### Components

| Component | Description |
|-----------|-------------|
| `SummaryCards.tsx` | Revenue, expenses, profit, unpaid invoices, employee count, KSeF sent |
| `RevenueExpenseChart.tsx` | Monthly revenue vs expenses bar/line chart |
| `UnpaidInvoicesCard.tsx` | Unpaid and overdue invoice counts/totals |
| `TaxDeadlines.tsx` | Upcoming deadlines with urgency color coding |
| `HRSummaryCard.tsx` | Employee count, active contracts by type, payroll total |
| `KSeFStatusCard.tsx` | KSeF sent/accepted/rejected/pending counters |

### useDashboard Hook

```tsx
import { useDashboard } from '@/hooks/useDashboard';

function DashboardPage() {
  const { data, isLoading } = useDashboard();
  if (isLoading) return <Spinner />;

  return (
    <>
      <SummaryCards financial={data.financial} />
      <RevenueExpenseChart data={data.financial?.monthlyBreakdown} />
      <UnpaidInvoicesCard invoices={data.invoices} />
      <TaxDeadlines deadlines={data.deadlines} />
      <HRSummaryCard hr={data.hr} />
      <KSeFStatusCard ksef={data.ksef} />
    </>
  );
}
```

Data is fetched from `GET /api/dashboard/summary` and auto-refreshed.

## Landing Page & Public Routes

The root route (`/`) renders a public marketing landing page for unauthenticated users, or redirects to `/chat` for authenticated users.

### Landing Components

| Component | Description |
|-----------|-------------|
| `LandingHeader.tsx` | Sticky header with nav links, locale switcher, login/register buttons |
| `HeroSection.tsx` | Hero with headline and CTA buttons |
| `FeaturesSection.tsx` | 6-feature highlight grid |
| `HowItWorksSection.tsx` | Step-by-step usage explanation |
| `PricingPreviewSection.tsx` | Teaser cards linking to `/pricing` |
| `CTASection.tsx` | Bottom call-to-action banner |
| `LandingFooter.tsx` | Footer with legal page links |

### OG Meta Tags

Root layout (`app/layout.tsx`) includes Open Graph metadata (`metadataBase: https://eksiegowyai.pl`). Dynamic OG images are generated via:
- `app/opengraph-image.tsx` — root page (1200x630)
- `app/pricing/opengraph-image.tsx` — pricing page with tier cards

### Legal Pages

Four static legal pages share a `LegalPageLayout` wrapper:

| Route | Page |
|-------|------|
| `/terms` | Terms of service |
| `/privacy-policy` | Privacy policy |
| `/rodo` | RODO/GDPR compliance |
| `/cookies` | Cookie policy |

Accessible without authentication, linked from `LandingFooter` and registration form.

## Google Analytics (GA4)

Consent-aware GA4 integration. Only loads if the user has consented to analytics cookies.

### Setup

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env.local`:
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

The `GoogleAnalytics` component (`components/analytics/`) is rendered in the root layout. If the env var is not set or user hasn't consented, no scripts are injected.

### Event Tracking

```tsx
import { event } from '@/lib/gtag';

event('chat_message_sent', {
  category: 'engagement',
  label: 'ai_chat',
});
```

## Admin Pages

Pages under `/admin/` require `role: "admin"`. Non-admin users are redirected.

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | `AdminDashboard.tsx` | Platform-wide statistics (users, subscriptions, conversations) |
| `/admin/audit-log` | `AuditLogTable.tsx` | Paginated, filterable audit log viewer |

`AuditLogTable` supports filtering by entity, action, user, and date range. Actions are color-coded (green = CREATE, yellow = UPDATE, red = DELETE). Sensitive fields are pre-redacted by the API.

## Text-to-Speech (TTS)

The chat supports voice synthesis for AI responses using the Web Speech API.

### Features

| Feature | Description |
|---------|-------------|
| Manual playback | Click speaker icon on any AI message |
| Auto-speak | Automatically read new AI responses |
| Multi-language | Supports en-US, pl-PL, ru-RU |
| Speed control | Adjustable speech rate (0.5x - 2.0x) |
| Settings persistence | Saved to localStorage |

### Architecture

```
├── hooks/
│   └── useTextToSpeech.ts      # Core TTS hook (Web Speech API)
├── contexts/
│   └── TTSContext.tsx          # Global TTS state & settings
├── components/chat/
│   ├── TTSButton.tsx           # Play/stop button per message
│   └── TTSSettingsButton.tsx   # Settings popover in header
```

### Usage

```tsx
// Using TTS context
import { useTTS } from '@/contexts/TTSContext';

function MyComponent() {
  const { speak, stop, isSpeaking, ttsEnabled } = useTTS();

  return (
    <button onClick={() => speak('Hello world', 'msg-id')}>
      {isSpeaking ? 'Stop' : 'Play'}
    </button>
  );
}
```

### Auto-speak Hook

```tsx
import { useAutoSpeak } from '@/contexts/TTSContext';

function ChatContainer() {
  const { triggerAutoSpeak, shouldAutoSpeak } = useAutoSpeak();

  useEffect(() => {
    if (shouldAutoSpeak && newMessage) {
      triggerAutoSpeak(newMessage.content, newMessage.id);
    }
  }, [newMessage]);
}
```

### Settings

Settings stored in `localStorage` under key `tts-settings`:

```typescript
interface TTSSettings {
  enabled: boolean;    // TTS on/off
  autoSpeak: boolean;  // Auto-read new messages
  rate: number;        // Speech rate (0.5-2.0)
}
```

### Translations

TTS UI strings are in `chat.tts` namespace:

```json
{
  "chat": {
    "tts": {
      "play": "Read aloud",
      "stop": "Stop reading",
      "settings": "Voice settings",
      "enabled": "Voice readout",
      "autoSpeak": "Auto-read new messages",
      "rate": "Speed"
    }
  }
}
```

## Styling

### Tailwind CSS v4

Configuration in `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### Global Styles

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
}
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Accounting AI Agent

# OAuth (for frontend redirect)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Build & Deployment

### Development

```bash
npm run dev
# Opens at http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

### Static Export (if applicable)

```bash
npm run build
# Output in .next/
```

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Authentication](./AUTHENTICATION.md)
