import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, Zap } from "lucide-react";

interface CommissionRow {
  id: string;
  siteConfigId: string | null;
  amount: number;
  commission: number;
  type: string;
  status: string;
  createdAt: string;
}

interface CommissionsResponse {
  commissions: CommissionRow[];
  totalEarnings: number;
  activeClients: number;
  energyBounties: number;
}

function getAuthHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function CommissionReport() {
  const { token, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery<CommissionsResponse>({
    queryKey: ["/api/reseller/commissions"],
    enabled: isAuthenticated && !!token,
    queryFn: async () => {
      const res = await fetch("/api/reseller/commissions", { headers: getAuthHeaders(token) });
      if (!res.ok) {
        if (res.status === 403) return { commissions: [], totalEarnings: 0, activeClients: 0, energyBounties: 0 };
        throw new Error(await res.text());
      }
      return res.json();
    },
  });

  if (!isAuthenticated) return null;

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;

  const { commissions = [], totalEarnings = 0, activeClients = 0, energyBounties = 0 } = data ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commissions</CardTitle>
        <CardDescription>Earnings by client and type</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total earnings</span>
            </div>
            <p className="text-2xl font-semibold">${totalEarnings.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Active clients</span>
            </div>
            <p className="text-2xl font-semibold">{activeClients}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Energy bounties</span>
            </div>
            <p className="text-2xl font-semibold">${energyBounties.toFixed(2)}</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client (site)</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total sale</TableHead>
              <TableHead className="text-right">Your share</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No commissions yet.
                </TableCell>
              </TableRow>
            ) : (
              commissions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.siteConfigId ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.type === "REFILL" ? "secondary" : "outline"}>{c.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${c.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${c.commission.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "PAID" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
