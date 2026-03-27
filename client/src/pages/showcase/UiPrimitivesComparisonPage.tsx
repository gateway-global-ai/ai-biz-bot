import type { ReactNode } from "react";
/**
 * SDK vs raw MUI — side-by-side reference for integrators.
 * Same Sovereign admin theme wraps both columns; left uses @/ui-core only, right uses @mui/material directly.
 * Inspired by Lumina / AI Studio widget vocabulary (Button, Card, Input, nav item, badge, status, composed blocks).
 */
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  Activity,
  BarChart3,
  FileText,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Mail,
  Server,
} from "lucide-react";
import { useLocation } from "wouter";
import { CANVAS, SHELL } from "@/config/brand";
import {
  SovereignThemeProvider,
  SovereignButton,
  SovereignCard,
  SovereignFormField,
  SovereignSectionHeader,
  SovereignStack,
  SovereignTypography,
} from "@/ui-core";

function ColumnChrome({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${CANVAS.border}`,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <Box sx={{ px: 2, py: 1.5, bgcolor: CANVAS.bgSubtle, borderBottom: `1px solid ${CANVAS.border}` }}>
        <Typography variant="subtitle2" fontWeight={800} color="text.primary">
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}

function CompareRow({
  label,
  sovereign,
  muiRaw,
}: {
  label: string;
  sovereign: ReactNode;
  muiRaw: ReactNode;
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
        {label}
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
        <Box sx={{ flex: 1, minWidth: 0 }}>{sovereign}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>{muiRaw}</Box>
      </Stack>
    </Box>
  );
}

function MiniBars() {
  const h = [40, 65, 45, 80, 55, 70, 50];
  return (
    <SovereignStack direction="row" alignItems="flex-end" spacing={0.75} sx={{ height: 100 }}>
      {h.map((pct, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: `${pct}%`,
            minHeight: 8,
            borderRadius: 1,
            bgcolor: "primary.main",
            opacity: 0.75 + (i % 3) * 0.08,
          }}
        />
      ))}
    </SovereignStack>
  );
}

function MiniBarsMui() {
  const h = [40, 65, 45, 80, 55, 70, 50];
  return (
    <Stack direction="row" alignItems="flex-end" spacing={0.75} sx={{ height: 100 }}>
      {h.map((pct, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: `${pct}%`,
            minHeight: 8,
            borderRadius: 1,
            bgcolor: "primary.main",
            opacity: 0.75 + (i % 3) * 0.08,
          }}
        />
      ))}
    </Stack>
  );
}

export default function UiPrimitivesComparisonPage() {
  const [, setLocation] = useLocation();

  return (
    <SovereignThemeProvider>
      <div style={{ minHeight: "100vh", backgroundColor: CANVAS.bg, color: CANVAS.text }}>
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3 }, py: 4 }}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <SovereignSectionHeader
              title="UI primitives: Gateway SDK vs raw MUI"
              subtitle="Same theme, two import surfaces. Use @/ui-core in product code; raw MUI when you need full control."
              icon={<BarChart3 className="h-5 w-5 text-slate-600" />}
              action={
                <SovereignButton sovereignVariant="outlined" onClick={() => setLocation("/sdk")}>
                  Back to SDK showcase
                </SovereignButton>
              }
            />

            <SovereignTypography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
              This page mirrors a typical AI-generated component set (buttons, cards, inputs, sidebar rows, badges,
              status dots, small charts, lists). The left column imports only{" "}
              <Box component="code" sx={{ bgcolor: CANVAS.bgSubtle, px: 0.5, borderRadius: 0.5 }}>
                @/ui-core
              </Box>
              ; the right uses{" "}
              <Box component="code" sx={{ bgcolor: CANVAS.bgSubtle, px: 0.5, borderRadius: 0.5 }}>
                @mui/material
              </Box>{" "}
              primitives explicitly.
            </SovereignTypography>

            <Divider sx={{ my: 3 }} />

            <SovereignTypography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              Primitives
            </SovereignTypography>

            <CompareRow
              label="Button"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="@/ui-core — semantic variants">
                  <SovereignStack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <SovereignButton sovereignVariant="primary">Primary</SovereignButton>
                    <SovereignButton sovereignVariant="secondary">Secondary</SovereignButton>
                    <SovereignButton sovereignVariant="outlined">Outlined</SovereignButton>
                    <SovereignButton sovereignVariant="text">Text</SovereignButton>
                  </SovereignStack>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Button + variant + color per call site">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" color="primary">
                      Primary
                    </Button>
                    <Button variant="contained" color="secondary">
                      Secondary
                    </Button>
                    <Button variant="outlined" color="primary">
                      Outlined
                    </Button>
                    <Button variant="text" color="inherit">
                      Text
                    </Button>
                  </Stack>
                </ColumnChrome>
              }
            />

            <CompareRow
              label="Card"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="SovereignCard + title slot">
                  <SovereignCard title="Account">
                    <SovereignTypography variant="body2">Wrapped CardContent + spacing preset.</SovereignTypography>
                  </SovereignCard>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Card, CardContent, Typography">
                  <Card>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Wrapped CardContent + spacing preset.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </ColumnChrome>
              }
            />

            <CompareRow
              label="Input"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="SovereignFormField → TextField defaults">
                  <SovereignFormField label="Email" placeholder="you@company.com" />
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="TextField — repeat fullWidth, size, variant">
                  <TextField fullWidth size="small" variant="outlined" label="Email" placeholder="you@company.com" />
                </ColumnChrome>
              }
            />

            <CompareRow
              label="SidebarItem"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="Composable Stack + Typography (no List API)">
                  <SovereignStack spacing={0.5}>
                    {[
                      { icon: Inbox, label: "Inbox" },
                      { icon: FolderOpen, label: "Drive" },
                      { icon: Mail, label: "Mail" },
                    ].map(({ icon: Icon, label }) => (
                      <SovereignStack
                        key={label}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Icon className="h-4 w-4 text-slate-500" />
                        <SovereignTypography variant="body2">{label}</SovereignTypography>
                      </SovereignStack>
                    ))}
                  </SovereignStack>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="ListItemButton + ListItemIcon + ListItemText">
                  <List dense disablePadding>
                    {[
                      { icon: Inbox, label: "Inbox" },
                      { icon: FolderOpen, label: "Drive" },
                      { icon: Mail, label: "Mail" },
                    ].map(({ icon: Icon, label }) => (
                      <ListItem key={label} disablePadding>
                        <ListItemButton>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Icon className="h-4 w-4" />
                          </ListItemIcon>
                          <ListItemText primary={label} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </ColumnChrome>
              }
            />

            <CompareRow
              label="Badge"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="Chip-styled label via theme (manual pattern)">
                  <SovereignStack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 10,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    >
                      Beta
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 10,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: "success.main",
                        color: "success.contrastText",
                      }}
                    >
                      Live
                    </Box>
                  </SovereignStack>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Chip size + color">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label="Beta" size="small" color="primary" />
                    <Chip label="Live" size="small" color="success" />
                  </Stack>
                </ColumnChrome>
              }
            />

            <CompareRow
              label="StatusIndicator"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="Stack + dot + caption">
                  <SovereignStack spacing={1}>
                    {[
                      { color: "success.main", label: "API healthy" },
                      { color: "warning.main", label: "Degraded" },
                      { color: "error.main", label: "Down" },
                    ].map((s) => (
                      <SovereignStack key={s.label} direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color }} />
                        <SovereignTypography variant="caption" color="text.secondary">
                          {s.label}
                        </SovereignTypography>
                      </SovereignStack>
                    ))}
                  </SovereignStack>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Same structure, explicit Box + Typography">
                  <Stack spacing={1}>
                    {[
                      { color: "success.main", label: "API healthy" },
                      { color: "warning.main", label: "Degraded" },
                      { color: "error.main", label: "Down" },
                    ].map((s) => (
                      <Stack key={s.label} direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color }} />
                        <Typography variant="caption" color="text.secondary">
                          {s.label}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </ColumnChrome>
              }
            />

            <Divider sx={{ my: 4 }} />

            <SovereignTypography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              Composed widgets
            </SovereignTypography>

            <CompareRow
              label="StatCard"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="SovereignCard + typography scale">
                  <SovereignCard>
                    <SovereignTypography variant="overline" color="text.secondary">
                      MRR
                    </SovereignTypography>
                    <SovereignTypography variant="h5" fontWeight={800}>
                      $48.2k
                    </SovereignTypography>
                    <SovereignTypography variant="caption" color="success.main">
                      +6.2% vs last month
                    </SovereignTypography>
                  </SovereignCard>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Card + manual type ramp">
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary">
                        MRR
                      </Typography>
                      <Typography variant="h5" fontWeight={800}>
                        $48.2k
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        +6.2% vs last month
                      </Typography>
                    </CardContent>
                  </Card>
                </ColumnChrome>
              }
            />

            <CompareRow
              label="RevenueChart"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="SovereignStack + themed boxes">
                  <SovereignTypography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Last 7 days
                  </SovereignTypography>
                  <MiniBars />
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Stack + Box (no chart library)">
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Last 7 days
                  </Typography>
                  <MiniBarsMui />
                </ColumnChrome>
              }
            />

            <CompareRow
              label="ActivityList"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="List semantics via Stack">
                  <SovereignStack spacing={1}>
                    {["Invoice paid", "User invited", "Webhook retried"].map((t) => (
                      <SovereignStack
                        key={t}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ py: 0.5, borderBottom: `1px solid ${CANVAS.border}` }}
                      >
                        <Activity className="h-4 w-4 text-slate-400 shrink-0" />
                        <SovereignTypography variant="body2">{t}</SovereignTypography>
                      </SovereignStack>
                    ))}
                  </SovereignStack>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="List + ListItem">
                  <List dense>
                    {["Invoice paid", "User invited", "Webhook retried"].map((t) => (
                      <ListItem key={t} divider sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Activity className="h-4 w-4" />
                        </ListItemIcon>
                        <ListItemText primary={t} primaryTypographyProps={{ variant: "body2" }} />
                      </ListItem>
                    ))}
                  </List>
                </ColumnChrome>
              }
            />

            <CompareRow
              label="SystemStatusPanel"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="Card + progress + status rows">
                  <SovereignCard title="Services">
                    <SovereignStack spacing={2}>
                      <Box>
                        <SovereignTypography variant="caption" color="text.secondary">
                          Load
                        </SovereignTypography>
                        <LinearProgress variant="determinate" value={62} sx={{ mt: 0.5, borderRadius: 1 }} />
                      </Box>
                      <SovereignStack direction="row" alignItems="center" spacing={1}>
                        <Server className="h-4 w-4 text-slate-500" />
                        <SovereignTypography variant="body2">Voice bridge</SovereignTypography>
                        <Box sx={{ ml: "auto", width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                      </SovereignStack>
                    </SovereignStack>
                  </SovereignCard>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Card + same children">
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        Services
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Load
                          </Typography>
                          <LinearProgress variant="determinate" value={62} sx={{ mt: 0.5, borderRadius: 1 }} />
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Server className="h-4 w-4" />
                          <Typography variant="body2">Voice bridge</Typography>
                          <Box sx={{ ml: "auto", width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </ColumnChrome>
              }
            />

            <Divider sx={{ my: 4 }} />

            <SovereignTypography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              App shells (mini)
            </SovereignTypography>

            <CompareRow
              label="Dashboard"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="SovereignCard grid">
                  <SovereignStack direction="row" spacing={1}>
                    <SovereignCard>
                      <LayoutDashboard className="h-5 w-5 text-slate-500 mb-1" />
                      <SovereignTypography variant="caption">Overview</SovereignTypography>
                    </SovereignCard>
                    <SovereignCard>
                      <BarChart3 className="h-5 w-5 text-slate-500 mb-1" />
                      <SovereignTypography variant="caption">Metrics</SovereignTypography>
                    </SovereignCard>
                  </SovereignStack>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Paper + Card">
                  <Stack direction="row" spacing={1}>
                    <Card variant="outlined" sx={{ flex: 1, p: 1.5 }}>
                      <LayoutDashboard className="h-5 w-5 text-slate-500 mb-1" />
                      <Typography variant="caption">Overview</Typography>
                    </Card>
                    <Card variant="outlined" sx={{ flex: 1, p: 1.5 }}>
                      <BarChart3 className="h-5 w-5 text-slate-500 mb-1" />
                      <Typography variant="caption">Metrics</Typography>
                    </Card>
                  </Stack>
                </ColumnChrome>
              }
            />

            <CompareRow
              label="Docs / Drive / Email"
              sovereign={
                <ColumnChrome title="Gateway SDK" subtitle="Icon + label stacks">
                  <SovereignStack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <SovereignCard>
                      <FileText className="h-5 w-5 text-slate-500 mb-1" />
                      <SovereignTypography variant="caption">Docs</SovereignTypography>
                    </SovereignCard>
                    <SovereignCard>
                      <FolderOpen className="h-5 w-5 text-slate-500 mb-1" />
                      <SovereignTypography variant="caption">Drive</SovereignTypography>
                    </SovereignCard>
                    <SovereignCard>
                      <Mail className="h-5 w-5 text-slate-500 mb-1" />
                      <SovereignTypography variant="caption">Email</SovereignTypography>
                    </SovereignCard>
                  </SovereignStack>
                </ColumnChrome>
              }
              muiRaw={
                <ColumnChrome title="Raw MUI" subtitle="Outlined cards">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Card variant="outlined" sx={{ p: 1.5, minWidth: 100 }}>
                      <FileText className="h-5 w-5 text-slate-500 mb-1" />
                      <Typography variant="caption">Docs</Typography>
                    </Card>
                    <Card variant="outlined" sx={{ p: 1.5, minWidth: 100 }}>
                      <FolderOpen className="h-5 w-5 text-slate-500 mb-1" />
                      <Typography variant="caption">Drive</Typography>
                    </Card>
                    <Card variant="outlined" sx={{ p: 1.5, minWidth: 100 }}>
                      <Mail className="h-5 w-5 text-slate-500 mb-1" />
                      <Typography variant="caption">Email</Typography>
                    </Card>
                  </Stack>
                </ColumnChrome>
              }
            />

            <Box
              sx={{
                mt: 4,
                p: 2,
                borderRadius: 3,
                bgcolor: SHELL.bg,
                color: SHELL.text,
              }}
            >
              <Typography variant="body2" sx={{ color: SHELL.textMuted }}>
                <strong>For customers:</strong> Prefer{" "}
                <Box component="code" sx={{ color: SHELL.text, px: 0.5 }}>
                  @/ui-core
                </Box>{" "}
                so theming and density stay aligned with the Gateway admin shell. Use raw MUI when you need a
                component we have not wrapped yet — still keep imports behind a single theme provider. Lumina /
                AI Studio exports are a vocabulary reference only; this page is the governed in-repo equivalent.
              </Typography>
            </Box>
          </motion.div>
        </Box>
      </div>
    </SovereignThemeProvider>
  );
}
