# FRESCO Platform

> **The Thinking System for the AI Era**

Fresco is a modular thinking system that gives individuals and teams the clarity to make better decisions before execution begins. It's not software that automates thought — it's infrastructure for thinking.

![FRESCO](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

---

## 🧠 The Philosophy

FRESCO stands on three pillars:

1. **Structure before speed** – clarity first, execution second
2. **Systems for thinkers, tools for builders** – human cognition augmented by intelligent scaffolding
3. **Because templates don't think. People do.**

---

## 🏗️ System Structure

FRESCO's system is simple, modular, and complete:

| Phase | Core Focus | Toolkits |
|-------|-----------|----------|
| **Investigate** | Understand reality | Insight Stack™, POV Generator™, Mental Model Mapper™ |
| **Innovate** | Shape new solutions | Flow Board™, Experiment Brief™, Strategy Sketchbook™ |
| **Validate** | Test & measure truth | UX Scorecard™, Persuasion Canvas™, Performance Grid™ |

### Thinking Modes

FRESCO uses 16 thinking modes organized into three tiers:

**Tier 1 — Core 4 (The Fresco Cognitive Quadrant)**
- Critical Thinking
- Systems Thinking
- Design Thinking
- Product Thinking

**Tier 2 — Expansion 8**
- First Principles, Analytical, Strategic, Futures
- Scientific, Economic, Ethical, Narrative

**Tier 3 — Specialized**
- Lateral, Computational, Philosophical, Behavioral

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL (optional, for production)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/fresco-platform.git
cd fresco-platform

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see FRESCO.

### Database Setup (Optional)

For persistent storage with Supabase:

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run database migrations:

```bash
npm run db:push
```

---

## 📁 Project Structure

```
fresco-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css         # Global styles & design system
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main application
│   ├── components/
│   │   ├── layout/             # Layout components (nav rail, etc.)
│   │   ├── toolkit/            # Toolkit components (Insight Stack, etc.)
│   │   ├── ui/                 # UI primitives (buttons, inputs, etc.)
│   │   └── workspace/          # Workspace components
│   ├── lib/
│   │   ├── store.ts            # Zustand state management
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── index.ts            # TypeScript type definitions
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
└── package.json
```

---

## 🎨 Design System

FRESCO follows a precise design language:

### Colors
- **Graphite**: `#111111` (primary)
- **Graphite Light**: `#999999` (secondary text)
- **Border**: `#EAEAEA` (dividers)
- **Focus Blue**: `#006CFF` (accents)

### Typography
- **Font**: Maison Neue (fallback: Inter)
- **Weights**: 300, 400, 500, 600
- **Line spacing**: Generous for clarity

### Spacing
- **Micro-grid**: 8px
- **Vertical rhythm**: 24px
- **Large blocks**: 48px

### Design Principles
- No shadows
- No gradients
- No skeuomorphism
- Everything must feel "engineered"

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Animation**: Framer Motion
- **Database**: PostgreSQL (via Prisma)
- **Auth**: Supabase Auth (planned)
- **AI**: Claude API (planned for v2)

---

## 📝 Development Roadmap

### Phase 1: Foundation (Current)
- [x] Home Dashboard
- [x] Workspace Overview
- [x] Insight Stack™ Toolkit
- [x] Thinking Lens System
- [x] Sentence of Truth component
- [ ] Local storage persistence
- [ ] POV Generator™ Toolkit
- [ ] Mental Model Mapper™ Toolkit

### Phase 2: Core Experience
- [ ] All 9 Toolkits
- [ ] Full Thinking Lens integration
- [ ] Cross-toolkit workflows
- [ ] Archive system
- [ ] Export functionality

### Phase 3: Intelligence Layer (Fresco 2.0)
- [ ] Claude AI integration for insights
- [ ] Automated lens recommendations
- [ ] Pattern detection
- [ ] Adaptive toolkits

### Phase 4: Collaboration
- [ ] Team workspaces
- [ ] Real-time collaboration
- [ ] Sharing & permissions

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

---

## 📄 License

This project is proprietary. All rights reserved.

---

## 🙏 Acknowledgments

FRESCO's influence lineage:
- **Jacque Fresco** — Systems as civilization architecture
- **Apple** — Precision and function as aesthetic
- **Tesla** — Vision engineered into inevitability
- **Yeezy** — Uncompromising creative discipline
- **Figma / Notion** — Digital scaffolds for clarity and collaboration

---

*"Fresco is the system behind clarity, not the platform behind automation. It turns thinking into a craft — and clarity into a competitive advantage."*
