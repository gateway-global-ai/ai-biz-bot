/**
 * Me Profile — admin/control-plane account surface (MUI via @/ui-core).
 * Clear Voice AI branding remains on AdminShell sidebar; this page uses sovereign admin theme only.
 */
import { useState } from "react";
import { User } from "lucide-react";
import { BRAND } from "@/config/brand";
import {
  SovereignThemeProvider,
  SovereignPageShell,
  SovereignSectionHeader,
  SovereignCard,
  SovereignAlert,
  SovereignButton,
  SovereignModal,
  SovereignFormField,
  SovereignStack,
  SovereignTypography,
} from "@/ui-core";

export function MeProfile() {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <SovereignThemeProvider>
      <SovereignPageShell>
        <SovereignSectionHeader
          title="Profile"
          subtitle="Your account and preferences."
          actions={
            <SovereignButton sovereignVariant="ghost" onClick={() => setInfoOpen(true)}>
              About this screen
            </SovereignButton>
          }
        />

        <SovereignStack spacing={3}>
          <SovereignAlert variant="info">
            Operational profile controls will connect to session and security APIs in a later slice.
            This route validates the ui-core pattern only.
          </SovereignAlert>

          <SovereignCard title="Account">
            <SovereignFormField
              label="Display name"
              placeholder="Connected when profile API is wired"
              disabled
              helperText="Read-only placeholder — no PII stored client-side."
            />
            <SovereignFormField
              label="Email"
              type="email"
              placeholder="you@company.com"
              disabled
              sx={{ mt: 2 }}
            />
          </SovereignCard>
        </SovereignStack>

        <SovereignModal
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          title="Profile (control plane)"
          footer={<SovereignButton onClick={() => setInfoOpen(false)}>Close</SovereignButton>}
        >
          <SovereignTypography variant="body2" color="text.secondary">
            Built with the Sovereign UI layer: MUI runs only inside{" "}
            <SovereignTypography component="span" variant="body2" fontFamily="monospace" fontSize="0.85em">
              client/src/ui-core
            </SovereignTypography>
            . Sidebar logo and admin chrome are unchanged.
          </SovereignTypography>
        </SovereignModal>
      </SovereignPageShell>
    </SovereignThemeProvider>
  );
}
