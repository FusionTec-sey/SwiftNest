import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  FileText,
  DollarSign,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Building2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Lease, RentInvoice, Payment, Property, Tenant } from "@shared/schema";

const paymentFormSchema = z.object({
  invoiceId: z.number(),
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "CARD", "OTHER"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

const formatCurrency = (amount: string | number | null | undefined) => {
  if (!amount) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface LeaseWithDetails extends Lease {
  property?: Property;
  tenant?: Tenant;
}

interface InvoiceWithLease extends RentInvoice {
  lease?: LeaseWithDetails;
}

export default function RentCollectionPage() {
  const { toast } = useToast();
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithLease | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: leases, isLoading: leasesLoading } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/leases"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<RentInvoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ["/api/payments/TENANT/0"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: 0,
      amount: "",
      paymentMethod: "BANK_TRANSFER",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      notes: "",
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (leaseId: number) => {
      const response = await apiRequest("POST", `/api/leases/${leaseId}/generate-invoice`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice generated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate invoice", description: error.message, variant: "destructive" });
    },
  });

  const generateAllInvoicesMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await apiRequest("POST", "/api/leases/generate-all-invoices");
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      toast({ title: `Generated ${data.invoices?.length || 0} invoices` });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({ title: "Failed to generate invoices", description: error.message, variant: "destructive" });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const invoice = invoices?.find((i) => i.id === data.invoiceId);
      if (!invoice) throw new Error("Invoice not found");
      const lease = leases?.find((l) => l.id === invoice.leaseId);
      if (!lease) throw new Error("Lease not found");
      const response = await apiRequest("POST", "/api/payments", {
        payerType: "TENANT",
        payerId: lease.tenantId,
        appliedToType: "RENT_INVOICE",
        appliedToId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: new Date(data.paymentDate),
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment recorded successfully" });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record payment", description: error.message, variant: "destructive" });
    },
  });

  const getPropertyName = (propertyId: number) => {
    return properties?.find((p) => p.id === propertyId)?.name || "Unknown Property";
  };

  const getTenantName = (tenantId: number) => {
    return tenants?.find((t) => t.id === tenantId)?.legalName || "Unknown Tenant";
  };

  const getInvoiceStatus = (invoice: RentInvoice) => {
    if (invoice.status === "PAID") return { label: "Paid", variant: "default" as const, icon: CheckCircle2 };
    if (invoice.status === "PARTIALLY_PAID") return { label: "Partial", variant: "secondary" as const, icon: Clock };
    if (new Date(invoice.dueDate) < new Date()) return { label: "Overdue", variant: "destructive" as const, icon: AlertCircle };
    return { label: invoice.status, variant: "outline" as const, icon: Clock };
  };

  const handleDownloadPDF = async (invoiceId: number) => {
    try {
      window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
    } catch (error) {
      toast({ title: "Failed to download invoice", variant: "destructive" });
    }
  };

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      window.open(`/api/payments/${paymentId}/receipt`, "_blank");
    } catch (error) {
      toast({ title: "Failed to download receipt", variant: "destructive" });
    }
  };

  const handleRecordPayment = (invoice: InvoiceWithLease) => {
    const remaining = parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid || "0");
    paymentForm.reset({
      invoiceId: invoice.id,
      amount: remaining.toFixed(2),
      paymentMethod: "BANK_TRANSFER",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      notes: "",
    });
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  const activeLeases = leases?.filter((l) => l.status === "ACTIVE") || [];
  const pendingInvoices = invoices?.filter((i) => i.status !== "PAID") || [];
  const overdueInvoices = invoices?.filter((i) => i.status !== "PAID" && new Date(i.dueDate) < new Date()) || [];

  const totalOutstanding = pendingInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.totalAmount) - parseFloat(inv.amountPaid || "0"),
    0
  );

  const totalCollectedThisMonth = invoices
    ?.filter((i) => {
      const invoiceDate = new Date(i.createdAt || Date.now());
      const now = new Date();
      return invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + parseFloat(inv.amountPaid || "0"), 0) || 0;

  if (leasesLoading || invoicesLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Rent Collection</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Rent Collection</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => generateAllInvoicesMutation.mutate()}
            disabled={isGenerating || activeLeases.length === 0}
            data-testid="button-generate-all-invoices"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            Generate Due Invoices
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Active Leases</p>
                <p className="text-2xl font-bold" data-testid="text-active-leases-count">{activeLeases.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invoices</p>
                <p className="text-2xl font-bold" data-testid="text-pending-invoices-count">{pendingInvoices.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-destructive" data-testid="text-total-outstanding">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Collected This Month</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-collected-this-month">
                  {formatCurrency(totalCollectedThisMonth)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {overdueInvoices.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Overdue Invoices ({overdueInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="hidden sm:table-cell">Property</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.map((invoice) => {
                    const lease = leases?.find((l) => l.id === invoice.leaseId);
                    const remaining = parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid || "0");
                    return (
                      <TableRow key={invoice.id} data-testid={`row-overdue-invoice-${invoice.id}`}>
                        <TableCell>
                          <div className="font-mono text-sm">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-destructive md:hidden">{formatDate(invoice.dueDate)}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{lease ? getPropertyName(lease.propertyId) : "-"}</TableCell>
                        <TableCell>
                          <div>{lease ? getTenantName(lease.tenantId) : "-"}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">{lease ? getPropertyName(lease.propertyId) : "-"}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-destructive">{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(remaining)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRecordPayment({ ...invoice, lease })}
                              data-testid={`button-record-payment-${invoice.id}`}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(invoice.id)}
                              data-testid={`button-download-invoice-${invoice.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices" data-testid="tab-invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="leases" data-testid="tab-leases">Active Leases</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Rent Invoices</CardTitle>
              <CardDescription>Manage and track all rent invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="hidden lg:table-cell">Property</TableHead>
                        <TableHead className="hidden sm:table-cell">Tenant</TableHead>
                        <TableHead className="hidden xl:table-cell">Period</TableHead>
                        <TableHead className="hidden md:table-cell">Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const lease = leases?.find((l) => l.id === invoice.leaseId);
                        const status = getInvoiceStatus(invoice);
                        const StatusIcon = status.icon;
                        return (
                          <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                            <TableCell>
                              <div className="font-mono text-sm">{invoice.invoiceNumber}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">{lease ? getTenantName(lease.tenantId) : "-"}</div>
                              <div className="text-xs text-muted-foreground md:hidden">{formatDate(invoice.dueDate)}</div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{lease ? getPropertyName(lease.propertyId) : "-"}</TableCell>
                            <TableCell className="hidden sm:table-cell">{lease ? getTenantName(lease.tenantId) : "-"}</TableCell>
                            <TableCell className="hidden xl:table-cell text-sm">
                              {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{formatDate(invoice.dueDate)}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                <span className="hidden sm:inline">{status.label}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">{formatCurrency(invoice.totalAmount)}</div>
                              {parseFloat(invoice.amountPaid || "0") > 0 && (
                                <div className="text-xs text-muted-foreground">Paid: {formatCurrency(invoice.amountPaid || "0")}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {invoice.status !== "PAID" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleRecordPayment({ ...invoice, lease })}
                                    data-testid={`button-record-payment-${invoice.id}`}
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDownloadPDF(invoice.id)}
                                  data-testid={`button-download-invoice-${invoice.id}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No invoices yet"
                  description="Generate invoices from your active leases to get started with rent collection."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases">
          <Card>
            <CardHeader>
              <CardTitle>Active Leases</CardTitle>
              <CardDescription>Generate invoices for active leases</CardDescription>
            </CardHeader>
            <CardContent>
              {activeLeases.length > 0 ? (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead className="hidden sm:table-cell">Tenant</TableHead>
                        <TableHead>Rent</TableHead>
                        <TableHead className="hidden md:table-cell">Due Day</TableHead>
                        <TableHead className="hidden lg:table-cell">Next Invoice</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeLeases.map((lease) => (
                        <TableRow key={lease.id} data-testid={`row-lease-${lease.id}`}>
                          <TableCell>
                            <div className="font-medium">{getPropertyName(lease.propertyId)}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{getTenantName(lease.tenantId)}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{getTenantName(lease.tenantId)}</TableCell>
                          <TableCell>
                            <div>{formatCurrency(lease.rentAmount)}</div>
                            <div className="text-xs text-muted-foreground md:hidden">Day {lease.paymentDueDay || 1}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">Day {lease.paymentDueDay || 1}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {lease.nextInvoiceDate ? formatDate(lease.nextInvoiceDate) : "Not set"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateInvoiceMutation.mutate(lease.id)}
                              disabled={generateInvoiceMutation.isPending}
                              data-testid={`button-generate-invoice-${lease.id}`}
                            >
                              <Plus className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Generate</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No active leases"
                  description="Create leases in the Leases section to start collecting rent."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit((data) => recordPaymentMutation.mutate(data))} className="space-y-6">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={paymentForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-payment-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={paymentForm.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            <SelectItem value="CHECK">Check</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={paymentForm.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-payment-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={paymentForm.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Transaction ID, check number" data-testid="input-reference-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={paymentForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Additional notes (optional)" data-testid="input-payment-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  data-testid="button-cancel-payment"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  data-testid="button-submit-payment"
                >
                  {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
