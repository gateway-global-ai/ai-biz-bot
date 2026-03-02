import { useQuery } from "@tanstack/react-query";
import { useCustomerAuth } from "@/lib/customerAuth";
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
import { FileText, ExternalLink } from "lucide-react";

interface InvoiceItem {
  id: string;
  created: number;
  amount_paid: number;
  invoice_pdf: string | null;
  description: string;
  category: string;
}

interface BillingHistoryResponse {
  invoices: InvoiceItem[];
}

function CategoryBadge({ category }: { category: string }) {
  const v = category?.toLowerCase() ?? "platform";
  const variant = v === "usage" ? "secondary" : v === "service" ? "outline" : "default";
  return <Badge variant={variant}>{v === "platform" ? "Platform" : v === "usage" ? "Usage" : "Service"}</Badge>;
}

export function BillingHistory() {
  const { token, isAuthenticated } = useCustomerAuth();

  const { data, isLoading } = useQuery<BillingHistoryResponse>({
    queryKey: ["/api/billing/history"],
    enabled: isAuthenticated && !!token,
    queryFn: async () => {
      const res = await fetch("/api/billing/history", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const invoices = data?.invoices ?? [];

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to view billing history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Billing History
        </CardTitle>
        <CardDescription>Recent paid invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No paid invoices yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(inv.created * 1000).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={inv.category} />
                  </TableCell>
                  <TableCell className="text-sm">{inv.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${((inv.amount_paid ?? 0) / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {inv.invoice_pdf ? (
                      <a
                        href={inv.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs"
                      >
                        PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
