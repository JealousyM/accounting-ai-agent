# Web Frontend

Next.js 15 frontend application for Accounting AI Agent.

## Features

- **Next.js 15** with App Router
- **React 19** with Server Components
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **Internationalization** (English & Polish)
- **Form Validation** with React Hook Form + Zod
- **Modern UI Components** with shadcn/ui style

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   │
│   │── register/      # Registration page
│   │── login/         # Login page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── auth/             # Authentication components
│   └── ui/               # UI components (Button, Input, etc.)
├── lib/                  # Utilities
│   ├── api/             # API client functions
│   ├── validations/     # Zod schemas
│   └── utils.ts         # Helper functions
├── i18n/                # Internationalization
│   └── locales/         # Translation files
│       ├── en.json      # English
│       └── pl.json      # Polish
└── hooks/               # Custom React hooks
```

## Internationalization

The app supports English and Polish languages.

### Available Routes

- `/en/register` - English registration
- `/pl/register` - Polish registration
- `/en/login` - English login
- `/pl/login` - Polish login

### Adding Translations

Edit translation files:
- `src/i18n/locales/en.json`
- `src/i18n/locales/pl.json`

## Components

### RegistrationForm

Full-featured registration form with:
- Email, password, name, company fields
- Real-time password strength validation
- Terms & conditions checkbox
- Social OAuth buttons (Google, GitHub)
- Error handling and success messages
- Internationalization support

### UI Components

- **Button** - Primary, outline, ghost variants
- **Input** - Text input with error states
- **Checkbox** - Custom styled checkbox
- All components use Tailwind CSS v4

## API Integration

API client located in `src/lib/api/auth.ts`:

```typescript
import { registerUser } from '@/lib/api/auth';

const response = await registerUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
});
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Styling

Using Tailwind CSS v4 with custom configuration:

- Primary color: `#2563eb` (blue-600)
- Modern 2026 design aesthetic
- Responsive design
- Dark mode ready

## Testing

```bash
npm run test
```

## Deployment

```bash
npm run build
```

Deploy to Vercel, Netlify, or any Node.js hosting.
