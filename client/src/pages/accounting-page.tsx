import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Calculator,
  BookOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ChartOfAccount, LedgerEntryWithLines } from "@shared/schema";

const accountFormSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  description: z.string().optional(),
  parentAccountId: z.number().optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num || 0);
};

export default function AccountingPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("RENT");

  const { data: accounts, isLoading: accountsLoading } = useQuery<ChartOfAccount[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: ledgerEntries, isLoading: entriesLoading } = useQuery<LedgerEntryWithLines[]>({
    queryKey: ["/api/ledger", selectedModule],
    queryFn: async () => {
      const res = await fetch(`/api/ledger/${selectedModule}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ledger entries");
      return res.json();
    },
  });

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: "",
      name: "",
      accountType: "EXPENSE",
      description: "",
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      return apiRequest("POST", "/api/accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsFormOpen(false);
      form.reset();
      toast({
        title: "Account created",
        description: "The account has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const seedAccountsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/accounts/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Accounts seeded",
        description: "Default chart of accounts has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const groupedAccounts = accounts?.reduce(
    (acc, account) => {
      if (!acc[account.accountType]) {
        acc[account.accountType] = [];
      }
      acc[account.accountType].push(account);
      return acc;
    },
    {} as Record<string, ChartOfAccount[]>
  );

  const accountTypeLabels: Record<string, { label: string; icon: typeof DollarSign; color: string }> = {
    ASSET: { label: "Assets", icon: TrendingUp, color: "text-green-600" },
    LIABILITY: { label: "Liabilities", icon: TrendingDown, color: "text-red-600" },
    EQUITY: { label: "Equity", icon: DollarSign, color: "text-blue-600" },
    INCOME: { label: "Income", icon: ArrowUpRight, color: "text-emerald-600" },
    EXPENSE: { label: "Expenses", icon: ArrowDownRight, color: "text-orange-600" },
  };

  const filteredAccounts = accounts?.filter(
    (account) =>
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">
              Accounting
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your chart of accounts and journal entries
            </p>
          </div>
          <div className="flex gap-2">
            {(!accounts || accounts.length === 0) && (
              <Button
                variant="outline"
                onClick={() => seedAccountsMutation.mutate()}
                disabled={seedAccountsMutation.isPending}
                data-testid="button-seed-accounts"
              >
                {seedAccountsMutation.isPending ? "Setting up..." : "Setup Default Accounts"}
              </Button>
            )}
            <Button className="gap-2" onClick={() => setIsFormOpen(true)} data-testid="button-add-account">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts" data-testid="tab-accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="ledger" data-testid="tab-ledger">Ledger Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-6">
            <div className="mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-accounts"
                />
              </div>
            </div>

            {accountsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : filteredAccounts && filteredAccounts.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(accountTypeLabels).map(([type, config]) => {
                  const typeAccounts = groupedAccounts?.[type] || [];
                  if (typeAccounts.length === 0) return null;

                  const TypeIcon = config.icon;

                  return (
                    <Card key={type} data-testid={`card-account-type-${type.toLowerCase()}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TypeIcon className={`h-5 w-5 ${config.color}`} />
                          {config.label}
                          <Badge variant="secondary" className="ml-2">
                            {typeAccounts.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-24">Code</TableHead>
                              <TableHead>Account Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">System</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeAccounts.map((account) => (
                              <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                                <TableCell className="font-mono text-sm">{account.code}</TableCell>
                                <TableCell className="font-medium">{account.name}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {account.description || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {account.isSystem ? (
                                    <Badge variant="secondary">System</Badge>
                                  ) : (
                                    <Badge variant="outline">Custom</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Calculator}
                title="No accounts yet"
                description="Get started by setting up your chart of accounts. You can use the default accounts or create custom ones."
                actionLabel="Setup Default Accounts"
                onAction={() => seedAccountsMutation.mutate()}
              />
            )}
          </TabsContent>

          <TabsContent value="ledger" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-48" data-testid="select-module">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RENT">Rent</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="LOAN">Loans</SelectItem>
                  <SelectItem value="DEPRECIATION">Depreciation</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entriesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : ledgerEntries && ledgerEntries.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Journal Entries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Memo</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerEntries.map((entry) => {
                        const totalDebit = entry.lines?.reduce(
                          (sum, l) => sum + parseFloat(l.debit || "0"),
                          0
                        );
                        const totalCredit = entry.lines?.reduce(
                          (sum, l) => sum + parseFloat(l.credit || "0"),
                          0
                        );

                        return (
                          <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                            <TableCell className="font-mono text-sm">
                              {entry.entryNumber}
                            </TableCell>
                            <TableCell>
                              {new Date(entry.entryDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{entry.memo || "-"}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totalDebit || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totalCredit || 0)}
                            </TableCell>
                            <TableCell>
                              {entry.isReversed ? (
                                <Badge variant="destructive">Reversed</Badge>
                              ) : (
                                <Badge variant="secondary">Active</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No journal entries"
                description={`No journal entries found for the ${selectedModule.toLowerCase()} module.`}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account in your chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ASSET">Asset</SelectItem>
                        <SelectItem value="LIABILITY">Liability</SelectItem>
                        <SelectItem value="EQUITY">Equity</SelectItem>
                        <SelectItem value="INCOME">Income</SelectItem>
                        <SelectItem value="EXPENSE">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 1001" data-testid="input-account-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Office Supplies" data-testid="input-account-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-account-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAccountMutation.isPending} data-testid="button-submit-account">
                  {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
