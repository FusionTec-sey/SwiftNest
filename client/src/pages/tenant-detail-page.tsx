import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  FileText,
  Upload,
  Trash2,
  Download,
  Calendar,
  Globe,
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Save,
  X,
  Building2,
  DollarSign,
  ExternalLink,
  ClipboardCheck,
  Package,
  Camera,
  Home,
  Key,
  Plus,
  Check,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant, Document, Lease, Property, OnboardingProcess, ConditionChecklistItem, HandoverItem, InventoryItem } from "@shared/schema";

// Room types for checklist
const ROOM_TYPES = [
  { value: 'LIVING_ROOM', label: 'Living Room' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'DINING_ROOM', label: 'Dining Room' },
  { value: 'BALCONY', label: 'Balcony' },
  { value: 'TERRACE', label: 'Terrace' },
  { value: 'GARAGE', label: 'Garage' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'ENTRANCE', label: 'Entrance' },
  { value: 'HALLWAY', label: 'Hallway' },
  { value: 'UTILITY_ROOM', label: 'Utility Room' },
  { value: 'GARDEN', label: 'Garden' },
  { value: 'POOL_AREA', label: 'Pool Area' },
  { value: 'OTHER', label: 'Other' },
];

// Condition ratings
const CONDITION_RATINGS = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-500' },
  { value: 'GOOD', label: 'Good', color: 'bg-blue-500' },
  { value: 'FAIR', label: 'Fair', color: 'bg-yellow-500' },
  { value: 'POOR', label: 'Poor', color: 'bg-orange-500' },
  { value: 'DAMAGED', label: 'Damaged', color: 'bg-red-500' },
];

const kycFormSchema = z.object({
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  workPermitNumber: z.string().optional(),
  workPermitExpiry: z.string().optional(),
  verificationStatus: z.enum(["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"]),
  kycNotes: z.string().optional(),
});

type KycFormData = z.infer<typeof kycFormSchema>;

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

const getVerificationStatusIcon = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "REJECTED":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }
};

const getVerificationStatusVariant = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return "default" as const;
    case "IN_PROGRESS":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const documentTypeLabels: Record<string, string> = {
  ID_DOCUMENT: "ID Document",
  LEASE_AGREEMENT: "Lease Agreement",
  CONTRACT: "Contract",
  OTHER: "Other Document",
};

// Onboarding stages with their display info
const ONBOARDING_STAGES = [
  { key: 'CONTRACT_REVIEW', label: 'Contract Review', icon: FileText, description: 'Review and sign lease agreement' },
  { key: 'DEPOSIT_COLLECTION', label: 'Deposit Collection', icon: DollarSign, description: 'Collect security deposit' },
  { key: 'INSPECTION', label: 'Inspection', icon: ClipboardCheck, description: 'Property condition inspection' },
  { key: 'HANDOVER', label: 'Handover', icon: Key, description: 'Keys and inventory handover' },
  { key: 'MOVE_IN', label: 'Move-In', icon: Home, description: 'Complete move-in process' },
];

type LeaseWithProperty = Lease & { property?: Property };

interface OnboardingSectionProps {
  tenantId: number;
  onboardingProcesses?: OnboardingProcess[];
  onboardingLoading: boolean;
  leases?: LeaseWithProperty[];
}

function OnboardingSection({ tenantId, onboardingProcesses, onboardingLoading, leases }: OnboardingSectionProps) {
  const { toast } = useToast();
  const [selectedProcess, setSelectedProcess] = useState<OnboardingProcess | null>(null);

  const createOnboardingMutation = useMutation({
    mutationFn: async (data: { leaseId: number; tenantId: number; propertyId: number; unitId?: number }) => {
      return apiRequest("POST", "/api/onboarding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "onboarding"] });
      toast({
        title: "Onboarding started",
        description: "The onboarding process has been initiated.",
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

  const advanceStageMutation = useMutation({
    mutationFn: async ({ processId, stage }: { processId: number; stage: string }) => {
      return apiRequest("POST", `/api/onboarding/${processId}/stage`, { stage });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "onboarding"] });
      const stageNames: Record<string, string> = {
        'CONTRACT_SIGNED': 'Contract Review completed',
        'DEPOSIT_PAID': 'Deposit collected',
        'INSPECTION_COMPLETED': 'Inspection completed',
        'HANDOVER_COMPLETED': 'Handover completed',
        'MOVE_IN_COMPLETED': 'Move-in completed',
      };
      toast({
        title: stageNames[variables.stage] || "Stage updated",
        description: "The onboarding has progressed to the next stage.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not advance stage",
        description: error.message || "Please check that all prerequisites are met for this stage.",
        variant: "destructive",
      });
    },
  });

  const getStageIndex = (stage: string | null) => {
    if (!stage) return -1; // NOT_STARTED state - no stage active yet
    return ONBOARDING_STAGES.findIndex(s => s.key === stage);
  };

  const getNextStage = (currentStage: string): string | null => {
    const idx = getStageIndex(currentStage);
    if (idx < ONBOARDING_STAGES.length - 1) {
      return ONBOARDING_STAGES[idx + 1].key;
    }
    return null;
  };

  const handleStartOnboarding = (lease: LeaseWithProperty) => {
    createOnboardingMutation.mutate({
      leaseId: lease.id,
      tenantId: tenantId,
      propertyId: lease.propertyId,
      unitId: lease.unitId || undefined,
    });
  };

  const handleAdvanceStage = (process: OnboardingProcess) => {
    if (!process.currentStage) return;
    
    // Map stages to completion markers
    const stageCompletionMap: Record<string, string> = {
      'CONTRACT_REVIEW': 'CONTRACT_SIGNED',
      'DEPOSIT_COLLECTION': 'DEPOSIT_PAID',
      'INSPECTION': 'INSPECTION_COMPLETED',
      'HANDOVER': 'HANDOVER_COMPLETED',
      'MOVE_IN': 'MOVE_IN_COMPLETED',
    };

    const completionStage = stageCompletionMap[process.currentStage];
    if (completionStage) {
      advanceStageMutation.mutate({ processId: process.id, stage: completionStage });
    }
  };

  if (onboardingLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  // Check for leases without onboarding
  const leasesWithoutOnboarding = leases?.filter(
    lease => !onboardingProcesses?.some(p => p.leaseId === lease.id)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Start Onboarding for Leases */}
      {leasesWithoutOnboarding.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Start Onboarding
            </CardTitle>
            <CardDescription>
              The following leases don't have an onboarding process. Click to start.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leasesWithoutOnboarding.map((lease) => (
                <div
                  key={lease.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`lease-onboarding-${lease.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{lease.property?.name || `Property #${lease.propertyId}`}</p>
                    <p className="text-xs text-muted-foreground">
                      Lease: {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleStartOnboarding(lease)}
                    disabled={createOnboardingMutation.isPending}
                    data-testid={`button-start-onboarding-${lease.id}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start Onboarding
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Processes */}
      {onboardingProcesses && onboardingProcesses.length > 0 ? (
        <div className="space-y-4">
          {onboardingProcesses.map((process) => (
            <Card key={process.id} data-testid={`card-onboarding-${process.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardCheck className="h-5 w-5" />
                      Onboarding Process #{process.id}
                    </CardTitle>
                    <CardDescription>
                      Lease ID: {process.leaseId} | Started: {formatDate(process.createdAt)}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={
                      process.status === 'COMPLETED' ? 'default' :
                      process.status === 'IN_PROGRESS' ? 'secondary' :
                      process.status === 'CANCELLED' ? 'destructive' : 'outline'
                    }
                  >
                    {process.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Stage Stepper */}
                <div className="relative">
                  <div className="flex justify-between">
                    {ONBOARDING_STAGES.map((stage, idx) => {
                      const currentIdx = getStageIndex(process.currentStage);
                      // For NOT_STARTED (currentIdx = -1), nothing is completed, first stage is pending
                      const isCompleted = process.status === 'COMPLETED' || (currentIdx >= 0 && idx < currentIdx);
                      const isCurrent = currentIdx >= 0 && idx === currentIdx && process.status !== 'COMPLETED';
                      const isPending = currentIdx < 0 && idx === 0; // First stage is pending when NOT_STARTED
                      const Icon = stage.icon;

                      return (
                        <div key={stage.key} className="flex flex-col items-center flex-1">
                          <div 
                            className={`
                              flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                              ${isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                                isCurrent || isPending ? 'border-primary bg-background text-primary' :
                                'border-muted bg-muted/50 text-muted-foreground'}
                            `}
                            data-testid={`stage-${stage.key}-${process.id}`}
                          >
                            {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                          </div>
                          <p className={`text-xs mt-2 text-center font-medium ${isCurrent || isPending ? 'text-primary' : 'text-muted-foreground'}`}>
                            {stage.label}
                          </p>
                          {idx < ONBOARDING_STAGES.length - 1 && (
                            <div 
                              className={`absolute top-5 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-muted'}`}
                              style={{
                                left: `calc(${(idx + 0.5) * 20}% + 20px)`,
                                width: 'calc(20% - 40px)',
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current Stage Action */}
                {process.status === 'IN_PROGRESS' && process.currentStage && (
                  <div className="mt-6 flex justify-center">
                    <Button 
                      onClick={() => handleAdvanceStage(process)}
                      disabled={advanceStageMutation.isPending}
                      data-testid={`button-complete-stage-${process.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete {ONBOARDING_STAGES[getStageIndex(process.currentStage)]?.label || 'Current Stage'}
                    </Button>
                  </div>
                )}

                {(process.status === 'NOT_STARTED' || (process.status === 'IN_PROGRESS' && !process.currentStage)) && (
                  <div className="mt-6 flex justify-center">
                    <Button 
                      onClick={() => advanceStageMutation.mutate({ processId: process.id, stage: 'CONTRACT_SIGNED' })}
                      disabled={advanceStageMutation.isPending}
                      data-testid={`button-start-stage-${process.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Start Contract Review
                    </Button>
                  </div>
                )}

                {process.status === 'COMPLETED' && (
                  <div className="mt-6 text-center">
                    <Badge variant="default" className="text-sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Onboarding Completed
                    </Badge>
                    {process.moveInCompletedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Moved in on {formatDate(process.moveInCompletedAt)}
                      </p>
                    )}
                  </div>
                )}

                {/* View Details Button */}
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedProcess(process)}
                    data-testid={`button-view-details-${process.id}`}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !leasesWithoutOnboarding.length && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Onboarding Processes</p>
            <p className="text-sm mt-2">
              Create a lease for this tenant to start the onboarding process.
            </p>
            <Link href="/leases">
              <Button variant="ghost" size="sm" className="mt-4" data-testid="button-create-lease-onboarding">
                <Plus className="h-4 w-4 mr-2" />
                Create Lease
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Detail Dialog */}
      {selectedProcess && (
        <OnboardingDetailDialog
          process={selectedProcess}
          open={!!selectedProcess}
          onOpenChange={(open) => !open && setSelectedProcess(null)}
          tenantId={tenantId}
        />
      )}
    </div>
  );
}

// Onboarding Detail Dialog Component
interface OnboardingDetailDialogProps {
  process: OnboardingProcess;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: number;
}

type HandoverItemWithInventory = HandoverItem & { inventoryItem?: InventoryItem };

function OnboardingDetailDialog({ process, open, onOpenChange, tenantId }: OnboardingDetailDialogProps) {
  const { toast } = useToast();
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [isAddingHandover, setIsAddingHandover] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState({
    roomType: '',
    roomName: '',
    itemName: '',
    itemDescription: '',
    conditionRating: '',
    conditionNotes: '',
    hasDamage: false,
    damageDescription: '',
  });
  const [newHandoverItem, setNewHandoverItem] = useState({
    inventoryItemId: '',
    quantity: 1,
    conditionAtHandover: '',
    conditionNotes: '',
  });

  // Fetch checklist items
  const { data: checklistItems, isLoading: checklistLoading } = useQuery<ConditionChecklistItem[]>({
    queryKey: ["/api/onboarding", process.id, "checklist"],
    enabled: open,
  });

  // Fetch handover items
  const { data: handoverItems, isLoading: handoverLoading } = useQuery<HandoverItemWithInventory[]>({
    queryKey: ["/api/onboarding", process.id, "handover"],
    enabled: open,
  });

  // Fetch available inventory items
  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
    enabled: open && isAddingHandover,
  });

  // Add checklist item mutation
  const addChecklistMutation = useMutation({
    mutationFn: async (data: typeof newChecklistItem) => {
      return apiRequest("POST", `/api/onboarding/${process.id}/checklist`, {
        ...data,
        hasDamage: data.hasDamage ? 1 : 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding", process.id, "checklist"] });
      setIsAddingChecklist(false);
      setNewChecklistItem({
        roomType: '',
        roomName: '',
        itemName: '',
        itemDescription: '',
        conditionRating: '',
        conditionNotes: '',
        hasDamage: false,
        damageDescription: '',
      });
      toast({ title: "Checklist item added", description: "The inspection item has been recorded." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete checklist item mutation
  const deleteChecklistMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/onboarding/checklist/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding", process.id, "checklist"] });
      toast({ title: "Item deleted", description: "The checklist item has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add handover item mutation
  const addHandoverMutation = useMutation({
    mutationFn: async (data: typeof newHandoverItem) => {
      return apiRequest("POST", `/api/onboarding/${process.id}/handover`, {
        ...data,
        inventoryItemId: parseInt(data.inventoryItemId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding", process.id, "handover"] });
      setIsAddingHandover(false);
      setNewHandoverItem({
        inventoryItemId: '',
        quantity: 1,
        conditionAtHandover: '',
        conditionNotes: '',
      });
      toast({ title: "Handover item added", description: "The item has been recorded for handover." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete handover item mutation
  const deleteHandoverMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/onboarding/handover/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding", process.id, "handover"] });
      toast({ title: "Item deleted", description: "The handover item has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddChecklist = () => {
    if (!newChecklistItem.roomType || !newChecklistItem.itemName || !newChecklistItem.conditionRating) {
      toast({ title: "Missing fields", description: "Room type, item name, and condition rating are required.", variant: "destructive" });
      return;
    }
    addChecklistMutation.mutate(newChecklistItem);
  };

  const handleAddHandover = () => {
    if (!newHandoverItem.inventoryItemId || !newHandoverItem.conditionAtHandover) {
      toast({ title: "Missing fields", description: "Inventory item and condition are required.", variant: "destructive" });
      return;
    }
    addHandoverMutation.mutate(newHandoverItem);
  };

  const getConditionBadgeVariant = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return 'default' as const;
      case 'GOOD': return 'secondary' as const;
      case 'FAIR': return 'outline' as const;
      case 'POOR': return 'destructive' as const;
      case 'DAMAGED': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Onboarding Process #{process.id}
          </DialogTitle>
          <DialogDescription>
            Current Stage: {process.currentStage || 'Not Started'} | Status: {process.status}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="checklist" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="checklist" data-testid="tab-checklist">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Inspection Checklist ({checklistItems?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="handover" data-testid="tab-handover">
              <Package className="h-4 w-4 mr-2" />
              Handover Items ({handoverItems?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="flex-1 overflow-auto space-y-4">
            {/* Add Checklist Item Form */}
            {isAddingChecklist ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Add Inspection Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Room Type *</label>
                      <Select
                        value={newChecklistItem.roomType}
                        onValueChange={(v) => setNewChecklistItem(p => ({ ...p, roomType: v }))}
                      >
                        <SelectTrigger data-testid="select-room-type">
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map((rt) => (
                            <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Room Name</label>
                      <Input
                        placeholder="e.g., Master Bedroom"
                        value={newChecklistItem.roomName}
                        onChange={(e) => setNewChecklistItem(p => ({ ...p, roomName: e.target.value }))}
                        data-testid="input-room-name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Item Name *</label>
                      <Input
                        placeholder="e.g., Wall paint, Floor tiles"
                        value={newChecklistItem.itemName}
                        onChange={(e) => setNewChecklistItem(p => ({ ...p, itemName: e.target.value }))}
                        data-testid="input-item-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Condition *</label>
                      <Select
                        value={newChecklistItem.conditionRating}
                        onValueChange={(v) => setNewChecklistItem(p => ({ ...p, conditionRating: v }))}
                      >
                        <SelectTrigger data-testid="select-condition">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_RATINGS.map((cr) => (
                            <SelectItem key={cr.value} value={cr.value}>{cr.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      placeholder="Condition notes..."
                      value={newChecklistItem.conditionNotes}
                      onChange={(e) => setNewChecklistItem(p => ({ ...p, conditionNotes: e.target.value }))}
                      rows={2}
                      data-testid="input-condition-notes"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingChecklist(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddChecklist} disabled={addChecklistMutation.isPending} data-testid="button-save-checklist">
                      <Save className="h-4 w-4 mr-2" />
                      Save Item
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsAddingChecklist(true)} data-testid="button-add-checklist">
                <Plus className="h-4 w-4 mr-2" />
                Add Inspection Item
              </Button>
            )}

            {/* Checklist Items List */}
            {checklistLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : checklistItems && checklistItems.length > 0 ? (
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <Card key={item.id} data-testid={`checklist-item-${item.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{ROOM_TYPES.find(r => r.value === item.roomType)?.label}</Badge>
                            {item.roomName && <span className="text-sm text-muted-foreground">{item.roomName}</span>}
                          </div>
                          <p className="font-medium mt-1">{item.itemName}</p>
                          {item.conditionNotes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.conditionNotes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getConditionBadgeVariant(item.conditionRating)}>
                            {item.conditionRating}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteChecklistMutation.mutate(item.id)}
                            disabled={deleteChecklistMutation.isPending}
                            data-testid={`button-delete-checklist-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No inspection items recorded yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="handover" className="flex-1 overflow-auto space-y-4">
            {/* Add Handover Item Form */}
            {isAddingHandover ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Add Handover Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Inventory Item *</label>
                      <Select
                        value={newHandoverItem.inventoryItemId}
                        onValueChange={(v) => setNewHandoverItem(p => ({ ...p, inventoryItemId: v }))}
                      >
                        <SelectTrigger data-testid="select-inventory-item">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems?.filter(i => i.status === 'AVAILABLE').map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name} ({item.itemType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        value={newHandoverItem.quantity}
                        onChange={(e) => setNewHandoverItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                        data-testid="input-handover-quantity"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Condition at Handover *</label>
                    <Select
                      value={newHandoverItem.conditionAtHandover}
                      onValueChange={(v) => setNewHandoverItem(p => ({ ...p, conditionAtHandover: v }))}
                    >
                      <SelectTrigger data-testid="select-handover-condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_RATINGS.map((cr) => (
                          <SelectItem key={cr.value} value={cr.value}>{cr.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      placeholder="Handover notes..."
                      value={newHandoverItem.conditionNotes}
                      onChange={(e) => setNewHandoverItem(p => ({ ...p, conditionNotes: e.target.value }))}
                      rows={2}
                      data-testid="input-handover-notes"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsAddingHandover(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddHandover} disabled={addHandoverMutation.isPending} data-testid="button-save-handover">
                      <Save className="h-4 w-4 mr-2" />
                      Save Item
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsAddingHandover(true)} data-testid="button-add-handover">
                <Plus className="h-4 w-4 mr-2" />
                Add Handover Item
              </Button>
            )}

            {/* Handover Items List */}
            {handoverLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : handoverItems && handoverItems.length > 0 ? (
              <div className="space-y-2">
                {handoverItems.map((item) => (
                  <Card key={item.id} data-testid={`handover-item-${item.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{item.inventoryItem?.name || `Item #${item.inventoryItemId}`}</p>
                            {item.quantity > 1 && <Badge variant="outline">x{item.quantity}</Badge>}
                          </div>
                          {item.conditionNotes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.conditionNotes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getConditionBadgeVariant(item.conditionAtHandover)}>
                            {item.conditionAtHandover}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteHandoverMutation.mutate(item.id)}
                            disabled={deleteHandoverMutation.isPending}
                            data-testid={`button-delete-handover-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No handover items recorded yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = parseInt(id || "0");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  const { data: tenant, isLoading: tenantLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenants", tenantId],
    enabled: !isNaN(tenantId) && tenantId > 0,
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", "TENANT", tenantId],
    enabled: !isNaN(tenantId) && tenantId > 0,
  });

  type LeaseWithProperty = Lease & { property?: Property };
  const { data: leases, isLoading: leasesLoading } = useQuery<LeaseWithProperty[]>({
    queryKey: ["/api/tenants", tenantId, "leases"],
    enabled: !isNaN(tenantId) && tenantId > 0,
  });

  // Fetch onboarding processes for this tenant
  const { data: onboardingProcesses, isLoading: onboardingLoading } = useQuery<OnboardingProcess[]>({
    queryKey: ["/api/tenants", tenantId, "onboarding"],
    enabled: !isNaN(tenantId) && tenantId > 0,
  });

  const form = useForm<KycFormData>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      passportNumber: "",
      nationality: "",
      dateOfBirth: "",
      workPermitNumber: "",
      workPermitExpiry: "",
      verificationStatus: "PENDING",
      kycNotes: "",
    },
  });

  const updateKycMutation = useMutation({
    mutationFn: async (data: KycFormData) => {
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth || null,
        workPermitExpiry: data.workPermitExpiry || null,
      };
      return apiRequest("PUT", `/api/tenants/${tenantId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsEditingKyc(false);
      toast({
        title: "KYC updated",
        description: "Tenant verification information has been saved.",
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

  const uploadDocMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("documentType", documentType);
      formData.append("module", "TENANT");
      formData.append("moduleId", tenantId.toString());

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "TENANT", tenantId] });
      setUploadingType(null);
      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      setUploadingType(null);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      return apiRequest("DELETE", `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "TENANT", tenantId] });
      setDeletingDoc(null);
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
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

  const startEditKyc = () => {
    if (tenant) {
      form.reset({
        passportNumber: tenant.passportNumber || "",
        nationality: tenant.nationality || "",
        dateOfBirth: tenant.dateOfBirth ? new Date(tenant.dateOfBirth).toISOString().split("T")[0] : "",
        workPermitNumber: tenant.workPermitNumber || "",
        workPermitExpiry: tenant.workPermitExpiry ? new Date(tenant.workPermitExpiry).toISOString().split("T")[0] : "",
        verificationStatus: (tenant.verificationStatus as any) || "PENDING",
        kycNotes: tenant.kycNotes || "",
      });
      setIsEditingKyc(true);
    }
  };

  const handleFileUpload = (documentType: string) => {
    setUploadingType(documentType);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingType) {
      uploadDocMutation.mutate({ file, documentType: uploadingType });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-6">
        <Link href="/tenants">
          <Button variant="ghost" size="sm" data-testid="button-back-not-found">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tenant not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const idDocuments = documents?.filter(d => d.documentType === "ID_DOCUMENT") || [];
  const otherDocuments = documents?.filter(d => d.documentType !== "ID_DOCUMENT") || [];

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        data-testid="input-file-upload"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-tenant-name">
            {tenant.legalName}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="secondary">
              {tenant.tenantType === "INDIVIDUAL" ? "Individual" : "Company"}
            </Badge>
            <Badge variant={getVerificationStatusVariant(tenant.verificationStatus || "PENDING")}>
              {getVerificationStatusIcon(tenant.verificationStatus || "PENDING")}
              <span className="ml-1">{tenant.verificationStatus || "PENDING"}</span>
            </Badge>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <User className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="onboarding" data-testid="tab-onboarding">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Onboarding
            {onboardingProcesses && onboardingProcesses.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {onboardingProcesses.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{tenant.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{tenant.phone}</span>
            </div>
            {(tenant.addressLine1 || tenant.city || tenant.country) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {tenant.addressLine1 && <div>{tenant.addressLine1}</div>}
                  {tenant.addressLine2 && <div>{tenant.addressLine2}</div>}
                  {(tenant.city || tenant.country) && (
                    <div>{[tenant.city, tenant.country].filter(Boolean).join(", ")}</div>
                  )}
                </div>
              </div>
            )}
            {tenant.emergencyContactName && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Emergency Contact</p>
                <p className="text-sm font-medium">{tenant.emergencyContactName}</p>
                {tenant.emergencyContactPhone && (
                  <p className="text-sm text-muted-foreground">{tenant.emergencyContactPhone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Active Leases
              </CardTitle>
              <CardDescription>
                Properties and units rented by this tenant
              </CardDescription>
            </div>
            <Link href="/leases">
              <Button variant="ghost" size="sm" data-testid="button-view-all-leases">
                View All
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {leasesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : !leases || leases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active leases for this tenant</p>
                <Link href="/leases">
                  <Button variant="ghost" size="sm" className="mt-2" data-testid="button-create-lease">
                    Create Lease
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {leases.map((lease) => (
                  <div
                    key={lease.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                    data-testid={`lease-row-${lease.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <Link href={`/properties/${lease.propertyId}`}>
                          <p className="text-sm font-medium hover:text-primary cursor-pointer" data-testid={`link-property-${lease.id}`}>
                            {lease.property?.name || `Property #${lease.propertyId}`}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>
                            {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {lease.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {lease.rentAmount ? parseFloat(String(lease.rentAmount)).toLocaleString() : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lease.rentFrequency || "Monthly"}
                        </p>
                      </div>
                      <Link href={`/leases/${lease.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-lease-${lease.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                KYC Verification
              </CardTitle>
              <CardDescription>
                Identity verification and document collection
              </CardDescription>
            </div>
            {!isEditingKyc ? (
              <Button variant="outline" size="sm" onClick={startEditKyc} data-testid="button-edit-kyc">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingKyc(false)}
                  data-testid="button-cancel-kyc"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={form.handleSubmit((data) => updateKycMutation.mutate(data))}
                  disabled={updateKycMutation.isPending}
                  data-testid="button-save-kyc"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditingKyc ? (
              <Form {...form}>
                <form className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="passportNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport / ID Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., N0177974" data-testid="input-passport" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Seychelles" data-testid="input-nationality" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workPermitNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Permit / GOP Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="If applicable" data-testid="input-work-permit" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workPermitExpiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Permit Expiry</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-permit-expiry" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="verificationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-verification-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PENDING" data-testid="select-status-pending">Pending</SelectItem>
                              <SelectItem value="IN_PROGRESS" data-testid="select-status-in-progress">In Progress</SelectItem>
                              <SelectItem value="VERIFIED" data-testid="select-status-verified">Verified</SelectItem>
                              <SelectItem value="REJECTED" data-testid="select-status-rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="kycNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KYC Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Add any notes about the verification process..."
                            data-testid="input-kyc-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Passport / ID Number</p>
                  <p className="text-sm font-medium" data-testid="text-passport">
                    {tenant.passportNumber || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <p className="text-sm font-medium" data-testid="text-nationality">
                    {tenant.nationality || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium" data-testid="text-dob">
                    {formatDate(tenant.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work Permit / GOP</p>
                  <p className="text-sm font-medium" data-testid="text-work-permit">
                    {tenant.workPermitNumber || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work Permit Expiry</p>
                  <p className="text-sm font-medium" data-testid="text-permit-expiry">
                    {formatDate(tenant.workPermitExpiry)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">KYC Completed</p>
                  <p className="text-sm font-medium" data-testid="text-kyc-completed">
                    {formatDate(tenant.kycCompletedAt)}
                  </p>
                </div>
                {tenant.kycNotes && (
                  <div className="sm:col-span-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm" data-testid="text-kyc-notes">{tenant.kycNotes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Identity Documents
              </CardTitle>
              <CardDescription>
                Passport, ID cards, work permits, GOP documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileUpload("ID_DOCUMENT")}
              disabled={uploadDocMutation.isPending && uploadingType === "ID_DOCUMENT"}
              data-testid="button-upload-id"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : idDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No identity documents uploaded yet</p>
                <p className="text-xs">Upload passport, ID card, or work permit</p>
              </div>
            ) : (
              <div className="space-y-2">
                {idDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`doc-id-${doc.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a href={`/api/documents/${doc.id}/download`} download data-testid={`link-download-id-${doc.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-download-${doc.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingDoc(doc)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5" />
                Agreements & Other Documents
              </CardTitle>
              <CardDescription>
                Signed tenancy agreements and other records
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileUpload("LEASE_AGREEMENT")}
              disabled={uploadDocMutation.isPending && uploadingType === "LEASE_AGREEMENT"}
              data-testid="button-upload-agreement"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : otherDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No agreements uploaded yet</p>
                <p className="text-xs">Upload signed tenancy agreements</p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`doc-other-${doc.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {documentTypeLabels[doc.documentType] || doc.documentType} - {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a href={`/api/documents/${doc.id}/download`} download data-testid={`link-download-other-${doc.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-download-${doc.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingDoc(doc)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-6">
          <OnboardingSection 
            tenantId={tenantId}
            onboardingProcesses={onboardingProcesses}
            onboardingLoading={onboardingLoading}
            leases={leases}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deletingDoc} onOpenChange={() => setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDoc?.originalName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDoc && deleteDocMutation.mutate(deletingDoc.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
