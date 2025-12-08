import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, UserCircle, Phone, Mail, Building2, Edit2, Trash2, Search, Percent, Star, Users, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { OwnerTeamManager } from "@/components/owner-team-manager";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import type { Owner, ComplianceDocument } from "@shared/schema";

interface ComplianceDocumentWithStatus extends ComplianceDocument {
  computedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NOT_APPLICABLE";
  daysUntilExpiry: number | null;
  entityName?: string;
}

const ownerFormSchema = z.object({
  ownerType: z.enum(["INDIVIDUAL", "COMPANY", "TRUST"]),
  legalName: z.string().min(1, "Name is required"),
  tradingName: z.string().optional(),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  isResident: z.number().optional(),
  isDefault: z.number().optional(),
  notes: z.string().optional(),
});

type OwnerFormData = z.infer<typeof ownerFormSchema>;

export default function OwnersPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [deletingOwner, setDeletingOwner] = useState<Owner | null>(null);
  const [teamManagingOwner, setTeamManagingOwner] = useState<Owner | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: owners, isLoading } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: allComplianceDocuments } = useQuery<ComplianceDocumentWithStatus[]>({
    queryKey: ["/api/compliance-documents"],
  });

  const getOwnerComplianceStatus = (ownerId: number) => {
    const ownerDocs = allComplianceDocuments?.filter(
      (doc) => doc.entityType === "OWNER" && doc.entityId === ownerId
    ) || [];
    const expired = ownerDocs.filter((d) => d.computedStatus === "EXPIRED").length;
    const expiring = ownerDocs.filter((d) => d.computedStatus === "EXPIRING_SOON").length;
    return { total: ownerDocs.length, expired, expiring };
  };

  const form = useForm<OwnerFormData>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      ownerType: "INDIVIDUAL",
      legalName: "",
      tradingName: "",
      email: "",
      phone: "",
      registrationNumber: "",
      taxId: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      isResident: 1,
      isDefault: 0,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      if (editingOwner) {
        return apiRequest("PUT", `/api/owners/${editingOwner.id}`, data);
      }
      return apiRequest("POST", "/api/owners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setIsFormOpen(false);
      setEditingOwner(null);
      form.reset();
      toast({
        title: editingOwner ? "Owner updated" : "Owner created",
        description: `The owner has been ${editingOwner ? "updated" : "created"} successfully.`,
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/owners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setDeletingOwner(null);
      toast({
        title: "Owner deleted",
        description: "The owner has been deleted successfully.",
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

  const openEditForm = (owner: Owner) => {
    setEditingOwner(owner);
    form.reset({
      ownerType: owner.ownerType as "INDIVIDUAL" | "COMPANY" | "TRUST",
      legalName: owner.legalName,
      tradingName: owner.tradingName || "",
      email: owner.email || "",
      phone: owner.phone || "",
      registrationNumber: owner.registrationNumber || "",
      taxId: owner.taxId || "",
      addressLine1: owner.addressLine1 || "",
      addressLine2: owner.addressLine2 || "",
      city: owner.city || "",
      state: owner.state || "",
      country: owner.country || "",
      postalCode: owner.postalCode || "",
      isResident: owner.isResident ?? 1,
      isDefault: owner.isDefault ?? 0,
      notes: owner.notes || "",
    });
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingOwner(null);
    form.reset({
      ownerType: "INDIVIDUAL",
      legalName: "",
      tradingName: "",
      email: "",
      phone: "",
      registrationNumber: "",
      taxId: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      isResident: 1,
      isDefault: 0,
      notes: "",
    });
    setIsFormOpen(true);
  };

  const filteredOwners = owners?.filter((owner) =>
    owner.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.phone?.includes(searchTerm)
  );

  const ownerTypeLabels: Record<string, string> = {
    INDIVIDUAL: "Individual",
    COMPANY: "Company",
    TRUST: "Trust",
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">
              Property Owners
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage property owners and their ownership stakes
            </p>
          </div>
          <Button className="gap-2" onClick={openNewForm} data-testid="button-add-owner">
            <Plus className="h-4 w-4" />
            Add Owner
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-owners"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredOwners && filteredOwners.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOwners.map((owner) => (
              <Card key={owner.id} data-testid={`card-owner-${owner.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{owner.legalName}</CardTitle>
                      {owner.tradingName && (
                        <p className="text-sm text-muted-foreground truncate">
                          t/a {owner.tradingName}
                        </p>
                      )}
                      <CardDescription className="flex flex-wrap items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {ownerTypeLabels[owner.ownerType] || owner.ownerType}
                        </Badge>
                        {owner.isDefault === 1 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(() => {
                        const status = getOwnerComplianceStatus(owner.id);
                        const hasIssues = status.expired > 0 || status.expiring > 0;
                        return (
                          <Link href={`/compliance?owner=${owner.id}`}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={hasIssues ? "text-amber-600 dark:text-amber-400" : ""}
                              data-testid={`button-compliance-${owner.id}`}
                              title={status.total > 0 ? `${status.total} compliance docs${hasIssues ? ` (${status.expired} expired, ${status.expiring} expiring)` : ""}` : "Manage compliance documents"}
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          </Link>
                        );
                      })()}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setTeamManagingOwner(owner)}
                        data-testid={`button-manage-team-${owner.id}`}
                        title="Manage Team"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditForm(owner)}
                        data-testid={`button-edit-owner-${owner.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingOwner(owner)}
                        data-testid={`button-delete-owner-${owner.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {owner.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                  )}
                  {owner.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{owner.phone}</span>
                    </div>
                  )}
                  {owner.taxId && (
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 shrink-0" />
                      <span>Tax ID: {owner.taxId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UserCircle}
            title="No owners yet"
            description="Get started by adding property owners. You can then assign ownership percentages to properties."
            actionLabel="Add Your First Owner"
            onAction={openNewForm}
          />
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOwner ? "Edit Owner" : "Add New Owner"}</DialogTitle>
            <DialogDescription>
              {editingOwner
                ? "Update the owner information."
                : "Add a new property owner to your system."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="ownerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-owner-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="COMPANY">Company</SelectItem>
                        <SelectItem value="TRUST">Trust</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name / Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-owner-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Name (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Business name used for trading" data-testid="input-trading-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-owner-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-owner-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID / GST Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-tax-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-postal-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number (for companies)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-registration-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                        data-testid="checkbox-default-owner"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Default Owner</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Set this as the default owner entity for new properties
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-owner">
                  {createMutation.isPending ? "Saving..." : editingOwner ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingOwner} onOpenChange={() => setDeletingOwner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Owner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingOwner?.legalName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingOwner && deleteMutation.mutate(deletingOwner.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {teamManagingOwner && (
        <OwnerTeamManager
          owner={teamManagingOwner}
          isOpen={!!teamManagingOwner}
          onClose={() => setTeamManagingOwner(null)}
        />
      )}
    </div>
  );
}
