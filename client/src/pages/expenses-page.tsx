import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Building2,
  User,
  FileText,
  DollarSign,
  Clock,
  Check,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Wrench,
  Shield,
  Camera,
  Upload,
  X,
  Image,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FormDescription,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { 
  ExpenseWithDetails, 
  Owner, 
  Property, 
  Unit 
} from "@shared/schema";

const expenseCategories = [
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "DOCUMENT_FEES", label: "Document Fees" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "PROPERTY_TAX", label: "Property Tax" },
  { value: "LEGAL_FEES", label: "Legal Fees" },
  { value: "PROFESSIONAL_SERVICES", label: "Professional Services" },
  { value: "MANAGEMENT_FEES", label: "Management Fees" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TRAVEL", label: "Travel" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "OTHER", label: "Other" },
];

const paymentStatuses = [
  { value: "UNPAID", label: "Unpaid", color: "destructive" },
  { value: "PAID", label: "Paid", color: "default" },
  { value: "PARTIALLY_PAID", label: "Partially Paid", color: "secondary" },
  { value: "CANCELLED", label: "Cancelled", color: "outline" },
];

const approvalStatuses = [
  { value: "PENDING", label: "Pending Approval", color: "secondary" },
  { value: "APPROVED", label: "Approved", color: "default" },
  { value: "REJECTED", label: "Rejected", color: "destructive" },
];

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "OTHER", label: "Other" },
];

const expenseFormSchema = z.object({
  ownerId: z.number().min(1, "Owner is required"),
  propertyId: z.number().optional().nullable(),
  unitId: z.number().optional().nullable(),
  category: z.enum([
    "MAINTENANCE", "DOCUMENT_FEES", "INSURANCE", "UTILITIES", "PROPERTY_TAX",
    "LEGAL_FEES", "PROFESSIONAL_SERVICES", "MANAGEMENT_FEES", "MARKETING",
    "TRAVEL", "OFFICE_SUPPLIES", "OTHER"
  ]),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Amount must be positive"),
  taxAmount: z.string().optional().default("0"),
  expenseDate: z.date({ required_error: "Expense date is required" }),
  vendorName: z.string().optional().nullable(),
  vendorTaxId: z.string().optional().nullable(),
  vendorContact: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  paymentStatus: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID", "CANCELLED"]).default("UNPAID"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "UPI", "OTHER"]).optional().nullable(),
  paymentDate: z.date().optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

function getStatusBadge(status: string) {
  const config = paymentStatuses.find(s => s.value === status);
  if (!config) return <Badge variant="outline">{status}</Badge>;
  
  return (
    <Badge variant={config.color as "default" | "secondary" | "destructive" | "outline"}>
      {config.label}
    </Badge>
  );
}

function getCategoryBadge(category: string) {
  const config = expenseCategories.find(c => c.value === category);
  return <Badge variant="secondary">{config?.label || category}</Badge>;
}

function getApprovalStatusBadge(status: string) {
  const config = approvalStatuses.find(s => s.value === status);
  if (!config) return <Badge variant="outline">{status}</Badge>;
  
  return (
    <Badge variant={config.color as "default" | "secondary" | "destructive" | "outline"}>
      {config.label}
    </Badge>
  );
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const filterOwnerId = urlParams.get("owner");
  const filterPropertyId = urlParams.get("property");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [rejectingExpense, setRejectingExpense] = useState<ExpenseWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const validOwnerId = filterOwnerId && !isNaN(parseInt(filterOwnerId)) ? parseInt(filterOwnerId) : null;
  const validPropertyId = filterPropertyId && !isNaN(parseInt(filterPropertyId)) ? parseInt(filterPropertyId) : null;

  const { data: owners, isLoading: ownersLoading } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: allExpenses, isLoading: expensesLoading } = useQuery<ExpenseWithDetails[]>({
    queryKey: ["/api/expenses"],
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      ownerId: validOwnerId || 0,
      propertyId: null,
      unitId: null,
      category: "OTHER",
      description: "",
      amount: "",
      taxAmount: "0",
      expenseDate: new Date(),
      vendorName: "",
      vendorTaxId: "",
      vendorContact: "",
      invoiceNumber: "",
      paymentStatus: "UNPAID",
      paymentMethod: null,
      paymentDate: null,
      paymentReference: "",
      notes: "",
    },
  });

  const watchOwnerId = form.watch("ownerId");
  const watchPropertyId = form.watch("propertyId");
  const watchPaymentStatus = form.watch("paymentStatus");

  const ownerProperties = useMemo(() => {
    if (!properties || !watchOwnerId) return [];
    return properties.filter(p => {
      const ownerships = (p as any).ownerships || [];
      return ownerships.some((o: any) => o.ownerId === watchOwnerId) ||
             (p as any).ownerUserId === watchOwnerId;
    });
  }, [properties, watchOwnerId]);

  const { data: propertyUnits } = useQuery<Unit[]>({
    queryKey: ["/api/properties", watchPropertyId, "units"],
    enabled: !!watchPropertyId && watchPropertyId > 0,
  });

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];
    
    let filtered = [...allExpenses];
    
    if (validOwnerId) {
      filtered = filtered.filter(e => e.ownerId === validOwnerId);
    }
    
    if (validPropertyId) {
      filtered = filtered.filter(e => e.propertyId === validPropertyId);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(query) ||
        e.vendorName?.toLowerCase().includes(query) ||
        e.invoiceNumber?.toLowerCase().includes(query)
      );
    }
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(e => e.paymentStatus === statusFilter);
    }
    
    if (activeTab === "unpaid") {
      filtered = filtered.filter(e => e.paymentStatus === "UNPAID" || e.paymentStatus === "PARTIALLY_PAID");
    } else if (activeTab === "paid") {
      filtered = filtered.filter(e => e.paymentStatus === "PAID");
    } else if (activeTab === "pending_approval") {
      filtered = filtered.filter(e => e.approvalStatus === "PENDING");
    }
    
    return filtered.sort((a, b) => 
      new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
    );
  }, [allExpenses, validOwnerId, validPropertyId, searchQuery, categoryFilter, statusFilter, activeTab]);

  const stats = useMemo(() => {
    if (!filteredExpenses) return { total: 0, unpaid: 0, paid: 0, totalAmount: 0, unpaidAmount: 0 };
    
    const total = filteredExpenses.length;
    const unpaid = filteredExpenses.filter(e => e.paymentStatus === "UNPAID" || e.paymentStatus === "PARTIALLY_PAID").length;
    const paid = filteredExpenses.filter(e => e.paymentStatus === "PAID").length;
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
    const unpaidAmount = filteredExpenses
      .filter(e => e.paymentStatus === "UNPAID" || e.paymentStatus === "PARTIALLY_PAID")
      .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
    
    return { total, unpaid, paid, totalAmount, unpaidAmount };
  }, [filteredExpenses]);

  const invalidateExpenseQueries = (ownerId?: number | null, propertyId?: number | null) => {
    queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    if (propertyId && typeof propertyId === 'number' && propertyId > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/property", propertyId] });
    }
    if (ownerId && typeof ownerId === 'number' && ownerId > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/owner", ownerId] });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const totalAmount = parseFloat(data.amount) + parseFloat(data.taxAmount || "0");
      const payload = {
        ...data,
        totalAmount: totalAmount.toString(),
        propertyId: data.propertyId || null,
        unitId: data.unitId || null,
        paymentMethod: data.paymentMethod || null,
        paymentDate: data.paymentDate?.toISOString() || null,
        expenseDate: data.expenseDate.toISOString(),
      };
      return apiRequest("POST", "/api/expenses", payload);
    },
    onSuccess: async (data: any, variables) => {
      if (pendingFiles.length > 0 && data?.id) {
        setIsUploadingFiles(true);
        try {
          await uploadAttachmentsMutation.mutateAsync({ expenseId: data.id, files: pendingFiles });
        } finally {
          setIsUploadingFiles(false);
        }
      }
      invalidateExpenseQueries(variables.ownerId, variables.propertyId);
      setIsFormOpen(false);
      form.reset();
      setPendingFiles([]);
      toast({ title: "Expense created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create expense", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ExpenseFormData & { id: number }) => {
      const { id, ...rest } = data;
      const totalAmount = parseFloat(rest.amount) + parseFloat(rest.taxAmount || "0");
      const payload = {
        ...rest,
        totalAmount: totalAmount.toString(),
        propertyId: rest.propertyId || null,
        unitId: rest.unitId || null,
        paymentMethod: rest.paymentMethod || null,
        paymentDate: rest.paymentDate?.toISOString() || null,
        expenseDate: rest.expenseDate.toISOString(),
      };
      return apiRequest("PATCH", `/api/expenses/${id}`, payload);
    },
    onSuccess: (_data, variables) => {
      invalidateExpenseQueries(variables.ownerId, variables.propertyId);
      setIsFormOpen(false);
      setEditingExpense(null);
      form.reset();
      toast({ title: "Expense updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update expense", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      invalidateExpenseQueries(validOwnerId, validPropertyId);
      setDeletingExpense(null);
      toast({ title: "Expense deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete expense", description: error.message, variant: "destructive" });
    },
  });

  const uploadAttachmentsMutation = useMutation({
    mutationFn: async ({ expenseId, files }: { expenseId: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      const response = await fetch(`/api/expenses/${expenseId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload attachments");
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateExpenseQueries(validOwnerId, validPropertyId);
      setPendingFiles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload attachments",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ expenseId, url }: { expenseId: number; url: string }) => {
      return apiRequest("DELETE", `/api/expenses/${expenseId}/attachments`, { url });
    },
    onSuccess: () => {
      invalidateExpenseQueries(validOwnerId, validPropertyId);
      toast({ title: "Attachment removed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove attachment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/expenses/${id}`, { approvalStatus: "APPROVED" });
    },
    onSuccess: (_data, id) => {
      invalidateExpenseQueries(validOwnerId, validPropertyId);
      toast({ title: "Expense approved" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectExpenseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      return apiRequest("PATCH", `/api/expenses/${id}`, { 
        approvalStatus: "REJECTED",
        notes: reason ? `Rejection reason: ${reason}` : undefined
      });
    },
    onSuccess: () => {
      invalidateExpenseQueries(validOwnerId, validPropertyId);
      setRejectingExpense(null);
      setRejectionReason("");
      toast({ title: "Expense rejected" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenForm = (expense?: ExpenseWithDetails) => {
    if (expense) {
      setEditingExpense(expense);
      form.reset({
        ownerId: expense.ownerId,
        propertyId: expense.propertyId || null,
        unitId: expense.unitId || null,
        category: expense.category as ExpenseFormData["category"],
        description: expense.description,
        amount: expense.amount,
        taxAmount: expense.taxAmount || "0",
        expenseDate: new Date(expense.expenseDate),
        vendorName: expense.vendorName || "",
        vendorTaxId: expense.vendorTaxId || "",
        vendorContact: expense.vendorContact || "",
        invoiceNumber: expense.invoiceNumber || "",
        paymentStatus: expense.paymentStatus as ExpenseFormData["paymentStatus"],
        paymentMethod: expense.paymentMethod as ExpenseFormData["paymentMethod"] || null,
        paymentDate: expense.paymentDate ? new Date(expense.paymentDate) : null,
        paymentReference: expense.paymentReference || "",
        notes: expense.notes || "",
      });
    } else {
      setEditingExpense(null);
      form.reset({
        ownerId: validOwnerId || 0,
        propertyId: validPropertyId || null,
        category: "OTHER",
        description: "",
        amount: "",
        taxAmount: "0",
        expenseDate: new Date(),
        paymentStatus: "UNPAID",
      });
    }
    setPendingFiles([]);
    setIsFormOpen(true);
  };

  const onSubmit = (data: ExpenseFormData) => {
    if (editingExpense) {
      updateMutation.mutate({ ...data, id: editingExpense.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = ownersLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-expenses">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                  <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-unpaid">{stats.unpaid}</p>
                  <p className="text-xs text-muted-foreground">Unpaid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-paid">{stats.paid}</p>
                  <p className="text-xs text-muted-foreground">Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-unpaid-amount">{formatCurrency(stats.unpaidAmount)}</p>
                  <p className="text-xs text-muted-foreground">Unpaid Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Expenses
              </CardTitle>
              <CardDescription>
                {validOwnerId || validPropertyId 
                  ? "Filtered expense records" 
                  : "All expense records across your portfolio"}
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()} data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-expenses"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {paymentStatuses.map(st => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="pending_approval" data-testid="tab-pending-approval">
                  Pending Approval
                  {allExpenses && allExpenses.filter(e => e.approvalStatus === "PENDING").length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {allExpenses.filter(e => e.approvalStatus === "PENDING").length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unpaid" data-testid="tab-unpaid">
                  Unpaid
                  {stats.unpaid > 0 && <Badge variant="destructive" className="ml-2">{stats.unpaid}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="paid" data-testid="tab-paid">Paid</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No expenses found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Add your first expense to start tracking"}
                    </p>
                    <Button onClick={() => handleOpenForm()} data-testid="button-add-first-expense">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Owner / Property</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Approval</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense) => (
                          <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{expense.description}</span>
                                {expense.vendorName && (
                                  <span className="text-xs text-muted-foreground">{expense.vendorName}</span>
                                )}
                                {expense.invoiceNumber && (
                                  <span className="text-xs text-muted-foreground">Inv: {expense.invoiceNumber}</span>
                                )}
                                <div className="flex gap-2">
                                  {expense.maintenanceIssueId && (
                                    <Link href={`/properties/${expense.propertyId}/maintenance`}>
                                      <Badge variant="outline" className="text-xs">
                                        <Wrench className="h-3 w-3 mr-1" />
                                        Issue #{expense.maintenanceIssueId}
                                      </Badge>
                                    </Link>
                                  )}
                                  {expense.complianceDocumentId && (
                                    <Link href="/compliance">
                                      <Badge variant="outline" className="text-xs">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Doc #{expense.complianceDocumentId}
                                      </Badge>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {expense.owner && (
                                  <Link href={`/owners?id=${expense.ownerId}`}>
                                    <span className="text-sm hover:underline flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {expense.owner.tradingName || expense.owner.legalName}
                                    </span>
                                  </Link>
                                )}
                                {expense.property && (
                                  <Link href={`/properties/${expense.propertyId}`}>
                                    <span className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {expense.property.name}
                                    </span>
                                  </Link>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(expense.totalAmount)}
                              {expense.taxAmount && parseFloat(expense.taxAmount) > 0 && (
                                <span className="block text-xs text-muted-foreground">
                                  Tax: {formatCurrency(expense.taxAmount)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(expense.paymentStatus)}
                              {expense.paymentDate && (
                                <span className="block text-xs text-muted-foreground mt-1">
                                  {format(new Date(expense.paymentDate), "MMM d")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getApprovalStatusBadge(expense.approvalStatus || "PENDING")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {expense.approvalStatus === "PENDING" && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => approveExpenseMutation.mutate(expense.id)}
                                      disabled={approveExpenseMutation.isPending}
                                      data-testid={`button-approve-expense-${expense.id}`}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => setRejectingExpense(expense)}
                                      data-testid={`button-reject-expense-${expense.id}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleOpenForm(expense)}
                                  data-testid={`button-edit-expense-${expense.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeletingExpense(expense)}
                                  data-testid={`button-delete-expense-${expense.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpense 
                ? "Update the expense details." 
                : "Record a new expense for your property portfolio."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              {owner.tradingName || owner.legalName}
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
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} 
                        value={field.value ? field.value.toString() : "none"}
                        disabled={!watchOwnerId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific property</SelectItem>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-expense-date"
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief description of the expense" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
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
                          data-testid="input-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Amount</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          data-testid="input-tax-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-end">
                  <div className="w-full p-3 bg-muted rounded-md">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <p className="font-semibold" data-testid="text-total-amount">
                      {formatCurrency(
                        (parseFloat(form.watch("amount") || "0") + parseFloat(form.watch("taxAmount") || "0"))
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Vendor Information (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vendorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Vendor or supplier name" data-testid="input-vendor-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Invoice or reference number" data-testid="input-invoice-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendorTaxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Tax ID</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="GST/Tax ID" data-testid="input-vendor-tax-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendorContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Contact</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Phone or email" data-testid="input-vendor-contact" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentStatuses.map((st) => (
                              <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === "none" ? null : val)} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Not specified</SelectItem>
                            {paymentMethods.map((pm) => (
                              <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(watchPaymentStatus === "PAID" || watchPaymentStatus === "PARTIALLY_PAID") && (
                    <>
                      <FormField
                        control={form.control}
                        name="paymentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    data-testid="button-payment-date"
                                  >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value || undefined}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paymentReference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Reference</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Transaction ID or reference" data-testid="input-payment-reference" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Receipt / Proof of Payment</h4>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-expense-files"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-expense-camera"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-file"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      data-testid="button-take-photo"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported: Images (JPEG, PNG, GIF, WebP) and PDF files up to 10MB
                  </p>
                  
                  {pendingFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Files to upload:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {pendingFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
                          >
                            {file.type.startsWith("image/") ? (
                              <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm truncate flex-1">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => removePendingFile(index)}
                              data-testid={`button-remove-pending-file-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editingExpense?.attachments && editingExpense.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Existing attachments:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {editingExpense.attachments.map((url, index) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
                            >
                              {isImage ? (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                                  <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm truncate text-primary">View image</span>
                                </a>
                              ) : (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm truncate text-primary">View file</span>
                                </a>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => deleteAttachmentMutation.mutate({ expenseId: editingExpense.id, url })}
                                disabled={deleteAttachmentMutation.isPending}
                                data-testid={`button-delete-attachment-${index}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Any additional notes about this expense" data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending || isUploadingFiles}
                  data-testid="button-submit-expense"
                >
                  {isUploadingFiles ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading files...
                    </>
                  ) : (createMutation.isPending || updateMutation.isPending) ? (
                    "Saving..."
                  ) : (
                    editingExpense ? "Update Expense" : "Add Expense"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense "{deletingExpense?.description}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingExpense && deleteMutation.mutate(deletingExpense.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectingExpense} onOpenChange={(open) => !open && setRejectingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Reject the expense "{rejectingExpense?.description}"? Optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason (optional)</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="mt-2"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingExpense(null);
                setRejectionReason("");
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectingExpense) {
                  rejectExpenseMutation.mutate({
                    id: rejectingExpense.id,
                    reason: rejectionReason || undefined,
                  });
                }
              }}
              disabled={rejectExpenseMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectExpenseMutation.isPending ? "Rejecting..." : "Reject Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
