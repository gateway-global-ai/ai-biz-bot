# UI SDK matrix — classification and wrapper targets

**Purpose:** Single governance view for the **Gateway Global AI / ClearVoice UI contract**: what exists today, how to classify it, and what the **target** platform wrapper is. This complements [UI_ARCHITECTURE_AUDIT.md](./UI_ARCHITECTURE_AUDIT.md) (stack inventory) and [UI_COMPONENT_REGISTRY.md](./UI_COMPONENT_REGISTRY.md) (implemented wrappers).

**Classification keys**

| Tag | Meaning |
|-----|---------|
| **Approved foundation** | May be imported from `@/ui/foundation` or governed primitives |
| **Wrapped platform** | Use `@/ui/<layer>/…` wrapper; vendor is implementation detail |
| **Deprecated one-off** | Do not extend; migrate callers to wrapper or remove |
| **Vendor as-is** | shadcn/Radix OK for low-risk internal tools until wrapped |
| **Vendor skinned** | Keep vendor; standardize via wrapper + tokens |

**Ownership:** `Shell` | `Canvas` | `Communications` | `App` | `Marketplace` | `Shared` | `Compliance`

---

## 1. Shell and layout

| Element | Current source | Used where | Decision | Target wrapper | Ownership |
|---------|----------------|------------|----------|----------------|-----------|
| Header bar (logo, status) | `ConciergePanel` | Chat OS | Wrap + extract | `ShellHeader` | Shell |
| Visualizer band (wave bars) | `ConciergePanel` | Voice | Wrap + extract | `VoiceVisualizerBar` | Communications |
| PTT footer (3-slot contract) | `ConciergePanel` | Voice | Wrap + extract | `VoiceDock` / `PTTFooter` | Communications |
| App sidebar (admin) | `AppSidebar` + `components/ui/sidebar` | `/platform` | Vendor skinned | `AppSidebar` stays; tokens only | App |
| Public marketing header | Various pages | Marketing | Vendor as-is / token pass | `MarketingHeader` (optional) | Marketplace |

---

## 2. Canvas (white zone)

| Element | Current source | Used where | Decision | Target wrapper | Ownership |
|---------|----------------|------------|----------|----------------|-----------|
| Idle OS menu grid | `OSMenuList` + `useOSMenu` | Concierge, `BusinessHeroIdle` | Wrapped platform | `OSMenuList` (keep); menu **data** from `useOSMenu` | Canvas |
| Message / transcript list | `ConciergePanel`, chat widgets | Chat | Wrap + extract | `TranscriptPanel` | Canvas |
| Hero (business landing) | `BusinessHeroIdle`, `PlatformSiteFrame` | Public biz | Wrap pattern | `CanvasHero` (optional) | Marketplace |
| Bullet / rich text | Tailwind + `prose` | Docs pages | Vendor as-is | `UIBulletList` (optional) | Shared |
| Empty state | Ad hoc | Dashboards | Wrap | `CanvasEmptyState` | Canvas |

---

## 3. Communications (voice / AI OS)

| Element | Current source | Used where | Decision | Target wrapper | Ownership |
|---------|----------------|------------|----------|----------------|-----------|
| PTT push-to-talk control | `ConciergePanel` | Owner chat | Wrap + extract | `PTTButton` / `VoiceDock` | Communications |
| Voice mode / streaming toggles | `VoiceSettings` | Settings sheet | Wrap | `VoiceModeSelector` | Communications |
| DISC sliders + radar | `ConciergePanel`, `@/ui/charts` | Agent behavior | Wrapped platform | `DiscRadarChart` + `DISCSliderGroup` (TBD) | Communications |
| ARCH bars | `@/ui/charts` `ArchBarChart` | Agent behavior | Wrapped platform | `ArchBarChart` | Communications |
| Session / connection indicator | `ConciergePanel` | Header | Wrap | `SessionStatusChip` | Communications |
| Safe mode / No-drift UI | `ConciergePanel` | Behavior panel | Wrap | `SafeModeIndicator`, `NoDriftIndicator` | Communications |
| Live transcript feed | `LiveTranscriptFeed` (if used) | Dashboard | Wrap | `TranscriptPanel` | Communications |

---

## 4. QR, growth, and campaigns

| Element | Current source | Used where | Decision | Target wrapper | Ownership |
|---------|----------------|------------|----------|----------------|-----------|
| QR card (biz slug URL) | `AgentQRCard` | Agents, admin | Wrap | `QRCodeCampaignCard` | App |
| QR route manager | `QRRoutesManager` | Account | Vendor skinned | `QRRoutesPanel` | App |

---

## 5. Onboarding and compliance

| Element | Current source | Used where | Decision | Target wrapper | Ownership |
|---------|----------------|------------|----------|----------------|-----------|
| Owner / gateway onboarding | `OnboardingGateway`, `GovernanceWizard` | `/compliance-gateway` | Refactor patterns | `OnboardingWizardFrame` | App |
| SMS consent copy page | `pages/legal/SmsConsent.tsx` | Legal (route TBD) | Keep + route | Public page + link from shell | Compliance |
| A2P / compliance wizard | `A2PComplianceWizard` | Admin | Keep | `A2PComplianceWizard` | Compliance |
| OTP login | `OtpLoginModal`, `Login` | Auth | Wrap fields | `UIPhoneField` + `OTPField` in forms kit | Shared |

---

## 6. Forms and inputs (target field wrappers)

| Element | Current source | Decision | Target wrapper |
|---------|----------------|----------|----------------|
| Text | shadcn `Input` | Wrap | `UITextField` |
| Phone | Ad hoc | Wrap | `UIPhoneField` |
| Select | shadcn `Select` | Wrap | `UISelect` |
| Switch | shadcn `Switch` | Wrap | `UISwitch` |
| Textarea | shadcn `Textarea` | Wrap | `UITextArea` |
| Section grouping | Ad hoc | Wrap | `UIFormSection` |

---

## 7. Charts (approved types)

See [UI_ARCHITECTURE_AUDIT.md](./UI_ARCHITECTURE_AUDIT.md) and `client/src/ui/charts/chartGovernance.ts`. Add remaining wrappers incrementally: `KpiStatCard`, `CallVolumeBarChart`, `DonutMetricChart`, `ConversionFunnelChart`, etc.

---

## 8. Deprecation and duplication

| Item | Issue | Action |
|------|-------|--------|
| Duplicate DISC/ARCH color maps | Was scattered | **Done:** `brand.ts` single source |
| Raw Recharts outside `ui/charts` | Inconsistent | Migrate product pages to `@/ui/charts` |
| Showcase-only chart copies | `DiscVisualizer` local components | Deprecate when parity with `@/ui/charts` |
| `react-icons` in package.json | Unused in `client/src` | Remove when verified |

---

## 9. How this ties to `/dev/ui-kit`

The in-app kit ([UI_KIT.md](./UI_KIT.md)) demonstrates **implemented** wrappers and curated shadcn primitives. Rows in this matrix marked **Wrap + extract** are **roadmap**: the source file column is the extraction point. Each new wrapper should get a **UIKitSection** and a row update here.

---

## 10. Related docs

- [APP_SHELL_CONTRACT.md](./APP_SHELL_CONTRACT.md) — shell vs canvas
- [VIEW_REGISTRY.md](./VIEW_REGISTRY.md) — views and canvas-safe rules
- [UI_COMPONENT_REGISTRY.md](./UI_COMPONENT_REGISTRY.md) — authoritative wrapper index
- [SKILL_REGISTRY.md](./SKILL_REGISTRY.md) — OS menu capabilities
