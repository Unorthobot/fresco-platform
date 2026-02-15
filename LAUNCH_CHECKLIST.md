# FRESCO Launch Readiness Checklist

## 🔴 Critical (Must Have)

### Infrastructure
- [ ] **Environment Variables** - All production keys set
  - [ ] `ANTHROPIC_API_KEY` - Valid Claude API key with sufficient credits
  - [ ] `DATABASE_URL` - Production database connection string
  - [ ] `NEXTAUTH_SECRET` - Secure random string for auth (if using auth)
  - [ ] `NEXTAUTH_URL` - Production URL

- [ ] **Database**
  - [ ] Production database provisioned (e.g., PlanetScale, Supabase, Neon)
  - [ ] Prisma migrations run on production
  - [ ] Database backups configured

- [ ] **Hosting**
  - [ ] Deployed to Vercel/Railway/etc.
  - [ ] Custom domain configured (e.g., app.fresco.com)
  - [ ] SSL certificate active (HTTPS)
  - [ ] Environment variables set in hosting platform

### Core Functionality
- [ ] **All 9 toolkits load without errors**
  - [ ] Insight Stack
  - [ ] POV Generator
  - [ ] Mental Model Mapper
  - [ ] Flow Board
  - [ ] Experiment Brief
  - [ ] Strategy Sketchbook
  - [ ] UX Scorecard
  - [ ] Persuasion Canvas
  - [ ] Performance Grid

- [ ] **AI Generation works**
  - [ ] API key has credits
  - [ ] Generation completes in <30 seconds
  - [ ] Lens-specific outputs render correctly
  - [ ] Error handling shows user-friendly messages

- [ ] **Data Persistence**
  - [ ] Workspaces save correctly
  - [ ] Sessions save correctly
  - [ ] Steps auto-save
  - [ ] Sentence of Truth saves & locks
  - [ ] Data persists after refresh

### Navigation
- [ ] All back buttons work
- [ ] All navigation links work
- [ ] No console errors during navigation
- [ ] Mobile navigation works

---

## 🟡 Important (Should Have)

### User Experience
- [ ] **Loading States**
  - [ ] Generation shows loading spinner
  - [ ] Page transitions are smooth
  - [ ] No layout shift during load

- [ ] **Error Handling**
  - [ ] API failures show toast notifications
  - [ ] Network errors handled gracefully
  - [ ] Invalid routes redirect appropriately

- [ ] **Responsiveness**
  - [ ] Works on mobile (375px+)
  - [ ] Works on tablet (768px+)
  - [ ] Works on desktop (1024px+)
  - [ ] No horizontal scroll on any device

- [ ] **Dark Mode**
  - [ ] All components have dark variants
  - [ ] No white flashes
  - [ ] Toggle works in settings

### Performance
- [ ] **Lighthouse Scores** (run on production URL)
  - [ ] Performance: 70+
  - [ ] Accessibility: 90+
  - [ ] Best Practices: 90+
  - [ ] SEO: 80+

- [ ] **Core Web Vitals**
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1

### Export & Share
- [ ] Copy to clipboard works
- [ ] Markdown export downloads
- [ ] PDF export works (or gracefully degrades)

---

## 🟢 Nice to Have (Can Launch Without)

### Polish
- [ ] Onboarding flow complete
- [ ] Example content populated
- [ ] Milestone celebrations working
- [ ] Sound effects (optional)
- [ ] Ambient background animations

### Analytics & Monitoring
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Analytics (Mixpanel, PostHog, Amplitude)
- [ ] Uptime monitoring (Better Uptime, Pingdom)

### Legal
- [ ] Privacy Policy page
- [ ] Terms of Service page
- [ ] Cookie consent (if required)

### Marketing
- [ ] Open Graph meta tags
- [ ] Twitter Card meta tags
- [ ] Favicon and app icons
- [ ] Landing page / marketing site

---

## 🧪 Pre-Launch Testing Script

Run through this manually before going live:

### Flow 1: New User Journey
1. Open app in incognito window
2. Create a new workspace
3. Start Insight Stack toolkit
4. Fill in all 5 steps with real content
5. Click Generate
6. Verify insights appear
7. Edit the Sentence of Truth
8. Lock the Sentence of Truth
9. Check Necessary Moves appear
10. Click "Back to Workspace"
11. Verify session appears in workspace
12. Refresh page - verify data persists

### Flow 2: Multi-Toolkit Workspace
1. In same workspace, start POV Generator
2. Complete the toolkit
3. Generate outputs
4. Go back to workspace
5. Start a third toolkit (e.g., Experiment Brief)
6. Verify workspace context is used in generation
7. Check workspace synthesis updates

### Flow 3: Export & Share
1. Open a completed session
2. Click Export
3. Test Copy to Clipboard
4. Test Download Markdown
5. Test PDF export

### Flow 4: Settings & Navigation
1. Open Settings
2. Toggle dark mode
3. Navigate to Archive
4. Navigate to Account
5. Navigate back to Home
6. Click on recent workspace from Home

### Flow 5: Mobile
1. Open on mobile device (or Chrome DevTools mobile)
2. Complete Flow 1 on mobile
3. Verify bottom nav works
4. Verify no horizontal scroll

---

## 🚀 Launch Day Checklist

### Before Announcing
- [ ] Final production deploy complete
- [ ] Smoke test all critical flows
- [ ] Check error tracking dashboard is clean
- [ ] Verify API rate limits are sufficient

### Announcement
- [ ] Social media posts scheduled
- [ ] Email to waitlist (if applicable)
- [ ] Product Hunt launch (if applicable)

### Monitor First 24 Hours
- [ ] Watch error tracking for new issues
- [ ] Monitor API usage / costs
- [ ] Check user feedback channels
- [ ] Have hotfix process ready

---

## 📊 Success Metrics to Track

### Week 1
- Total signups
- Workspaces created
- Toolkits completed (all steps filled)
- Generations triggered
- Error rate

### Month 1
- Return users (came back after Day 1)
- Average toolkits per user
- Most/least used toolkits
- Average session duration
- Feature adoption (which features are used)

---

## Quick Health Check Commands

```bash
# Check if app builds without errors
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting issues
npm run lint

# Run any tests
npm test

# Check bundle size
npx next build && npx next analyze
```

---

## When You're Ready

You're ready to go live when:

1. ✅ All **Critical** items are checked
2. ✅ You've run through the **Testing Script** without issues
3. ✅ Most **Important** items are checked
4. ✅ You have a way to hear about errors (even just checking console)
5. ✅ You have 1-2 hours available after launch to monitor

**Remember:** Perfect is the enemy of shipped. Launch when it works, iterate based on real feedback.

---

*Last updated: February 2025*
