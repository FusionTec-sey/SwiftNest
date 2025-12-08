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
  FileText,
  RotateCcw,
  Trash2,
  Eye,
  PieChart,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ChartOfAccount, LedgerEntryWithLines } from "@shared/schema";

const accountFormSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

const journalLineSchema = z.object({
  accountId: z.number().min(1, "Account is required"),
  debit: z.string().optional(),
  credit: z.string().optional(),
  memo: z.string().optional(),
});

const journalEntryFormSchema = z.object({
  entryDate: z.string().min(1, "Date is required"),
  module: z.enum(["RENT", "UTILITY", "MAINTENANCE", "LOAN", "DEPRECIATION", "MANUAL", "OTHER"]),
  memo: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, "At least 2 lines required"),
}).refine((data) => {
  const totalDebit = data.lines.reduce((sum, line) => sum + parseFloat(line.debit || "0"), 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + parseFloat(line.credit || "0"), 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}, { message: "Total debits must equal total credits" });

type JournalEntryFormData = z.infer<typeof journalEntryFormSchema>;

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num || 0);
};

interface TrialBalanceEntry {
  accountId: number;
  code: string;
  name: string;
  accountType: string;
  debit: number;
  credit: number;
}

export default function AccountingPage() {
  const { toast } = useToast();
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isJournalFormOpen, setIsJournalFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("RENT");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [viewingEntry, setViewingEntry] = useState<LedgerEntryWithLines | null>(null);

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

  const { data: accountBalance } = useQuery<{ debit: number; credit: number; balance: number }>({
    queryKey: ["/api/accounts", selectedAccountId, "balance"],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${selectedAccountId}/balance`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    enabled: !!selectedAccountId,
  });

  const accountForm = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: "",
      name: "",
      accountType: "EXPENSE",
      description: "",
    },
  });

  const journalForm = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntryFormSchema),
    defaultValues: {
      entryDate: new Date().toISOString().split("T")[0],
      module: "MANUAL",
      memo: "",
      lines: [
        { accountId: 0, debit: "", credit: "", memo: "" },
        { accountId: 0, debit: "", credit: "", memo: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: journalForm.control,
    name: "lines",
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      return apiRequest("POST", "/api/accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsAccountFormOpen(false);
      accountForm.reset();
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

  const createJournalEntryMutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      const entry = {
        entryDate: new Date(data.entryDate).toISOString(),
        module: data.module,
        memo: data.memo,
      };
      const lines = data.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.debit || "0",
        credit: line.credit || "0",
        memo: line.memo,
      }));
      return apiRequest("POST", "/api/ledger", { entry, lines });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      setIsJournalFormOpen(false);
      journalForm.reset({
        entryDate: new Date().toISOString().split("T")[0],
        module: "MANUAL",
        memo: "",
        lines: [
          { accountId: 0, debit: "", credit: "", memo: "" },
          { accountId: 0, debit: "", credit: "", memo: "" },
        ],
      });
      toast({
        title: "Journal entry created",
        description: "The journal entry has been posted successfully.",
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

  const reverseEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest("POST", `/api/ledger/${entryId}/reverse`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      toast({
        title: "Entry reversed",
        description: "The journal entry has been reversed successfully.",
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

  const trialBalance: TrialBalanceEntry[] = accounts?.map((account) => {
    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      debit: 0,
      credit: 0,
    };
  }) || [];

  const totalDebits = journalForm.watch("lines")?.reduce(
    (sum, line) => sum + parseFloat(line.debit || "0"),
    0
  ) || 0;
  const totalCredits = journalForm.watch("lines")?.reduce(
    (sum, line) => sum + parseFloat(line.credit || "0"),
    0
  ) || 0;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">
              Accounting
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your chart of accounts, journal entries, and financial reports
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button variant="outline" onClick={() => setIsAccountFormOpen(true)} data-testid="button-add-account">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
            <Button onClick={() => setIsJournalFormOpen(true)} data-testid="button-add-journal">
              <FileText className="h-4 w-4 mr-2" />
              New Journal Entry
            </Button>
          </div>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts" data-testid="tab-accounts">
              <Calculator className="h-4 w-4 mr-2" />
              Chart of Accounts
            </TabsTrigger>
            <TabsTrigger value="ledger" data-testid="tab-ledger">
              <BookOpen className="h-4 w-4 mr-2" />
              Ledger Entries
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
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
                              <TableHead className="text-right">Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeAccounts.map((account) => (
                              <TableRow 
                                key={account.id} 
                                data-testid={`row-account-${account.id}`}
                                className="cursor-pointer hover-elevate"
                                onClick={() => setSelectedAccountId(account.id)}
                              >
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
                  <SelectItem value="MANUAL">Manual Entries</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
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
                        <TableHead className="text-right">Actions</TableHead>
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
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setViewingEntry(entry)}
                                  data-testid={`button-view-entry-${entry.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!entry.isReversed && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => reverseEntryMutation.mutate(entry.id)}
                                    disabled={reverseEntryMutation.isPending}
                                    data-testid={`button-reverse-entry-${entry.id}`}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
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
                description={`No journal entries found for the ${selectedModule.toLowerCase()} module. Create a new journal entry to get started.`}
                actionLabel="New Journal Entry"
                onAction={() => setIsJournalFormOpen(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Trial Balance
                  </CardTitle>
                  <CardDescription>
                    Summary of all account balances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accounts && accounts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.map((entry) => (
                          <TableRow key={entry.accountId}>
                            <TableCell className="font-mono text-sm">{entry.code}</TableCell>
                            <TableCell>{entry.name}</TableCell>
                            <TableCell className="text-right">
                              {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold border-t-2">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(trialBalance.reduce((sum, e) => sum + e.debit, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(trialBalance.reduce((sum, e) => sum + e.credit, 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No accounts to display. Set up your chart of accounts first.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Account Summary
                  </CardTitle>
                  <CardDescription>
                    Overview by account type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accounts && accounts.length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(accountTypeLabels).map(([type, config]) => {
                        const count = groupedAccounts?.[type]?.length || 0;
                        const TypeIcon = config.icon;
                        return (
                          <div key={type} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                            <div className="flex items-center gap-3">
                              <TypeIcon className={`h-5 w-5 ${config.color}`} />
                              <span className="font-medium">{config.label}</span>
                            </div>
                            <Badge variant="secondary">{count} accounts</Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No accounts to display.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account in your chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit((data) => createAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={accountForm.control}
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
                control={accountForm.control}
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
                control={accountForm.control}
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
                control={accountForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsAccountFormOpen(false)}>
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

      <Dialog open={isJournalFormOpen} onOpenChange={setIsJournalFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>
              Create a double-entry journal entry. Debits must equal credits.
            </DialogDescription>
          </DialogHeader>
          <Form {...journalForm}>
            <form onSubmit={journalForm.handleSubmit((data) => createJournalEntryMutation.mutate(data))} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={journalForm.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-journal-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={journalForm.control}
                  name="module"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-journal-module">
                            <SelectValue placeholder="Select module" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RENT">Rent</SelectItem>
                          <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                          <SelectItem value="UTILITY">Utility</SelectItem>
                          <SelectItem value="LOAN">Loans</SelectItem>
                          <SelectItem value="DEPRECIATION">Depreciation</SelectItem>
                          <SelectItem value="MANUAL">Manual</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={journalForm.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memo (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Description of this journal entry" data-testid="input-journal-memo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Journal Lines</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ accountId: 0, debit: "", credit: "", memo: "" })}
                    data-testid="button-add-line"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line
                  </Button>
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Account</TableHead>
                        <TableHead className="w-[20%]">Debit</TableHead>
                        <TableHead className="w-[20%]">Credit</TableHead>
                        <TableHead className="w-[15%]">Memo</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.accountId`}
                              render={({ field }) => (
                                <Select 
                                  onValueChange={(v) => field.onChange(parseInt(v))} 
                                  value={field.value ? String(field.value) : ""}
                                >
                                  <SelectTrigger data-testid={`select-line-account-${index}`}>
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {accounts?.map((account) => (
                                      <SelectItem key={account.id} value={String(account.id)}>
                                        {account.code} - {account.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.debit`}
                              render={({ field }) => (
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  data-testid={`input-line-debit-${index}`}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.credit`}
                              render={({ field }) => (
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  data-testid={`input-line-credit-${index}`}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.memo`}
                              render={({ field }) => (
                                <Input {...field} placeholder="Note" data-testid={`input-line-memo-${index}`} />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            {fields.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                data-testid={`button-remove-line-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Totals</TableCell>
                        <TableCell className={!isBalanced ? "text-destructive" : ""}>
                          {formatCurrency(totalDebits)}
                        </TableCell>
                        <TableCell className={!isBalanced ? "text-destructive" : ""}>
                          {formatCurrency(totalCredits)}
                        </TableCell>
                        <TableCell colSpan={2}>
                          {isBalanced ? (
                            <Badge variant="secondary">Balanced</Badge>
                          ) : (
                            <Badge variant="destructive">Unbalanced</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsJournalFormOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createJournalEntryMutation.isPending || !isBalanced}
                  data-testid="button-submit-journal"
                >
                  {createJournalEntryMutation.isPending ? "Posting..." : "Post Entry"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Journal Entry Details</DialogTitle>
            <DialogDescription>
              {viewingEntry?.entryNumber} - {viewingEntry && new Date(viewingEntry.entryDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {viewingEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Module:</span>
                  <span className="ml-2 font-medium">{viewingEntry.module}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2">
                    {viewingEntry.isReversed ? (
                      <Badge variant="destructive">Reversed</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </span>
                </div>
              </div>
              {viewingEntry.memo && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Memo:</span>
                  <span className="ml-2">{viewingEntry.memo}</span>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Memo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingEntry.lines?.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {line.account ? `${line.account.code} - ${line.account.name}` : `Account #${line.accountId}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(line.debit || "0") > 0 ? formatCurrency(line.debit || 0) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(line.credit || "0") > 0 ? formatCurrency(line.credit || 0) : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{line.memo || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAccountId} onOpenChange={() => setSelectedAccountId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              {accounts?.find(a => a.id === selectedAccountId)?.code} - {accounts?.find(a => a.id === selectedAccountId)?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedAccountId && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Total Debits</p>
                  <p className="text-lg font-semibold">{formatCurrency(accountBalance?.debit || 0)}</p>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                  <p className="text-lg font-semibold">{formatCurrency(accountBalance?.credit || 0)}</p>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-lg font-semibold">{formatCurrency(accountBalance?.balance || 0)}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Type: {accounts?.find(a => a.id === selectedAccountId)?.accountType}</p>
                <p>Description: {accounts?.find(a => a.id === selectedAccountId)?.description || "None"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
