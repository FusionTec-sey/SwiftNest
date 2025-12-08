import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Gauge, Plus, Trash2, Zap, Droplet, Flame, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import type { UtilityMeter, Property, Unit } from "@shared/schema";

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

type UtilityMeterFormData = z.infer<typeof utilityMeterFormSchema>;

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

export default function UtilitiesPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<UtilityMeter | null>(null);
  const [deletingMeter, setDeletingMeter] = useState<UtilityMeter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: meters, isLoading } = useQuery<UtilityMeter[]>({
    queryKey: ["/api/utility-meters"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const form = useForm<UtilityMeterFormData>({
    resolver: zodResolver(utilityMeterFormSchema),
    defaultValues: {
      propertyId: 0,
      utilityType: "ELECTRICITY",
      meterNumber: "",
      provider: "",
      ratePerUnit: "",
      fixedCharge: "",
      isActive: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UtilityMeterFormData) => {
      if (editingMeter) {
        return apiRequest("PATCH", `/api/utility-meters/${editingMeter.id}`, data);
      }
      return apiRequest("POST", "/api/utility-meters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/utility-meters"] });
      setIsFormOpen(false);
      setEditingMeter(null);
      form.reset();
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

  const deleteMutation = useMutation({
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

  const openNewForm = () => {
    setEditingMeter(null);
    form.reset({
      propertyId: 0,
      utilityType: "ELECTRICITY",
      meterNumber: "",
      provider: "",
      ratePerUnit: "",
      fixedCharge: "",
      isActive: 1,
    });
    setIsFormOpen(true);
  };

  const getPropertyName = (propertyId: number) => {
    return properties?.find((p) => p.id === propertyId)?.name || "Unknown Property";
  };

  const filteredMeters = meters?.filter((meter) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      meter.meterNumber.toLowerCase().includes(searchLower) ||
      meter.utilityType.toLowerCase().includes(searchLower) ||
      (meter.provider?.toLowerCase().includes(searchLower) ?? false)
    );
  });

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
            <h1 className="text-2xl font-semibold">Utility Meters</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage utility meters across properties
            </p>
          </div>
          <Button onClick={openNewForm} data-testid="button-add-meter">
            <Plus className="mr-2 h-4 w-4" />
            Add Meter
          </Button>
        </div>
        <div className="px-4 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-meters"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {filteredMeters && filteredMeters.length > 0 ? (
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
                  <div className="flex items-center justify-between">
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
            onAction={openNewForm}
          />
        )}
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeter ? "Edit Meter" : "Add New Meter"}</DialogTitle>
            <DialogDescription>
              {editingMeter
                ? "Update the utility meter details."
                : "Add a new utility meter to track consumption."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
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
                  control={form.control}
                  name="utilityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utility Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-utility-type">
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
                  control={form.control}
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
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-provider" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-meter">
                  {createMutation.isPending ? "Saving..." : editingMeter ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
              onClick={() => deletingMeter && deleteMutation.mutate(deletingMeter.id)}
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
