import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Building,
  Building2,
  Home,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  Store,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/header";
import { UnitForm } from "@/components/unit-form";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Unit, InsertUnit } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[] };

const propertyTypeIcons: Record<string, typeof Building> = {
  APARTMENT: Building,
  VILLA: Home,
  PLOT: Landmark,
  OFFICE: Building2,
  SHOP: Store,
};

const propertyTypeColors: Record<string, string> = {
  APARTMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  VILLA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  PLOT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  OFFICE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  SHOP: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
};

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const propertyId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const { data: property, isLoading, error } = useQuery<PropertyWithUnits>({
    queryKey: ["/api/properties", propertyId],
    enabled: !isNaN(propertyId),
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property deleted",
        description: "The property has been deleted successfully.",
      });
      setLocation("/properties");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: InsertUnit) => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/units`, data);
      return await res.json() as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
      toast({
        title: "Unit added",
        description: "The unit has been added successfully.",
      });
      setUnitFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ unitId, data }: { unitId: number; data: InsertUnit }) => {
      const res = await apiRequest("PUT", `/api/units/${unitId}`, data);
      return await res.json() as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
      toast({
        title: "Unit updated",
        description: "The unit has been updated successfully.",
      });
      setUnitFormOpen(false);
      setEditingUnit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      await apiRequest("DELETE", `/api/units/${unitId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
      toast({
        title: "Unit deleted",
        description: "The unit has been deleted successfully.",
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">Property not found</h2>
            <p className="text-muted-foreground mb-6">
              The property you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/properties">
              <Button>Back to Properties</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const Icon = propertyTypeIcons[property.propertyType] || Building;
  const typeColorClass = propertyTypeColors[property.propertyType] || "bg-muted text-muted-foreground";

  const fullAddress = [
    property.addressLine1,
    property.addressLine2,
    property.city,
    property.state,
    property.country,
    property.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const vacantCount = property.units?.filter((u) => u.status === "VACANT").length || 0;
  const occupiedCount = property.units?.filter((u) => u.status === "OCCUPIED").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/">
              <span className="hover:text-foreground cursor-pointer">Dashboard</span>
            </Link>
            <span>/</span>
            <Link href="/properties">
              <span className="hover:text-foreground cursor-pointer">Properties</span>
            </Link>
            <span>/</span>
            <span className="text-foreground">{property.name}</span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold" data-testid="text-property-name">{property.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="secondary" 
                  className={`gap-1 ${typeColorClass} border-0`}
                  data-testid="badge-property-type"
                >
                  <Icon className="h-3 w-3" />
                  {property.propertyType}
                </Badge>
                {property.ownerOrgName && (
                  <Badge variant="outline" data-testid="badge-org-name">
                    <Building2 className="h-3 w-3 mr-1" />
                    {property.ownerOrgName}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href={`/properties/${propertyId}/edit`}>
                <Button variant="outline" className="gap-2" data-testid="button-edit-property">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" data-testid="button-delete-property">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Property</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{property.name}"? This action cannot be undone.
                      {property.units?.length > 0 &&
                        ` This will also delete ${property.units.length} unit(s) associated with this property.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletePropertyMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                      disabled={deletePropertyMutation.isPending}
                      data-testid="button-confirm-delete-property"
                    >
                      {deletePropertyMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center rounded-t-md">
                <Icon className="h-24 w-24 text-primary/40" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground" data-testid="text-full-address">{fullAddress}</p>
                    {property.latitude && property.longitude && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Coordinates: {property.latitude}, {property.longitude}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-lg">Units</CardTitle>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEditingUnit(null);
                    setUnitFormOpen(true);
                  }}
                  data-testid="button-add-unit"
                >
                  <Plus className="h-4 w-4" />
                  Add Unit
                </Button>
              </CardHeader>
              <CardContent>
                {property.units && property.units.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit Name</TableHead>
                        <TableHead>Floor</TableHead>
                        <TableHead>Area (sq.ft)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {property.units.map((unit) => (
                        <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`}>
                          <TableCell className="font-medium" data-testid={`text-unit-name-${unit.id}`}>
                            {unit.unitName}
                          </TableCell>
                          <TableCell>{unit.floor || "-"}</TableCell>
                          <TableCell>{unit.areaSqFt || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                unit.status === "VACANT"
                                  ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              }
                              data-testid={`badge-unit-status-${unit.id}`}
                            >
                              {unit.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  data-testid={`button-unit-menu-${unit.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingUnit(unit);
                                    setUnitFormOpen(true);
                                  }}
                                  className="cursor-pointer"
                                  data-testid={`button-edit-unit-${unit.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive cursor-pointer"
                                      data-testid={`button-delete-unit-${unit.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete unit "{unit.unitName}"? This action cannot be
                                        undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUnitMutation.mutate(unit.id)}
                                        className="bg-destructive text-destructive-foreground"
                                        disabled={deleteUnitMutation.isPending}
                                        data-testid={`button-confirm-delete-unit-${unit.id}`}
                                      >
                                        {deleteUnitMutation.isPending ? "Deleting..." : "Delete"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    icon={Home}
                    title="No units yet"
                    description="Add units to track individual apartments, rooms, or spaces within this property."
                    actionLabel="Add First Unit"
                    onAction={() => {
                      setEditingUnit(null);
                      setUnitFormOpen(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Units</span>
                  <span className="font-semibold" data-testid="stat-total-units">
                    {property.units?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vacant</span>
                  <Badge
                    variant="secondary"
                    className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    data-testid="stat-vacant-units"
                  >
                    {vacantCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Occupied</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    data-testid="stat-occupied-units"
                  >
                    {occupiedCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Property Type</p>
                  <p className="font-medium">{property.propertyType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{property.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{property.state}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{property.country}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <UnitForm
        propertyId={propertyId}
        defaultValues={editingUnit || undefined}
        open={unitFormOpen}
        onOpenChange={(open) => {
          setUnitFormOpen(open);
          if (!open) setEditingUnit(null);
        }}
        onSubmit={(data) => {
          if (editingUnit) {
            updateUnitMutation.mutate({ unitId: editingUnit.id, data });
          } else {
            createUnitMutation.mutate(data);
          }
        }}
        isSubmitting={createUnitMutation.isPending || updateUnitMutation.isPending}
      />
    </div>
  );
}
