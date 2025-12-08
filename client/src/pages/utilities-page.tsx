import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Gauge, Plus, Trash2, Zap, Droplet, Flame, Search, Receipt, Clock, CheckCircle, AlertCircle, Send, ArrowRightLeft, User, Building, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EmptyState } from "@/components/empty-state";
import type { UtilityMeter, Property, Unit, UtilityBill, Tenant, Owner, MeterAssignmentHistory } from "@shared/schema";

const utilityMeterFormSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  unitId: z.number().optional(),
  utilityType: z.enum(["ELECTRICITY", "WATER", "GAS", "INTERNET", "OTHER"]),
  meterNumber: z.string().min(1, "Meter number is required"),
  provider: z.string().optional(),
  ratePerUnit: z.string().optional(),
  fixedCharge: z.string().optional(),
  isActive: z.number().default(1),
});

const utilityBillFormSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  unitId: z.number().optional(),
  tenantId: z.number().optional(),
  utilityType: z.enum(["ELECTRICITY", "WATER", "GAS", "INTERNET", "OTHER"]),
  provider: z.string().min(1, "Provider is required"),
  billReference: z.string().optional(),
  accountNumber: z.string().optional(),
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  billingPeriodStart: z.string().optional(),
  billingPeriodEnd: z.string().optional(),
  previousReading: z.string().optional(),
  currentReading: z.string().optional(),
  consumption: z.string().optional(),
  previousBalance: z.string().optional(),
  currentCharges: z.string().min(1, "Current charges required"),
  taxes: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount required"),
  notes: z.string().optional(),
});

const meterTransferFormSchema = z.object({
  newAssigneeType: z.enum(["OWNER", "TENANT"]),
  newOwnerId: z.number().optional(),
  newTenantId: z.number().optional(),
  finalMeterReading: z.string().optional(),
  transferReason: z.string().optional(),
  notes: z.string().optional(),
});

type UtilityMeterFormData = z.infer<typeof utilityMeterFormSchema>;
type UtilityBillFormData = z.infer<typeof utilityBillFormSchema>;
type MeterTransferFormData = z.infer<typeof meterTransferFormSchema>;

type MeterWithAssignment = UtilityMeter & {
  assignedOwner?: Owner | null;
  assignedTenant?: Tenant | null;
};

const getUtilityIcon = (type: string) => {
  switch (type) {
    case "ELECTRICITY":
      return <Zap className="h-4 w-4" />;
    case "WATER":
      return <Droplet className="h-4 w-4" />;
    case "GAS":
      return <Flame className="h-4 w-4" />;
    default:
      return <Gauge className="h-4 w-4" />;
  }
};

const getBillStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    case "FORWARDED":
      return <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-0"><Send className="h-3 w-3" /> Forwarded</Badge>;
    case "PAID":
      return <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-0"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
    case "PARTIALLY_PAID":
      return <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border-0"><AlertCircle className="h-3 w-3" /> Partial</Badge>;
    case "OVERDUE":
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Overdue</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function UtilitiesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("bills");
  const [isMeterFormOpen, setIsMeterFormOpen] = useState(false);
  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<UtilityMeter | null>(null);
  const [deletingMeter, setDeletingMeter] = useState<UtilityMeter | null>(null);
  const [deletingBill, setDeletingBill] = useState<UtilityBill | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferringMeter, setTransferringMeter] = useState<MeterWithAssignment | null>(null);
  const [viewingHistory, setViewingHistory] = useState<number | null>(null);

  const { data: meters, isLoading: metersLoading } = useQuery<UtilityMeter[]>({
    queryKey: ["/api/utility-meters"],
  });

  const { data: pendingBills, isLoading: billsLoading } = useQuery<UtilityBill[]>({
    queryKey: ["/api/utility-bills/pending"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: owners } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: assignmentHistory } = useQuery<MeterAssignmentHistory[]>({
    queryKey: ["/api/meters", viewingHistory, "assignment-history"],
    enabled: !!viewingHistory,
  });

  const { data: outstandingBills } = useQuery<UtilityBill[]>({
    queryKey: ["/api/meters", transferringMeter?.id, "outstanding-bills"],
    enabled: !!transferringMeter,
  });

  const transferForm = useForm<MeterTransferFormData>({
    resolver: zodResolver(meterTransferFormSchema),
    defaultValues: {
      newAssigneeType: "OWNER",
      finalMeterReading: "",
      transferReason: "",
      notes: "",
    },
  });

  const meterForm = useForm<UtilityMeterFormData>({
    resolver: zodResolver(utilityMeterFormSchema),
    defaultValues: {
      propertyId: 0,
      utilityType: "ELECTRICITY",
      meterNumber: "",
      provider: "PUC",
      ratePerUnit: "",
      fixedCharge: "",
      isActive: 1,
    },
  });

  const billForm = useForm<UtilityBillFormData>({
    resolver: zodResolver(utilityBillFormSchema),
    defaultValues: {
      propertyId: 0,
      utilityType: "ELECTRICITY",
      provider: "PUC",
      billReference: "",
      accountNumber: "",
      billDate: "",
      dueDate: "",
      billingPeriodStart: "",
      billingPeriodEnd: "",
      previousReading: "",
      currentReading: "",
      consumption: "",
      previousBalance: "0",
      currentCharges: "",
      taxes: "0",
      totalAmount: "",
      notes: "",
    },
  });

  const createMeterMutation = useMutation({
    mutationFn: async (data: UtilityMeterFormData) => {
      if (editingMeter) {
        return apiRequest("PATCH", `/api/utility-meters/${editingMeter.id}`, data);
      }
      return apiRequest("POST", "/api/utility-meters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/utility-meters"] });
      setIsMeterFormOpen(false);
      setEditingMeter(null);
      meterForm.reset();
      toast({
        title: editingMeter ? "Meter updated" : "Meter created",
        description: editingMeter
          ? "The utility meter has been updated successfully."
          : "A new utility meter has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the utility meter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: UtilityBillFormData) => {
      return apiRequest("POST", "/api/utility-bills", {
        ...data,
        billDate: new Date(data.billDate),
        dueDate: new Date(data.dueDate),
        billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : undefined,
        billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/utility-bills/pending"] });
      setIsBillFormOpen(false);
      billForm.reset();
      toast({
        title: "Bill recorded",
        description: "The utility bill has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record the utility bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMeterMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/utility-meters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/utility-meters"] });
      setDeletingMeter(null);
      toast({
        title: "Meter deleted",
        description: "The utility meter has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the meter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/utility-bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/utility-bills/pending"] });
      setDeletingBill(null);
      toast({
        title: "Bill deleted",
        description: "The utility bill has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, amountPaid }: { id: number; amountPaid: string }) => {
      return apiRequest("PATCH", `/api/utility-bills/${id}/pay`, { amountPaid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/utility-bills/pending"] });
      toast({
        title: "Bill updated",
        description: "The bill has been marked as paid.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update the bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const transferMeterMutation = useMutation({
    mutationFn: async (data: MeterTransferFormData & { meterId: number }) => {
      return apiRequest("POST", `/api/meters/${data.meterId}/transfer`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/utility-meters"] });
      setIsTransferDialogOpen(false);
      setTransferringMeter(null);
      transferForm.reset();
      toast({
        title: "Meter transferred",
        description: "The meter has been assigned to the new party.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer the meter. Outstanding bills may need to be settled first.",
        variant: "destructive",
      });
    },
  });

  const openTransferDialog = (meter: MeterWithAssignment) => {
    setTransferringMeter(meter);
    transferForm.reset({
      newAssigneeType: meter.assignedToType === "OWNER" ? "TENANT" : "OWNER",
      finalMeterReading: "",
      transferReason: "",
      notes: "",
    });
    setIsTransferDialogOpen(true);
  };

  const getOwnerName = (ownerId: number | null | undefined) => {
    if (!ownerId || !owners) return "Unknown";
    const owner = owners.find((o) => o.id === ownerId);
    return owner?.legalName || "Unknown";
  };

  const openNewMeterForm = () => {
    setEditingMeter(null);
    meterForm.reset({
      propertyId: 0,
      utilityType: "ELECTRICITY",
      meterNumber: "",
      provider: "PUC",
      ratePerUnit: "",
      fixedCharge: "",
      isActive: 1,
    });
    setIsMeterFormOpen(true);
  };

  const openNewBillForm = () => {
    billForm.reset({
      propertyId: 0,
      utilityType: "ELECTRICITY",
      provider: "PUC",
      billReference: "",
      accountNumber: "",
      billDate: "",
      dueDate: "",
      billingPeriodStart: "",
      billingPeriodEnd: "",
      previousReading: "",
      currentReading: "",
      consumption: "",
      previousBalance: "0",
      currentCharges: "",
      taxes: "0",
      totalAmount: "",
      notes: "",
    });
    setIsBillFormOpen(true);
  };

  const getPropertyName = (propertyId: number) => {
    return properties?.find((p) => p.id === propertyId)?.name || "Unknown Property";
  };

  const getTenantName = (tenantId: number | null) => {
    if (!tenantId) return null;
    return tenants?.find((t) => t.id === tenantId)?.legalName || "Unknown Tenant";
  };

  const filteredMeters = meters?.filter((meter) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      meter.meterNumber.toLowerCase().includes(searchLower) ||
      meter.utilityType.toLowerCase().includes(searchLower) ||
      (meter.provider?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const filteredBills = pendingBills?.filter((bill) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      bill.provider.toLowerCase().includes(searchLower) ||
      bill.utilityType.toLowerCase().includes(searchLower) ||
      (bill.billReference?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const isLoading = activeTab === "meters" ? metersLoading : billsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded"></div>
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
            <h1 className="text-2xl font-semibold">Utilities</h1>
            <p className="text-sm text-muted-foreground">
              Manage utility meters and track bills from providers
            </p>
          </div>
          <Button 
            onClick={activeTab === "meters" ? openNewMeterForm : openNewBillForm} 
            data-testid={activeTab === "meters" ? "button-add-meter" : "button-add-bill"}
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "meters" ? "Add Meter" : "Record Bill"}
          </Button>
        </div>
        <div className="px-4 pb-4 flex items-center gap-4 flex-wrap">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="bills" data-testid="tab-bills">
                <Receipt className="h-4 w-4 mr-2" />
                Bills
              </TabsTrigger>
              <TabsTrigger value="meters" data-testid="tab-meters">
                <Gauge className="h-4 w-4 mr-2" />
                Meters
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "meters" ? "Search meters..." : "Search bills..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {activeTab === "bills" ? (
          filteredBills && filteredBills.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBills.map((bill) => (
                <Card key={bill.id} data-testid={`card-bill-${bill.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate flex items-center gap-2">
                          {getUtilityIcon(bill.utilityType)}
                          {bill.provider}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {getPropertyName(bill.propertyId)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingBill(bill)}
                          data-testid={`button-delete-bill-${bill.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {getBillStatusBadge(bill.status)}
                      <Badge variant="outline">{bill.utilityType}</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {bill.billReference && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Bill Ref</span>
                          <span>{bill.billReference}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Bill Date</span>
                        <span>{format(new Date(bill.billDate), "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span className={new Date(bill.dueDate) < new Date() ? "text-destructive font-medium" : ""}>
                          {format(new Date(bill.dueDate), "dd MMM yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-muted-foreground">Total</span>
                        <span>SCR {parseFloat(bill.totalAmount).toLocaleString()}</span>
                      </div>
                      {bill.tenantId && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tenant</span>
                          <span>{getTenantName(bill.tenantId)}</span>
                        </div>
                      )}
                    </div>

                    {bill.status !== "PAID" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => markAsPaidMutation.mutate({ id: bill.id, amountPaid: bill.totalAmount })}
                        disabled={markAsPaidMutation.isPending}
                        data-testid={`button-mark-paid-${bill.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No utility bills yet"
              description="Record your first utility bill from your provider (e.g., PUC)."
              actionLabel="Record Your First Bill"
              onAction={openNewBillForm}
            />
          )
        ) : (
          filteredMeters && filteredMeters.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMeters.map((meter) => (
                <Card key={meter.id} data-testid={`card-meter-${meter.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate flex items-center gap-2">
                          {getUtilityIcon(meter.utilityType)}
                          {meter.meterNumber}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {getPropertyName(meter.propertyId)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingMeter(meter)}
                          data-testid={`button-delete-meter-${meter.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant={meter.isActive ? "default" : "secondary"}>
                        {meter.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{meter.utilityType}</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {meter.provider && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Provider</span>
                          <span>{meter.provider}</span>
                        </div>
                      )}
                      {meter.ratePerUnit && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Rate/Unit</span>
                          <span>{meter.ratePerUnit}</span>
                        </div>
                      )}
                      {meter.fixedCharge && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Fixed Charge</span>
                          <span>{meter.fixedCharge}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned To</span>
                        <span className="flex items-center gap-1">
                          {meter.assignedToType === "OWNER" ? (
                            <>
                              <Building className="h-3 w-3" />
                              {getOwnerName(meter.assignedToOwnerId)}
                            </>
                          ) : meter.assignedToType === "TENANT" ? (
                            <>
                              <User className="h-3 w-3" />
                              {getTenantName(meter.assignedToTenantId)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openTransferDialog(meter as MeterWithAssignment)}
                        data-testid={`button-transfer-meter-${meter.id}`}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingHistory(meter.id)}
                        data-testid={`button-history-meter-${meter.id}`}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Gauge}
              title="No utility meters yet"
              description="Add your first utility meter to start tracking consumption."
              actionLabel="Add Your First Meter"
              onAction={openNewMeterForm}
            />
          )
        )}
      </main>

      {/* Meter Form Dialog */}
      <Dialog open={isMeterFormOpen} onOpenChange={setIsMeterFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeter ? "Edit Meter" : "Add New Meter"}</DialogTitle>
            <DialogDescription>
              {editingMeter
                ? "Update the utility meter details."
                : "Add a new utility meter to track consumption."}
            </DialogDescription>
          </DialogHeader>
          <Form {...meterForm}>
            <form onSubmit={meterForm.handleSubmit((data) => createMeterMutation.mutate(data))} className="space-y-4">
              <FormField
                control={meterForm.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-meter-property">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                  control={meterForm.control}
                  name="utilityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utility Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-meter-utility-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                          <SelectItem value="WATER">Water</SelectItem>
                          <SelectItem value="GAS">Gas</SelectItem>
                          <SelectItem value="INTERNET">Internet</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={meterForm.control}
                  name="meterNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meter Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-meter-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={meterForm.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-meter-provider" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={meterForm.control}
                  name="ratePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate per Unit</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.0001" data-testid="input-rate-per-unit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={meterForm.control}
                  name="fixedCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fixed Charge</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-fixed-charge" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsMeterFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMeterMutation.isPending} data-testid="button-submit-meter">
                  {createMeterMutation.isPending ? "Saving..." : editingMeter ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bill Form Dialog */}
      <Dialog open={isBillFormOpen} onOpenChange={setIsBillFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Utility Bill</DialogTitle>
            <DialogDescription>
              Enter the bill details from your utility provider (e.g., PUC paper bill).
            </DialogDescription>
          </DialogHeader>
          <Form {...billForm}>
            <form onSubmit={billForm.handleSubmit((data) => createBillMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={billForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-bill-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

                <FormField
                  control={billForm.control}
                  name="utilityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utility Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bill-utility-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                          <SelectItem value="WATER">Water</SelectItem>
                          <SelectItem value="GAS">Gas</SelectItem>
                          <SelectItem value="INTERNET">Internet</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={billForm.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., PUC" data-testid="input-bill-provider" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={billForm.control}
                  name="billReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Reference</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bill/Invoice number" data-testid="input-bill-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={billForm.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your PUC account number" data-testid="input-account-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={billForm.control}
                  name="billDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-bill-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={billForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={billForm.control}
                  name="previousReading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Reading</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-previous-reading" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={billForm.control}
                  name="currentReading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Reading</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-current-reading" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={billForm.control}
                  name="consumption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumption</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-consumption" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={billForm.control}
                  name="currentCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Charges (SCR)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-current-charges" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={billForm.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount (SCR)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-total-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={billForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any additional notes..." data-testid="input-bill-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsBillFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBillMutation.isPending} data-testid="button-submit-bill">
                  {createBillMutation.isPending ? "Saving..." : "Record Bill"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Meter Confirmation */}
      <AlertDialog open={!!deletingMeter} onOpenChange={() => setDeletingMeter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Utility Meter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete meter "{deletingMeter?.meterNumber}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMeter && deleteMeterMutation.mutate(deletingMeter.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-meter"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Bill Confirmation */}
      <AlertDialog open={!!deletingBill} onOpenChange={() => setDeletingBill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Utility Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bill from {deletingBill?.provider}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBill && deleteBillMutation.mutate(deletingBill.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-bill"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Meter Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Meter</DialogTitle>
            <DialogDescription>
              Transfer meter responsibility from current assignee to a new owner or tenant.
            </DialogDescription>
          </DialogHeader>

          {outstandingBills && outstandingBills.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
              <p className="font-medium text-destructive">Outstanding Bills Warning</p>
              <p className="text-muted-foreground mt-1">
                This meter has {outstandingBills.length} unpaid bill(s) totaling SCR{" "}
                {outstandingBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || "0") - parseFloat(bill.amountPaid || "0"), 0).toLocaleString()}.
                Settle all bills before transferring.
              </p>
            </div>
          )}

          <Form {...transferForm}>
            <form
              onSubmit={transferForm.handleSubmit((data) => {
                if (transferringMeter) {
                  transferMeterMutation.mutate({ ...data, meterId: transferringMeter.id });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={transferForm.control}
                name="newAssigneeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transfer-type">
                          <SelectValue placeholder="Select assignee type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OWNER">Property Owner</SelectItem>
                        <SelectItem value="TENANT">Tenant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {transferForm.watch("newAssigneeType") === "OWNER" && (
                <FormField
                  control={transferForm.control}
                  name="newOwnerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Owner</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-transfer-owner">
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
              )}

              {transferForm.watch("newAssigneeType") === "TENANT" && (
                <FormField
                  control={transferForm.control}
                  name="newTenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Tenant</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-transfer-tenant">
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              {tenant.legalName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={transferForm.control}
                name="finalMeterReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Final Meter Reading</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 12345.67" data-testid="input-final-reading" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transferForm.control}
                name="transferReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Reason</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Lease ended" data-testid="input-transfer-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transferForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes..." data-testid="input-transfer-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={transferMeterMutation.isPending || (outstandingBills && outstandingBills.length > 0)}
                  data-testid="button-submit-transfer"
                >
                  {transferMeterMutation.isPending ? "Transferring..." : "Transfer Meter"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assignment History Dialog */}
      <Dialog open={!!viewingHistory} onOpenChange={() => setViewingHistory(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meter Assignment History</DialogTitle>
            <DialogDescription>
              View the history of all assignments for this meter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {assignmentHistory && assignmentHistory.length > 0 ? (
              assignmentHistory.map((record) => (
                <Card key={record.id} data-testid={`card-history-${record.id}`}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(record.transferDate), "dd MMM yyyy HH:mm")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {record.previousAssigneeType || "None"} to {record.newAssigneeType}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {record.previousAssigneeType === "OWNER" ? (
                            <>From Owner: {getOwnerName(record.previousOwnerId)}</>
                          ) : record.previousAssigneeType === "TENANT" ? (
                            <>From Tenant: {getTenantName(record.previousTenantId)}</>
                          ) : (
                            "From: Not assigned"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-5">
                        <span>
                          {record.newAssigneeType === "OWNER" ? (
                            <>To Owner: {getOwnerName(record.newOwnerId)}</>
                          ) : record.newAssigneeType === "TENANT" ? (
                            <>To Tenant: {getTenantName(record.newTenantId)}</>
                          ) : (
                            "To: Not assigned"
                          )}
                        </span>
                      </div>
                      {record.finalMeterReading && (
                        <div className="text-xs text-muted-foreground">
                          Final Reading: {record.finalMeterReading}
                        </div>
                      )}
                      {record.transferReason && (
                        <div className="text-xs text-muted-foreground">
                          Reason: {record.transferReason}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transfer history for this meter.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setViewingHistory(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
