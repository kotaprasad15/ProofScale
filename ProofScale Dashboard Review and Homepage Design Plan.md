# ProofScale Dashboard Review and Homepage Design Plan

## 1. Objective

Create a polished public homepage for ProofScale and align the authenticated dashboard with a clear, modern light visual system. The homepage should explain the product to prospective clients, lead visitors to login or signup, and make the transition into organization-owner, project-owner, or tester workflows feel intentional.

The existing dashboard should remain an internal application workspace, while the new homepage should be a public-facing product page. These two surfaces should share brand elements but should not use the same navigation pattern: the dashboard can retain a persistent sidebar, while the homepage should use a clean top navigation and conversion-focused sections.

## 2. Screenshot review

The screenshot already communicates several important ideas well. The product name and subtitle are visible, the active organization is clear, the sidebar exposes the primary product areas, the “Engine Online” status gives operational confidence, and the disclaimer demonstrates that the product is not promising an unconditional capacity guarantee. The hierarchy of dashboard title, summary cards, active project, and disclaimer is understandable.

The main issue is that the current visual language feels closer to a technical admin panel than to a polished consultancy-grade product. The dark navy background, saturated violet gradients, heavy glow, and dense sidebar create a strong developer-tool mood, but they make the application feel more complex and less approachable for a client or first-time visitor. The homepage should therefore introduce a lighter, more editorial visual language, while the dashboard can optionally retain a dark “operations” mode as a user preference later.

### Specific changes to make in the dashboard

| Current element | Recommended change | Reason |
|---|---|---|
| Entire dark navy UI | Make light theme the default: warm off-white application background, white cards, dark slate text, and violet used as a controlled accent. | Improves readability and makes the product feel more client-ready. |
| Saturated purple selected navigation | Use a pale violet surface with a stronger violet left indicator or icon treatment. | Preserves brand recognition without overpowering the page. |
| Heavy card borders and dark surfaces | Use white cards with subtle borders, soft shadows, and consistent 16–20px radius. | Creates hierarchy through elevation instead of large blocks of darkness. |
| “Latest Readiness Score 100 / 100” | Present score with context: “Latest assessment: 100/100” plus confidence, run date, test profile, and a link to methodology. | Prevents a perfect score from looking like an absolute guarantee. |
| “Ready” status | Replace with conditional language such as “Conditionally ready” or “Passes declared thresholds.” | Aligns the UI with the product’s assessment disclaimer. |
| `http://localhost:4000` visible in the target card | Show a friendly environment label such as “Staging API” in the primary view, with the technical URL in a details drawer or copy action. | Avoids exposing development-only details in a client-facing view. |
| “Engine Online” badge | Add a tooltip or status detail showing last heartbeat, worker region, and whether the engine is available for new runs. | Turns a decorative badge into useful operational feedback. |
| Organization switcher | Keep it, but add a clear workspace label, organization role badge, and a searchable switcher when multiple organizations exist. | Supports the role-aware account model. |
| Sidebar has many items with similar emphasis | Group links into “Assess,” “Analyze,” and “Manage.” Use the active project context in the top bar. | Reduces cognitive load and clarifies the workflow. |
| Dashboard has one large project row | Add a project status, last run time, current score trend, and direct “View report” action. | Makes the project summary actionable. |
| Large unused horizontal space in the project card | Use a compact two-column summary: project metadata on the left and latest score/run status on the right. | Improves information density without making the page crowded. |
| Disclaimer at the bottom | Keep the disclaimer, but pair it with a “How scoring works” link and show a short version near the score. | Makes validity constraints visible at the moment users interpret the score. |
| Avatar only shows initials | Add an account menu with name, email, organization role, project role, workspace switcher, account settings, and logout. | Reflects the new login/signup and role-aware access feature. |

The current page should not expose a perfect result as the dominant visual story without its test envelope. Add small metadata near the score: “Smoke profile · 2 VUs · 30 sec · p95 480 ms · 12 Jun 2026.” The actual values should come from the run record, not be hard-coded.

## 3. Brand and light-theme design system

### Typography

Use **Manrope** as the primary typeface. It is distinctive enough for a product brand, highly legible for dashboard labels, and works well across large headings and compact UI. Use **DM Mono** only for technical values such as latency, request rates, run IDs, timestamps, and endpoint names. Do not use a decorative font for body copy or data tables.

Recommended type scale:

| Usage | Style |
|---|---|
| Homepage hero | Manrope, 56–72px desktop, 40–48px mobile, 700–800 weight, tight line height. |
| Section heading | Manrope, 32–40px, 700 weight. |
| Dashboard page heading | Manrope, 28–34px, 700 weight. |
| Card heading | Manrope, 16–18px, 700 weight. |
| Body copy | Manrope, 15–17px, 400–500 weight, relaxed line height. |
| Technical metric | DM Mono, 13–16px, 500 weight. |
| Small label | Manrope, 11–12px, 700 weight, slight letter spacing. |

### Light color palette

| Token | Suggested value | Usage |
|---|---|---|
| `canvas` | `#F7F8FC` | Main page background. |
| `surface` | `#FFFFFF` | Cards, dialogs, navigation surfaces. |
| `surface-muted` | `#F1F3F8` | Secondary cards, table headers, inactive controls. |
| `ink` | `#101828` | Headings and primary content. |
| `ink-muted` | `#667085` | Supporting text and metadata. |
| `brand` | `#6657E8` | Primary CTA, active states, links, score accent. |
| `brand-soft` | `#EEEAFE` | Selected navigation and soft highlight surfaces. |
| `success` | `#159A75` | Operational and threshold-passing states. |
| `success-soft` | `#E7F7F1` | Success background. |
| `warning` | `#B7791F` | Assessment limitations and cautions. |
| `warning-soft` | `#FFF7E5` | Warning banner background. |
| `danger` | `#C2415A` | Failed runs, destructive actions, critical findings. |
| `border` | `#E4E7EC` | Card and input borders. |

Use dark navy only in selected brand moments: the homepage hero visual, the logo mark, or a high-contrast footer. Do not let the whole product become a dark surface again by default.

### Component rules

Use 16–20px card radius, 12px control radius, 1px neutral borders, and shadows such as `0 8px 28px rgba(16, 24, 40, 0.06)`. Avoid glowing borders, excessive gradients, and multiple competing accent colors. Use violet for primary actions, teal for operational health, amber for caveats, and red only for failures.

Buttons should have one clear primary action per section. The primary button should use a filled violet surface with a slightly darker hover state. Secondary buttons should be white with a neutral border. Destructive actions should never share the same visual treatment as “Start test.”

## 4. Public homepage strategy

The homepage should answer five questions quickly: what ProofScale is, who it is for, how it works, why the score can be trusted, and what the visitor should do next. It should not look like a login screen or a generic SaaS template.

### Recommended homepage structure

| Section | Content and behavior |
|---|---|
| Top navigation | ProofScale logo, Product, How it works, Methodology, Security, Sign in, and a primary “Create workspace” CTA. Use a compact mobile menu. |
| Hero | Headline: “Know what your application can handle—before your users do.” Supporting copy explains controlled tests, evidence-backed reports, and conditional readiness scores. CTAs: “Start an assessment” and “See how it works.” |
| Hero visual | A light dashboard preview with a score ring, p95 latency, throughput, error rate, and a small test-envelope label. Use realistic sample data and a visible “Conditionally ready” label rather than a universal capacity claim. |
| Trust strip | Short statements such as “Authorized testing,” “Evidence-backed reports,” “Deterministic scoring,” and “Safe bounded workloads.” Do not invent customer logos before real customers exist. |
| Problem section | Explain the gap between “the app works” and “the app is ready under a known workload.” Use three compact cards: reliability, performance, and confidence. |
| How it works | Three steps: connect an authorized target, define a bounded scenario, review the report. Add a fourth optional step for comparing runs over time. |
| Role pathways | Three cards: Organization owner, Project owner, and Tester. Each card explains the value and leads to the correct signup/onboarding path. |
| Methodology section | Explain the score categories and weights. Emphasize that results are valid only within the test envelope and that the numeric score is deterministic. |
| Report preview | Show a clean report mockup with latency percentiles, thresholds, findings, and recommendations. The CTA should be “View a sample report.” |
| Safety section | Explain authorization acknowledgement, hard limits, target validation, and the fact that the product is not an anonymous stress-testing service. |
| Final CTA | “Make your next release measurable.” Buttons for “Create workspace” and “Sign in.” |
| Footer | Product links, methodology, security, acceptable use, privacy, terms, contact, and version/status information. |

### Homepage copy direction

Use confident but qualified language. Recommended hero copy:

> **Know what your application can handle—before your users do.**
>
> Run controlled, authorized performance checks and turn real measurements into a clear readiness report your team and clients can understand.

Recommended supporting note:

> ProofScale reports observed behavior under a declared workload. It does not provide a universal guarantee of real-user capacity.

Avoid phrases such as “guaranteed scalability,” “certified production ready,” “100% safe,” or “find the maximum users instantly.” These claims conflict with the product’s evidence-based and conditional positioning.

## 5. Homepage entry and account reflection

The public homepage should have two clear entry points: **Sign in** for returning users and **Create workspace** for new users. A secondary “I have an invitation” path can appear on the signup page or onboarding page rather than competing with the hero CTA.

After authentication, route users based on server-derived state:

| User state | Destination |
|---|---|
| New identity with no workspace | `/onboarding`, showing create organization, accept invitation, or request tester access. |
| Organization owner | Organization overview with project management and member controls. |
| Project owner | Project overview with targets, test plans, runs, reports, and project settings. |
| Tester | Assigned projects and approved test plans with run/report actions only. |
| Multiple organizations/projects | `/workspaces` or a workspace selector before entering the last valid workspace. |
| Revoked or suspended membership | A clear access state with no project data exposed and a recovery/contact path. |
| Public report visitor | Read-only report route with no dashboard mutation controls. |

The homepage should not show a role selector that grants permissions. A user can choose an intended path during onboarding, but the server grants access only through organization creation, invitation acceptance, or approved access request.

## 6. Recommended frontend structure

```text
client/src/
├── components/
│   ├── BrandLogo.tsx
│   ├── PublicNav.tsx
│   ├── PublicFooter.tsx
│   ├── HeroAssessmentPreview.tsx
│   ├── RolePathCard.tsx
│   ├── MethodologyCard.tsx
│   ├── DashboardLayout.tsx
│   ├── WorkspaceSwitcher.tsx
│   ├── PermissionGate.tsx
│   └── ScoreSummary.tsx
├── pages/
│   ├── Home.tsx                  # Public homepage
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Onboarding.tsx
│   ├── Workspaces.tsx
│   ├── OrganizationOverview.tsx
│   ├── ProjectOverview.tsx
│   ├── TesterOverview.tsx
│   └── Forbidden.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── WorkspaceContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useWorkspace.ts
│   └── usePermissions.ts
└── index.css
```

Use the existing dashboard layout for authenticated internal pages and build a separate public layout for the homepage. Keep the homepage content mostly static so it loads quickly and can be indexed. Use the typed API only for authenticated account and workspace data.

## 7. Implementation phases

### Phase 1: Visual foundation

Update global CSS variables for the light theme, add Manrope and DM Mono, establish spacing, border, radius, shadow, focus-ring, and semantic-status tokens, then refactor one dashboard screen to validate the system. The screenshot’s dashboard page should be the first migration target.

### Phase 2: Dashboard cleanup

Refactor the sidebar grouping, active navigation, organization switcher, score card, target display, engine status, project row, account menu, and disclaimer. Add test-envelope metadata and replace absolute-looking status labels with conditional assessment language.

### Phase 3: Public homepage

Create the public route and layout with the top navigation, hero, assessment preview, workflow, role pathways, methodology, safety section, sample report, final CTA, and footer. Use CSS and existing UI components for the product preview so the mock data and typography remain deterministic and editable.

### Phase 4: Authentication entry points

Connect “Sign in” and “Create workspace” to the existing nonce-bound OAuth flow. Add `/login`, `/signup`, and `/onboarding` states. Route new users to onboarding and returning users to the last valid workspace or workspace selector.

### Phase 5: Role-aware routing and reflection

Connect server-derived organization/project memberships to workspace selection, dashboard navigation, role badges, permission gates, owner actions, tester actions, and forbidden states. Ensure the client never treats a selected role label as permission.

### Phase 6: Responsive and accessibility polish

Test desktop, tablet, and mobile layouts. Verify keyboard focus, color contrast, reduced-motion behavior, readable error messages, large touch targets, responsive navigation, and accessible score/status labels. Check that the homepage still makes sense without JavaScript where practical.

### Phase 7: QA and rollout

Run visual regression checks for the homepage and dashboard, authentication end-to-end tests, role-permission tests, route-guard tests, and report-link isolation tests. Release the homepage first, then enable account onboarding and role-aware dashboard routing behind a feature flag if existing data needs migration.

## 8. Testing and acceptance criteria

The visual acceptance test is that a new visitor can understand ProofScale’s purpose within one viewport, find both sign-in and workspace-creation actions, and understand that results are conditional rather than universal. The homepage must remain readable on mobile and must not rely on the dark dashboard screenshot as the only explanation of the product.

The dashboard acceptance test is that an authenticated user can identify the active organization, current project, own role, available actions, latest assessment context, and report limitations without reading a technical manual. A tester must not see owner-only actions, and a project owner must not receive organization-owner controls unless separately permitted.

The technical acceptance test is that the light theme uses semantic tokens rather than hard-coded colors, the OAuth flow uses the existing callback and nonce protections, server-side authorization protects every mutation, and role-specific views are driven by server-returned permissions.

## 9. What to do next

Start by implementing the light design tokens and the dashboard cleanup before building the marketing homepage. This creates a coherent brand system and exposes role/context problems early. Then build the homepage with static sample assessment data, connect its CTAs to login/signup, and finally connect the authenticated routes to organization and project membership data.

Before production launch, replace sample metrics, project names, email addresses, localhost URLs, and customer-like references with real environment data or neutral placeholders. Keep the methodology disclaimer visible, publish an example report, and add the security, acceptable-use, privacy, and terms links in the footer.
