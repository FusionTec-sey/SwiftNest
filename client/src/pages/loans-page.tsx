import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Landmark, Plus, Trash2, Calendar, DollarSign, Percent, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EmptyState } from "@/components/empty-state";
import type { Loan, Owner, Property } from "@shared/schema";

const loanFormSchema = z.object({
  ownerId: z.number().min(1, "Owner is required"),
  propertyId: z.number().optional(),
  lenderName: z.string().min(1, "Lender name is required"),
  loanReference: z.string().optional(),
  currency: z.string().default("SCR"),
  principal: z.string().min(1, "Principal amount is required"),
  interestRate: z.string().min(1, "Interest rate is required"),
  compounding: z.enum(["SIMPLE", "COMPOUND"]).default("SIMPLE"),
  termMonths: z.number().min(1, "Term is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  paymentFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  amortizationMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]).default("REDUCING_BALANCE"),
  notes: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanFormSchema>;

const formatCurrency = (amount: string | number | null, currency = "SCR") => {
  if (!amount) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(num);
};

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

export default function LoansPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
  });

  const { data: owners } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      ownerId: 0,
      lenderName: "",
      loanReference: "",
      currency: "SCR",
      principal: "",
      interestRate: "",
      compounding: "SIMPLE",
      termMonths: 12,
      startDate: "",
      endDate: "",
      paymentFrequency: "MONTHLY",
      amortizationMethod: "REDUCING_BALANCE",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LoanFormData) => {
      if (editingLoan) {
        return apiRequest("PATCH", `/api/loans/${editingLoan.id}`, data);
      }
      return apiRequest("POST", "/api/loans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      setIsFormOpen(false);
      setEditingLoan(null);
      form.reset();
      toast({
        title: editingLoan ? "Loan updated" : "Loan created",
        description: editingLoan
          ? "The loan has been updated successfully."
          : "A new loan has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the loan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/loans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      setDeletingLoan(null);
      toast({
        title: "Loan deleted",
        description: "The loan has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the loan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openNewForm = () => {
    setEditingLoan(null);
    form.reset({
      ownerId: 0,
      lenderName: "",
      loanReference: "",
      currency: "SCR",
      principal: "",
      interestRate: "",
      compounding: "SIMPLE",
      termMonths: 12,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      paymentFrequency: "MONTHLY",
      amortizationMethod: "REDUCING_BALANCE",
      notes: "",
    });
    setIsFormOpen(true);
  };

  const getOwnerName = (ownerId: number) => {
    return owners?.find((o) => o.id === ownerId)?.legalName || "Unknown Owner";
  };

  const getPropertyName = (propertyId: number | null) => {
    if (!propertyId) return null;
    return properties?.find((p) => p.id === propertyId)?.name;
  };

  const filteredLoans = loans?.filter((loan) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      loan.lenderName.toLowerCase().includes(searchLower) ||
      (loan.loanReference?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <h1 className="text-2xl font-semibold">Loans</h1>
            <p className="text-sm text-muted-foreground">
              Manage property loans and amortization schedules
            </p>
          </div>
          <Button onClick={openNewForm} data-testid="button-add-loan">
            <Plus className="mr-2 h-4 w-4" />
            Add Loan
          </Button>
        </div>
        <div className="px-4 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search loans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-loans"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {filteredLoans && filteredLoans.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLoans.map((loan) => (
              <Card key={loan.id} data-testid={`card-loan-${loan.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate flex items-center gap-2">
                        <Landmark className="h-4 w-4 shrink-0" />
                        {loan.lenderName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getOwnerName(loan.ownerId)}
                        {getPropertyName(loan.propertyId) && (
                          <span className="block text-xs">{getPropertyName(loan.propertyId)}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingLoan(loan)}
                        data-testid={`button-delete-loan-${loan.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={loan.isActive ? "default" : "secondary"}>
                      {loan.isActive ? "Active" : "Closed"}
                    </Badge>
                    <Badge variant="outline">{loan.paymentFrequency}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Principal
                      </span>
                      <span className="font-medium">{formatCurrency(loan.principal, loan.currency)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Interest Rate
                      </span>
                      <span>{loan.interestRate}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Term
                      </span>
                      <span>{loan.termMonths} months</span>
                    </div>

                    {loan.outstandingBalance && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Outstanding</span>
                        <span className="font-medium">{formatCurrency(loan.outstandingBalance, loan.currency)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Start Date</span>
                      <span>{formatDate(loan.startDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Landmark}
            title="No loans yet"
            description="Add your first loan to start tracking amortization."
            actionLabel="Add Your First Loan"
            onAction={openNewForm}
          />
        )}
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLoan ? "Edit Loan" : "Add New Loan"}</DialogTitle>
            <DialogDescription>
              {editingLoan
                ? "Update the loan details."
                : "Add a new loan to track amortization."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-owner">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {owners?.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id.toString()}>
                            {owner.legalName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property (Optional)</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val && val !== "none" ? parseInt(val) : undefined)}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Property</SelectItem>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lenderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lender Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lender-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loanReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Reference</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-loan-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="principal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Principal</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-principal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-interest-rate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term (Months)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-term-months"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="compounding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compounding</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-compounding">
                            <SelectValue placeholder="Select compounding" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIMPLE">Simple Interest</SelectItem>
                          <SelectItem value="COMPOUND">Compound Interest</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amortizationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amortization Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-amortization-method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                        <SelectItem value="REDUCING_BALANCE">Reducing Balance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-loan">
                  {createMutation.isPending ? "Saving..." : editingLoan ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLoan} onOpenChange={() => setDeletingLoan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the loan from "{deletingLoan?.lenderName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLoan && deleteMutation.mutate(deletingLoan.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
