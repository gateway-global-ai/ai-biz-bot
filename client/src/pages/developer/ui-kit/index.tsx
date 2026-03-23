import { useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import {
  DiscRadarChart,
  ArchBarChart,
  UsageLineChart,
  APPROVED_CHART_WRAPPERS,
} from "@/ui/charts";
import { UIButton as UIFoundationButton } from "@/ui/foundation";
import { isUiKitEnabled } from "@/lib/uiKitGate";
import { UIKitLayout, type UIKitNavItem } from "./UIKitLayout";
import { UIKitSection } from "./UIKitSection";
import { PlatformSdkSections } from "./PlatformSdkSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE_DISC = {
  dominance: 65,
  influence: 40,
  steadiness: 55,
  conscientiousness: 70,
};

const SAMPLE_ARCH = {
  acknowledge: 75,
  reflect: 60,
  context: 50,
  handoff: 30,
};

const USAGE_LINE_DATA = [
  { day: "Mon", minutes: 120 },
  { day: "Tue", minutes: 180 },
  { day: "Wed", minutes: 95 },
  { day: "Thu", minutes: 210 },
  { day: "Fri", minutes: 165 },
];

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

function ToastDemo() {
  const { toast } = useToast();
  return (
    <UIFoundationButton
      type="button"
      variant="outline"
      onClick={() =>
        toast({
          title: "Example toast",
          description: "Radix toast via useToast() — see Toaster in App root.",
        })
      }
    >
      Show toast
    </UIFoundationButton>
  );
}

function UiKitContent() {
  const [calDate, setCalDate] = useState<Date | undefined>(new Date());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const navItems: UIKitNavItem[] = [
    { id: "sdk-matrix-doc", label: "SDK matrix (governance)" },
    { id: "demo-boardwalk-multitask", label: "Demo — Boardwalk multitask" },
    { id: "canvas-os-menu", label: "Canvas — OS menu" },
    { id: "communications-visualizer", label: "Communications — Visualizer" },
    { id: "marketplace-qr-card", label: "QR — AgentQRCard" },
    { id: "canvas-typography-lists", label: "Canvas — Lists" },
    { id: "compliance-links", label: "Compliance & onboarding" },
    { id: "foundation-uibutton", label: "Foundation — UIButton" },
    { id: "charts-disc-radar", label: "Charts — DiscRadarChart" },
    { id: "charts-arch-bar", label: "Charts — ArchBarChart" },
    { id: "charts-usage-line", label: "Charts — UsageLineChart" },
    { id: "charts-governance", label: "Charts — Approved list" },
    { id: "vendor-button", label: "Vendor — Button (shadcn)" },
    { id: "vendor-input", label: "Vendor — Input" },
    { id: "vendor-card", label: "Vendor — Card" },
    { id: "vendor-dialog", label: "Vendor — Dialog" },
    { id: "vendor-tabs", label: "Vendor — Tabs" },
    { id: "vendor-toast", label: "Vendor — Toast" },
    { id: "vendor-calendar", label: "Vendor — Calendar" },
    { id: "vendor-form", label: "Vendor — Form + RHF" },
    { id: "vendor-table", label: "Vendor — Table" },
    { id: "vendor-accordion", label: "Vendor — Accordion" },
    { id: "ai-os-placeholders", label: "AI OS — Placeholders" },
  ];

  return (
    <UIKitLayout
      title="ClearVoice Developer UI Kit"
      subtitle="Interactive examples + governance matrix (docs-governance/UI_SDK_MATRIX.md). Canvas previews use CANVAS tokens per APP_SHELL_CONTRACT."
      navItems={navItems}
    >
      <PlatformSdkSections />

      <UIKitSection
        id="foundation-uibutton"
        title="UIButton"
        description="Platform button — prefer over raw shadcn Button in new product code."
        code={`import { UIButton } from '@/ui/foundation';

<UIButton variant="default">Save</UIButton>
<UIButton variant="outline">Cancel</UIButton>
<UIButton variant="ghost" size="sm">More</UIButton>`}
        preview={
          <div className="flex flex-wrap gap-3 items-center">
            <UIFoundationButton>Default</UIFoundationButton>
            <UIFoundationButton variant="secondary">Secondary</UIFoundationButton>
            <UIFoundationButton variant="outline">Outline</UIFoundationButton>
            <UIFoundationButton variant="ghost">Ghost</UIFoundationButton>
            <UIFoundationButton size="sm">Small</UIFoundationButton>
          </div>
        }
      />

      <UIKitSection
        id="charts-disc-radar"
        title="DiscRadarChart"
        description="DiSC behavioral radar — colors from brand.ts (accent stroke/fill)."
        code={`import { DiscRadarChart } from '@/ui/charts';

const scores = {
  dominance: 65,
  influence: 40,
  steadiness: 55,
  conscientiousness: 70,
};

<DiscRadarChart data={scores} />`}
        preview={<DiscRadarChart data={SAMPLE_DISC} className="max-w-md" />}
        previewClassName="bg-white"
      />

      <UIKitSection
        id="charts-arch-bar"
        title="ArchBarChart"
        description="ARCH dialogue dimensions — uses ARCH_COLORS from brand.ts."
        code={`import { ArchBarChart } from '@/ui/charts';

const arch = {
  acknowledge: 75,
  reflect: 60,
  context: 50,
  handoff: 30,
};

<ArchBarChart data={arch} variant="default" />`}
        preview={<ArchBarChart data={SAMPLE_ARCH} />}
        previewClassName="bg-white"
      />

      <UIKitSection
        id="charts-usage-line"
        title="UsageLineChart"
        description="Approved line chart for usage / time-series analytics."
        code={`import { UsageLineChart } from '@/ui/charts';

const data = [
  { day: 'Mon', minutes: 120 },
  { day: 'Tue', minutes: 180 },
];

<UsageLineChart data={data} xKey="day" yKey="minutes" height={220} />`}
        preview={
          <UsageLineChart data={USAGE_LINE_DATA} xKey="day" yKey="minutes" height={220} />
        }
        previewClassName="bg-white"
      />

      <section id="charts-governance" className="scroll-mt-24 border-b border-slate-800/80 pb-12">
        <h3 className="text-lg font-semibold text-white mb-1">Approved chart wrappers</h3>
        <p className="text-sm text-slate-400 mb-4">
          From <code className="text-emerald-400/90">client/src/ui/charts/chartGovernance.ts</code>
        </p>
        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
          {APPROVED_CHART_WRAPPERS.map((name) => (
            <li key={name}>
              <code className="text-slate-200">{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <UIKitSection
        id="vendor-button"
        title="Button (shadcn)"
        description="Raw primitive — use UIButton for new code; shown for parity with shadcn docs."
        code={`import { Button } from '@/components/ui/button';

<Button>Primary</Button>
<Button variant="outline">Outline</Button>`}
        preview={
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
          </div>
        }
      />

      <UIKitSection
        id="vendor-input"
        title="Input"
        description="Text input with Label — pair with Form in settings flows."
        code={`import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<Label htmlFor="demo">Label</Label>
<Input id="demo" placeholder="Type here…" />`}
        preview={
          <div className="space-y-2 max-w-sm">
            <label className="text-sm font-medium text-slate-700" htmlFor="ui-kit-input">
              Label
            </label>
            <Input id="ui-kit-input" placeholder="Type here…" />
          </div>
        }
      />

      <UIKitSection
        id="vendor-card"
        title="Card"
        description="Container for dashboard and settings panels."
        code={`import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>`}
        preview={
          <Card className="max-w-md border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Card title</CardTitle>
              <CardDescription className="text-slate-500">Short description</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-700 text-sm">Body content.</CardContent>
          </Card>
        }
      />

      <UIKitSection
        id="vendor-dialog"
        title="Dialog"
        description="Modal overlay — confirmations and focused tasks."
        code={`import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>`}
        preview={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-900">
              <DialogHeader>
                <DialogTitle>Example</DialogTitle>
                <DialogDescription>Dialog body — Radix focus trap.</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        }
      />

      <UIKitSection
        id="vendor-tabs"
        title="Tabs"
        description="Switch between related views without navigation."
        code={`import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="a">
  <TabsList>
    <TabsTrigger value="a">Tab A</TabsTrigger>
    <TabsTrigger value="b">Tab B</TabsTrigger>
  </TabsList>
  <TabsContent value="a">Content A</TabsContent>
  <TabsContent value="b">Content B</TabsContent>
</Tabs>`}
        preview={
          <Tabs defaultValue="a" className="max-w-md">
            <TabsList>
              <TabsTrigger value="a">Tab A</TabsTrigger>
              <TabsTrigger value="b">Tab B</TabsTrigger>
            </TabsList>
            <TabsContent value="a" className="text-sm text-slate-700 pt-2">
              Content A
            </TabsContent>
            <TabsContent value="b" className="text-sm text-slate-700 pt-2">
              Content B
            </TabsContent>
          </Tabs>
        }
      />

      <UIKitSection
        id="vendor-toast"
        title="Toast"
        description="Requires Toaster in app root — already mounted in App.tsx."
        code={`import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();
toast({ title: 'Done', description: '…' });`}
        preview={<ToastDemo />}
      />

      <UIKitSection
        id="vendor-calendar"
        title="Calendar"
        description="react-day-picker via shadcn — pair with date-fns for formatting."
        code={`import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">{format(date, 'PPP')}</Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>`}
        preview={
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal border-slate-300",
                  !calDate && "text-slate-500",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {calDate ? format(calDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar mode="single" selected={calDate} onSelect={setCalDate} initialFocus />
            </PopoverContent>
          </Popover>
        }
      />

      <UIKitSection
        id="vendor-form"
        title="Form + react-hook-form + zod"
        description="Validated fields — standard pattern for onboarding and settings."
        code={`import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const schema = z.object({ email: z.string().email() });
const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
    <Button type="submit">Submit</Button>
  </form>
</Form>`}
        preview={
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => {})}
              className="space-y-4 max-w-sm"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        }
      />

      <UIKitSection
        id="vendor-table"
        title="Table"
        description="Semantic table — use for analytics rows; consider typed columns for product."
        code={`import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Value</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>A</TableCell>
      <TableCell>1</TableCell>
    </TableRow>
  </TableBody>
</Table>`}
        preview={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-700">Metric</TableHead>
                <TableHead className="text-slate-700">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-slate-800">Calls</TableCell>
                <TableCell className="text-slate-800">42</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-slate-800">Leads</TableCell>
                <TableCell className="text-slate-800">12</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        }
      />

      <UIKitSection
        id="vendor-accordion"
        title="Accordion"
        description="FAQ-style disclosure — dense help content (reference: retail FAQ patterns)."
        code={`import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

<Accordion type="single" collapsible>
  <AccordionItem value="1">
    <AccordionTrigger>Question</AccordionTrigger>
    <AccordionContent>Answer</AccordionContent>
  </AccordionItem>
</Accordion>`}
        preview={
          <Accordion type="single" collapsible className="max-w-lg border border-slate-200 rounded-lg px-2">
            <AccordionItem value="1">
              <AccordionTrigger className="text-slate-800 text-sm">
                What is ClearVoice?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-sm">
                Voice-first AI OS canvas with PTT and governed agent behavior.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger className="text-slate-800 text-sm">
                Where do components live?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-sm">
                Platform wrappers under <code>@/ui</code>; primitives under <code>@/components/ui</code>.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        }
      />

      <section id="ai-os-placeholders" className="scroll-mt-24">
        <h3 className="text-lg font-semibold text-white mb-1">AI OS — still in ConciergePanel</h3>
        <p className="text-sm text-slate-400 mb-4 max-w-3xl">
          Full PTT region, transcript stream, DISC/ARCH editor, and safe-mode chrome remain in{" "}
          <code className="text-emerald-400/90">ConciergePanel</code> until extracted per{" "}
          <code className="text-emerald-400/90">UI_SDK_MATRIX.md</code> (VoiceDock, TranscriptPanel, etc.).
          Use the links in <strong>Compliance & onboarding</strong> and open{" "}
          <Link href="/chat/owner" className="text-emerald-400 hover:underline">
            /chat/owner
          </Link>{" "}
          for the production shell.
        </p>
      </section>
    </UIKitLayout>
  );
}

export default function UiKitPage() {
  if (!isUiKitEnabled()) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ backgroundColor: "#0f172a" }}
      >
        <h1 className="text-xl font-semibold text-white mb-2">ClearVoice Developer UI Kit</h1>
        <p className="text-slate-400 text-sm max-w-md">
          This page is only available in development (<code className="text-slate-300">import.meta.env.DEV</code>)
          or when <code className="text-slate-300">VITE_UI_KIT=1</code> is set in the build environment.
        </p>
      </div>
    );
  }

  return <UiKitContent />;
}
