# Nessa CRM - Frontend

A modern, comprehensive CRM platform for home health care agencies built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🎨 Modern UI with shadcn/ui components
- 📱 Fully responsive design
- 🎯 Type-safe with TypeScript
- 🚀 Built on Next.js 14 (App Router)
- 🎭 Clean, minimalist design system
- ♿ Accessible components

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **Icons:** Lucide React
- **Fonts:** Inter (sans-serif), Playfair Display (serif)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard page
│   ├── clients/          # Client management
│   ├── schedule/          # Scheduling module
│   ├── evv/               # EVV module
│   ├── billing/           # Billing module
│   ├── hr/                # HR module
│   ├── workflows/         # Workflow automation
│   ├── reports/           # Reports & analytics
│   ├── settings/          # Settings
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components (Navbar, Sidebar)
│   └── dashboard/         # Dashboard-specific components
├── lib/
│   └── utils.ts           # Utility functions
└── components.json        # shadcn/ui configuration
```

## Available Routes

- `/` - Redirects to dashboard
- `/login` - Login page
- `/dashboard` - Main dashboard
- `/clients` - Client management
- `/schedule` - Scheduling calendar
- `/evv` - EVV dashboard
- `/billing` - Billing and invoicing
- `/hr` - Human resources
- `/workflows` - Workflow automation
- `/reports` - Reports and analytics
- `/settings` - System settings

## Design System

### Colors
- **Primary:** Black/Gray-900
- **Secondary:** White
- **Accent:** Stone-100 (beige)
- **Text:** Gray-900 (primary), Gray-700 (secondary), Gray-500 (tertiary)

### Typography
- **Headings:** Playfair Display (serif)
- **Body:** Inter (sans-serif)

## Adding New shadcn/ui Components

To add new shadcn/ui components, use the CLI:

```bash
npx shadcn-ui@latest add [component-name]
```

For example:
```bash
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
```

## Building for Production

```bash
npm run build
npm start
```

## Next Steps

1. **Integrate Charts:** Add a charting library (Recharts, Chart.js, etc.) for analytics
2. **Add Forms:** Implement React Hook Form for data entry forms
3. **State Management:** Add React Query/SWR for server state management
4. **Authentication:** Implement authentication system
5. **API Integration:** Connect to backend APIs
6. **Calendar Component:** Add FullCalendar or react-big-calendar for scheduling
7. **Data Tables:** Implement tables with sorting, filtering, and pagination

## License

This project is part of the Nessa CRM system.
