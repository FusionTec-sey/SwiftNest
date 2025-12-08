import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Plus, Trash2, Calendar, DollarSign, Search, Building2 } from "lucide-react";
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
import type { Asset, Owner, Property } from "@shared/schema";

const assetFormSchema = z.object({
  ownerId: z.number().min(1, "Owner is required"),
  propertyId: z.number().optional(),
  assetCategory: z.enum(["LAND", "BUILDING", "FURNITURE", "EQUIPMENT", "VEHICLE", "COMPUTER", "OTHER"]),
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().min(1, "Acquisition date is required"),
  cost: z.string().min(1, "Cost is required"),
  salvageValue: z.string().optional(),
  usefulLifeMonths: z.number().min(1, "Useful life is required"),
  bookMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]).default("STRAIGHT_LINE"),
  taxMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]).default("STRAIGHT_LINE"),
  businessUsePercent: z.string().optional(),
  status: z.enum(["ACTIVE", "FULLY_DEPRECIATED", "DISPOSED", "IMPAIRED"]).default("ACTIVE"),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

const formatCurrency = (amount: string | number | null) => {
  if (!amount) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SCR",
  }).format(num);
};

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "FULLY_DEPRECIATED":
      return "secondary";
    case "DISPOSED":
      return "outline";
    case "IMPAIRED":
      return "destructive";
    default:
      return "outline";
  }
};

export default function AssetsPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: owners } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      ownerId: 0,
      assetCategory: "EQUIPMENT",
      name: "",
      description: "",
      serialNumber: "",
      acquisitionDate: "",
      cost: "",
      salvageValue: "",
      usefulLifeMonths: 60,
      bookMethod: "STRAIGHT_LINE",
      taxMethod: "STRAIGHT_LINE",
      businessUsePercent: "100",
      status: "ACTIVE",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      if (editingAsset) {
        return apiRequest("PATCH", `/api/assets/${editingAsset.id}`, data);
      }
      return apiRequest("POST", "/api/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsFormOpen(false);
      setEditingAsset(null);
      form.reset();
      toast({
        title: editingAsset ? "Asset updated" : "Asset created",
        description: editingAsset
          ? "The asset has been updated successfully."
          : "A new asset has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setDeletingAsset(null);
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openNewForm = () => {
    setEditingAsset(null);
    form.reset({
      ownerId: 0,
      assetCategory: "EQUIPMENT",
      name: "",
      description: "",
      serialNumber: "",
      acquisitionDate: new Date().toISOString().split("T")[0],
      cost: "",
      salvageValue: "",
      usefulLifeMonths: 60,
      bookMethod: "STRAIGHT_LINE",
      taxMethod: "STRAIGHT_LINE",
      businessUsePercent: "100",
      status: "ACTIVE",
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

  const filteredAssets = assets?.filter((asset) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      asset.name.toLowerCase().includes(searchLower) ||
      asset.assetCategory.toLowerCase().includes(searchLower) ||
      (asset.serialNumber?.toLowerCase().includes(searchLower) ?? false)
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
            <h1 className="text-2xl font-semibold">Asset Register</h1>
            <p className="text-sm text-muted-foreground">
              Track assets and calculate depreciation
            </p>
          </div>
          <Button onClick={openNewForm} data-testid="button-add-asset">
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>
        <div className="px-4 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-assets"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {filteredAssets && filteredAssets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} data-testid={`card-asset-${asset.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0" />
                        {asset.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getOwnerName(asset.ownerId)}
                        {getPropertyName(asset.propertyId) && (
                          <span className="flex items-center gap-1 text-xs">
                            <Building2 className="h-3 w-3" />
                            {getPropertyName(asset.propertyId)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingAsset(asset)}
                        data-testid={`button-delete-asset-${asset.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusVariant(asset.status)}>
                      {asset.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">{asset.assetCategory}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Cost
                      </span>
                      <span className="font-medium">{formatCurrency(asset.cost)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Acquired
                      </span>
                      <span>{formatDate(asset.acquisitionDate)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Book Depreciation</span>
                      <span>{formatCurrency(asset.bookAccumulatedDepreciation)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tax Depreciation</span>
                      <span>{formatCurrency(asset.taxAccumulatedDepreciation)}</span>
                    </div>

                    {asset.serialNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Serial #</span>
                        <span className="font-mono text-xs">{asset.serialNumber}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="No assets yet"
            description="Add your first asset to start tracking depreciation."
            actionLabel="Add Your First Asset"
            onAction={openNewForm}
          />
        )}
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
            <DialogDescription>
              {editingAsset
                ? "Update the asset details."
                : "Add a new asset to the register."}
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
                      onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-asset-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetCategory"
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
                          <SelectItem value="LAND">Land</SelectItem>
                          <SelectItem value="BUILDING">Building</SelectItem>
                          <SelectItem value="FURNITURE">Furniture</SelectItem>
                          <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                          <SelectItem value="VEHICLE">Vehicle</SelectItem>
                          <SelectItem value="COMPUTER">Computer</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Textarea {...field} data-testid="textarea-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-serial-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acquisitionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Acquisition Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-acquisition-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salvageValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salvage Value</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-salvage-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="usefulLifeMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Useful Life (Months)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-useful-life"
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
                  name="bookMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Book Depreciation Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-book-method">
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

                <FormField
                  control={form.control}
                  name="taxMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Depreciation Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tax-method">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessUsePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Use %</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" max="100" data-testid="input-business-use" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="FULLY_DEPRECIATED">Fully Depreciated</SelectItem>
                          <SelectItem value="DISPOSED">Disposed</SelectItem>
                          <SelectItem value="IMPAIRED">Impaired</SelectItem>
                        </SelectContent>
                      </Select>
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
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-asset">
                  {createMutation.isPending ? "Saving..." : editingAsset ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingAsset} onOpenChange={() => setDeletingAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete asset "{deletingAsset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAsset && deleteMutation.mutate(deletingAsset.id)}
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
