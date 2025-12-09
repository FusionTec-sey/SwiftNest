import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Refrigerator, Trash2, Wrench, AlertTriangle, Clock, Phone, Mail } from "lucide-react";
import type { ApplianceWithDetails, Property, ApplianceServiceHistory } from "@shared/schema";

const CATEGORIES = [
  { value: "KITCHEN", label: "Kitchen" },
  { value: "LAUNDRY", label: "Laundry" },
  { value: "HVAC", label: "HVAC" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "OUTDOOR", label: "Outdoor" },
  { value: "SECURITY", label: "Security" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "OTHER", label: "Other" },
];

const applianceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  category: z.string().default("OTHER"),
  location: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  purchaseStore: z.string().optional(),
  warrantyStartDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  warrantyDetails: z.string().optional(),
  serviceProviderName: z.string().optional(),
  serviceProviderPhone: z.string().optional(),
  serviceProviderEmail: z.string().optional(),
  notes: z.string().optional(),
});

const serviceHistorySchema = z.object({
  serviceDate: z.string().min(1, "Date is required"),
  serviceType: z.string().min(1, "Type is required"),
  description: z.string().optional(),
  servicedBy: z.string().optional(),
  cost: z.string().optional(),
  notes: z.string().optional(),
});

type ApplianceFormData = z.infer<typeof applianceSchema>;
type ServiceHistoryFormData = z.infer<typeof serviceHistorySchema>;

export default function AppliancesPage() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id || "0");
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<number | null>(null);
  const [isServiceOpen, setIsServiceOpen] = useState(false);

  const { data: property } = useQuery<Property>({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });

  const { data: appliances = [], isLoading } = useQuery<ApplianceWithDetails[]>({
    queryKey: ['/api/properties', propertyId, 'appliances'],
    enabled: !!propertyId,
  });

  const form = useForm<ApplianceFormData>({
    resolver: zodResolver(applianceSchema),
    defaultValues: {
      name: "",
      brand: "",
      model: "",
      serialNumber: "",
      category: "OTHER",
      location: "",
      purchaseDate: "",
      purchasePrice: "",
      purchaseStore: "",
      warrantyStartDate: "",
      warrantyEndDate: "",
      warrantyDetails: "",
      serviceProviderName: "",
      serviceProviderPhone: "",
      serviceProviderEmail: "",
      notes: "",
    },
  });

  const serviceForm = useForm<ServiceHistoryFormData>({
    resolver: zodResolver(serviceHistorySchema),
    defaultValues: {
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: "",
      description: "",
      servicedBy: "",
      cost: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ApplianceFormData) => {
      return apiRequest("POST", `/api/properties/${propertyId}/appliances`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'appliances'] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Appliance added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/appliances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'appliances'] });
      toast({ title: "Appliance removed" });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: ServiceHistoryFormData) => {
      return apiRequest("POST", `/api/appliances/${selectedAppliance}/service-history`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'appliances'] });
      setIsServiceOpen(false);
      serviceForm.reset();
      toast({ title: "Service record added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ApplianceFormData) => {
    createMutation.mutate(data);
  };

  const onServiceSubmit = (data: ServiceHistoryFormData) => {
    addServiceMutation.mutate(data);
  };

  const getWarrantyStatus = (appliance: ApplianceWithDetails) => {
    if (!appliance.warrantyEndDate) return null;
    const endDate = new Date(appliance.warrantyEndDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="secondary">Warranty Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="destructive">Expires Soon</Badge>;
    } else if (daysUntilExpiry <= 90) {
      return <Badge variant="default">Under Warranty</Badge>;
    }
    return <Badge variant="outline">Under Warranty</Badge>;
  };

  if (property?.usageType !== "OWNER_OCCUPIED") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Appliance tracking is for owner-occupied properties</p>
      </div>
    );
  }

  const expiringWarranties = appliances.filter(a => {
    if (!a.warrantyEndDate) return false;
    const endDate = new Date(a.warrantyEndDate);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 90;
  });

  const groupedAppliances = CATEGORIES.reduce((acc, cat) => {
    const items = appliances.filter(a => a.category === cat.value);
    if (items.length > 0) {
      acc.push({ category: cat.label, items });
    }
    return acc;
  }, [] as { category: string; items: ApplianceWithDetails[] }[]);

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Appliances</h1>
          <p className="text-muted-foreground">Track appliances, warranties, and service history</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-appliance">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Appliance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Appliance</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-appliance-name" placeholder="e.g., Samsung Refrigerator" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input data-testid="input-appliance-brand" placeholder="Samsung" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input data-testid="input-appliance-model" placeholder="Model number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appliance-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input data-testid="input-appliance-location" placeholder="Kitchen" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input data-testid="input-appliance-serial" placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-appliance-purchase-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" data-testid="input-appliance-price" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="warrantyStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Start</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-appliance-warranty-start" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="warrantyEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty End</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-appliance-warranty-end" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="serviceProviderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Provider</FormLabel>
                      <FormControl>
                        <Input data-testid="input-appliance-service-provider" placeholder="Preferred technician or company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea data-testid="input-appliance-notes" placeholder="Additional details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-appliance">
                    {createMutation.isPending ? "Adding..." : "Add Appliance"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {expiringWarranties.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              Warranties Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {expiringWarranties.map(a => (
                <Badge key={a.id} variant="outline">
                  {a.name} - expires {new Date(a.warrantyEndDate!).toLocaleDateString()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isServiceOpen} onOpenChange={setIsServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Record</DialogTitle>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="serviceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Date</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-service-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Repair">Repair</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Inspection">Inspection</SelectItem>
                          <SelectItem value="Replacement">Part Replacement</SelectItem>
                          <SelectItem value="Cleaning">Cleaning</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={serviceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea data-testid="input-service-description" placeholder="What was done..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="servicedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviced By</FormLabel>
                      <FormControl>
                        <Input data-testid="input-service-by" placeholder="Technician name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" data-testid="input-service-cost" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsServiceOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addServiceMutation.isPending} data-testid="button-submit-service">
                  {addServiceMutation.isPending ? "Adding..." : "Add Record"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : appliances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Refrigerator className="mx-auto h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">No appliances tracked yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your home appliances to track warranties and service history</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {groupedAppliances.map(group => (
            <AccordionItem key={group.category} value={group.category} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{group.category}</span>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {group.items.map(appliance => (
                    <ApplianceCard
                      key={appliance.id}
                      appliance={appliance}
                      onDelete={() => deleteMutation.mutate(appliance.id)}
                      onAddService={() => {
                        setSelectedAppliance(appliance.id);
                        setIsServiceOpen(true);
                      }}
                      warrantyBadge={getWarrantyStatus(appliance)}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function ApplianceCard({
  appliance,
  onDelete,
  onAddService,
  warrantyBadge,
}: {
  appliance: ApplianceWithDetails;
  onDelete: () => void;
  onAddService: () => void;
  warrantyBadge: React.ReactNode;
}) {
  return (
    <Card data-testid={`card-appliance-${appliance.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{appliance.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {appliance.brand && <span className="text-sm text-muted-foreground">{appliance.brand}</span>}
              {appliance.model && <span className="text-sm text-muted-foreground">- {appliance.model}</span>}
              {appliance.location && (
                <Badge variant="outline" className="text-xs">{appliance.location}</Badge>
              )}
            </div>
          </div>
          {warrantyBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {appliance.serialNumber && (
            <div>
              <span className="text-muted-foreground">Serial: </span>
              <span>{appliance.serialNumber}</span>
            </div>
          )}
          {appliance.purchaseDate && (
            <div>
              <span className="text-muted-foreground">Purchased: </span>
              <span>{new Date(appliance.purchaseDate).toLocaleDateString()}</span>
            </div>
          )}
          {appliance.warrantyEndDate && (
            <div>
              <span className="text-muted-foreground">Warranty until: </span>
              <span>{new Date(appliance.warrantyEndDate).toLocaleDateString()}</span>
            </div>
          )}
          {appliance.purchasePrice && (
            <div>
              <span className="text-muted-foreground">Price: </span>
              <span>${parseFloat(appliance.purchasePrice).toFixed(2)}</span>
            </div>
          )}
        </div>

        {(appliance.serviceProviderName || appliance.serviceProviderPhone || appliance.serviceProviderEmail) && (
          <div className="text-sm border-t pt-2 mt-2">
            <p className="text-muted-foreground mb-1">Service Provider:</p>
            <div className="flex flex-wrap gap-3">
              {appliance.serviceProviderName && <span>{appliance.serviceProviderName}</span>}
              {appliance.serviceProviderPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  {appliance.serviceProviderPhone}
                </span>
              )}
              {appliance.serviceProviderEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  {appliance.serviceProviderEmail}
                </span>
              )}
            </div>
          </div>
        )}

        {appliance.serviceHistory && appliance.serviceHistory.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Service History ({appliance.serviceHistory.length})
            </p>
            <div className="space-y-1">
              {appliance.serviceHistory.slice(0, 3).map((record: ApplianceServiceHistory) => (
                <div key={record.id} className="text-xs flex justify-between">
                  <span>
                    {new Date(record.serviceDate).toLocaleDateString()} - {record.serviceType}
                    {record.description && `: ${record.description.slice(0, 50)}`}
                  </span>
                  {record.cost && <span>${parseFloat(record.cost).toFixed(2)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-1 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAddService}
            data-testid={`button-add-service-${appliance.id}`}
          >
            <Wrench className="h-3 w-3 mr-1" aria-hidden="true" />
            Add Service
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            title="Delete"
            data-testid={`button-delete-${appliance.id}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
