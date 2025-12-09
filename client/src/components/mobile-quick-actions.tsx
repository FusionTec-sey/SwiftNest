import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Receipt, 
  AlertCircle, 
  FileText, 
  Camera,
  Loader2,
  X,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Owner, Tenant, LeaseWithDetails } from "@shared/schema";

interface PropertyWithDetails extends Property {
  isOwner?: boolean;
  userRole?: string;
}

export function MobileQuickActionBar() {
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
        data-testid="mobile-quick-action-bar"
      >
        <div className="flex items-center justify-around p-2 gap-2">
          <Button
            variant="ghost"
            className="flex-1 flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setExpenseDialogOpen(true)}
            data-testid="quick-action-expense"
          >
            <Receipt className="h-5 w-5" />
            <span className="text-xs">Expense</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-1 flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setIssueDialogOpen(true)}
            data-testid="quick-action-issue"
          >
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs">Issue</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-1 flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setInvoiceDialogOpen(true)}
            data-testid="quick-action-invoice"
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Invoice</span>
          </Button>
        </div>
      </div>

      <QuickExpenseDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} />
      <QuickIssueDialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen} />
      <QuickInvoiceDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
    </>
  );
}

function QuickExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("MAINTENANCE");
  const [ownerId, setOwnerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: owners } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: properties } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ownerId: parseInt(ownerId),
        propertyId: propertyId ? parseInt(propertyId) : null,
        category,
        description,
        amount,
        taxAmount: "0",
        totalAmount: amount,
        expenseDate: new Date().toISOString(),
        paymentStatus: "UNPAID",
        approvalStatus: "PENDING",
      };
      const response = await apiRequest("POST", "/api/expenses", payload);
      const result = await response.json();
      
      if (receiptFile && result?.id) {
        const formData = new FormData();
        formData.append("files", receiptFile);
        await fetch(`/api/expenses/${result.id}/attachments`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({ title: "Expense logged successfully" });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log expense", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("MAINTENANCE");
    setOwnerId("");
    setPropertyId("");
    setReceiptFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !amount) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    createExpenseMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Quick Expense
            </DialogTitle>
            <DialogDescription>
              Log an expense quickly from your phone
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                data-testid="quick-expense-amount"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner">Owner *</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger data-testid="quick-expense-owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners?.map((owner) => (
                    <SelectItem key={owner.id} value={String(owner.id)}>
                      {owner.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="property">Property (optional)</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger data-testid="quick-expense-property">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No property</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={String(property.id)}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="quick-expense-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="UTILITIES">Utilities</SelectItem>
                  <SelectItem value="INSURANCE">Insurance</SelectItem>
                  <SelectItem value="TAXES">Taxes</SelectItem>
                  <SelectItem value="SUPPLIES">Supplies</SelectItem>
                  <SelectItem value="LEGAL">Legal</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="quick-expense-description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receipt">Receipt Photo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                  data-testid="quick-expense-receipt"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById("receipt")?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {receiptFile ? receiptFile.name : "Take Photo"}
                </Button>
                {receiptFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setReceiptFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createExpenseMutation.isPending} data-testid="quick-expense-submit">
              {createExpenseMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Log Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickIssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [severity, setSeverity] = useState("MEDIUM");
  const [propertyId, setPropertyId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: properties } = useQuery<PropertyWithDetails[]>({
    queryKey: ["/api/properties"],
  });

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        propertyId: parseInt(propertyId),
        title,
        description,
        category,
        severity,
        attachments: [],
      };
      const response = await apiRequest("POST", `/api/properties/${propertyId}/issues`, payload);
      const result = await response.json();
      
      if (photoFile && result?.id) {
        const formData = new FormData();
        formData.append("file", photoFile);
        await fetch(`/api/issues/${result.id}/attachments`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/pending-tasks"] });
      toast({ title: "Issue reported successfully" });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to report issue", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("GENERAL");
    setSeverity("MEDIUM");
    setPropertyId("");
    setPhotoFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !title) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    createIssueMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Report Issue
            </DialogTitle>
            <DialogDescription>
              Quickly report a maintenance issue with photo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="issue-property">Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger data-testid="quick-issue-property">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={String(property.id)}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="issue-title">Title *</Label>
              <Input
                id="issue-title"
                placeholder="Brief description of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                data-testid="quick-issue-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="quick-issue-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLUMBING">Plumbing</SelectItem>
                    <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="APPLIANCE">Appliance</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger data-testid="quick-issue-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="issue-description">Description</Label>
              <Textarea
                id="issue-description"
                placeholder="Detailed description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="quick-issue-description"
              />
            </div>
            <div className="grid gap-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="issue-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  data-testid="quick-issue-photo"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById("issue-photo")?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {photoFile ? photoFile.name : "Take Photo"}
                </Button>
                {photoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPhotoFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createIssueMutation.isPending} data-testid="quick-issue-submit">
              {createIssueMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Report Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [leaseId, setLeaseId] = useState("");

  const { data: leases } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/leases"],
  });

  const activeLeases = leases?.filter(l => l.status === "ACTIVE") || [];

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/leases/generate-all-invoices", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({ 
        title: "Invoices generated", 
        description: `Generated ${data?.invoices?.length || 0} invoices` 
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate invoices", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerateAll = () => {
    generateInvoiceMutation.mutate();
  };

  const handleGoToRentCollection = () => {
    onOpenChange(false);
    navigate("/rent-collection");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Send Invoice
          </DialogTitle>
          <DialogDescription>
            Generate and send rent invoices to tenants
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-center p-4 border rounded-md bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">
              {activeLeases.length} active lease{activeLeases.length !== 1 ? "s" : ""} found
            </p>
            <Button 
              onClick={handleGenerateAll}
              disabled={generateInvoiceMutation.isPending || activeLeases.length === 0}
              className="w-full"
              data-testid="quick-invoice-generate-all"
            >
              {generateInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate All Due Invoices
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleGoToRentCollection}
            className="w-full"
            data-testid="quick-invoice-go-to-rent"
          >
            Go to Rent Collection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
