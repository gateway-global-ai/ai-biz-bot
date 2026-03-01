import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";

const MONTHLY_RECURRING_PER_CLIENT = 15;
const MONTHLY_USAGE_BOUNTY_PER_CLIENT = 5;

export default function GrowthCalculator() {
  const [targetClients, setTargetClients] = useState(10);

  const monthlyRecurring = targetClients * MONTHLY_RECURRING_PER_CLIENT;
  const monthlyUsage = targetClients * MONTHLY_USAGE_BOUNTY_PER_CLIENT;
  const monthlyTotal = monthlyRecurring + monthlyUsage;
  const sixMonths = monthlyTotal * 6;
  const twelveMonths = monthlyTotal * 12;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Growth Calculator
        </CardTitle>
        <CardDescription>
          Projected earnings by number of clients (platform + usage bounties).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="target-clients">Target number of clients</Label>
          <Input
            id="target-clients"
            type="number"
            min={1}
            max={500}
            value={targetClients}
            onChange={(e) => setTargetClients(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground">Monthly recurring ({MONTHLY_RECURRING_PER_CLIENT}/client)</p>
            <p className="text-xl font-semibold">${monthlyRecurring.toFixed(0)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground">Monthly usage bounties (~{MONTHLY_USAGE_BOUNTY_PER_CLIENT}/client)</p>
            <p className="text-xl font-semibold">${monthlyUsage.toFixed(0)}</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">Estimated monthly total</p>
          <p className="text-2xl font-bold">${monthlyTotal.toFixed(0)}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">6 months:</span>
          <span className="font-medium">${sixMonths.toFixed(0)}</span>
          <span className="text-muted-foreground">12 months:</span>
          <span className="font-medium">${twelveMonths.toFixed(0)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
