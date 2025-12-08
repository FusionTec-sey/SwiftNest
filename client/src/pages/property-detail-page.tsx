import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Building,
  Building2,
  Home,
  ImagePlus,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  Store,
  Trash2,
  MoreVertical,
  Wrench,
  Warehouse,
  Factory,
  Layers,
  TreeDeciduous,
  HomeIcon,
  User,
  FileText,
  Receipt,
  Zap,
  Droplet,
  Flame,
  Gauge,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
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
import { UnitForm } from "@/components/unit-form";
import { EmptyState } from "@/components/empty-state";
import { ImageGallery } from "@/components/image-gallery";
import { ShareDialog } from "@/components/share-dialog";
import { PropertyTree } from "@/components/property-tree";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Unit, InsertUnit, LeaseWithDetails, UtilityBill, ComplianceDocument } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[]; userRole?: string; isOwner?: boolean };

interface ComplianceDocumentWithStatus extends ComplianceDocument {
  computedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NOT_APPLICABLE";
  daysUntilExpiry: number | null;
  entityName?: string;
}

const propertyTypeIcons: Record<string, typeof Building> = {
  APARTMENT: Building,
  VILLA: Home,
  HOUSE: HomeIcon,
  TOWNHOUSE: Layers,
  PLOT: Landmark,
  LAND: TreeDeciduous,
  OFFICE: Building2,
  SHOP: Store,
  WAREHOUSE: Warehouse,
  INDUSTRIAL: Factory,
  MIXED_USE: Layers,
};

const propertyTypeColors: Record<string, string> = {
  APARTMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  VILLA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  HOUSE: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  TOWNHOUSE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  PLOT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  LAND: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300",
  OFFICE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  SHOP: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
  WAREHOUSE: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  INDUSTRIAL: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  MIXED_USE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
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

  const { data: leases } = useQuery<LeaseWithDetails[]>({
    queryKey: [`/api/properties/${propertyId}/leases`],
    enabled: !isNaN(propertyId),
  });

  const { data: utilityBills } = useQuery<UtilityBill[]>({
    queryKey: ["/api/properties", propertyId, "utility-bills"],
  });

  const { data: complianceDocuments } = useQuery<ComplianceDocumentWithStatus[]>({
    queryKey: ["/api/compliance-documents/entity", "PROPERTY", propertyId],
    enabled: !isNaN(propertyId),
  });

  const getLeaseForUnit = (unitId: number): LeaseWithDetails | undefined => {
    return leases?.find(
      (lease) => 
        lease.unitId === unitId && 
        lease.status === "ACTIVE"
    );
  };

  const getPropertyLease = (): LeaseWithDetails | undefined => {
    return leases?.find(
      (lease) => 
        !lease.unitId && 
        lease.status === "ACTIVE"
    );
  };

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
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
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
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">Property not found</h2>
            <p className="text-muted-foreground mb-6">
              The property you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/properties">
              <Button>Back to Properties</Button>
            </Link>
          </div>
        </div>
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
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
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
            
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/properties/${propertyId}/maintenance`}>
                <Button variant="outline" className="gap-2" data-testid="button-maintenance">
                  <Wrench className="h-4 w-4" />
                  Maintenance
                </Button>
              </Link>
              {property.isOwner !== false && (
                <ShareDialog propertyId={propertyId} propertyName={property.name} />
              )}
              {(property.isOwner !== false || property.userRole === "EDITOR") && (
                <Link href={`/properties/${propertyId}/edit`}>
                  <Button variant="outline" className="gap-2" data-testid="button-edit-property">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              )}
              {property.isOwner !== false && (
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
              )}
              {property.userRole && property.userRole !== "OWNER" && (
                <Badge variant="secondary" className="text-xs">
                  {property.userRole === "EDITOR" ? "Editor" : "Viewer"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {property.images && property.images.length > 0 ? (
              <ImageGallery propertyId={propertyId} images={property.images} />
            ) : (
              <Card>
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center rounded-t-md relative">
                  <Icon className="h-24 w-24 text-primary/40" />
                  <div className="absolute bottom-4 right-4">
                    <input
                      id="quick-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const formData = new FormData();
                          Array.from(files).forEach((file) => {
                            formData.append("images", file);
                          });
                          try {
                            const res = await fetch(`/api/properties/${propertyId}/images`, {
                              method: "POST",
                              body: formData,
                              credentials: "include",
                            });
                            if (res.ok) {
                              queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
                            }
                          } catch {
                          }
                        }
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => document.getElementById("quick-upload")?.click()}
                      data-testid="button-quick-upload"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Add Photos
                    </Button>
                  </div>
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
            )}
            
            {property.images && property.images.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">{fullAddress}</p>
                      {property.latitude && property.longitude && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Coordinates: {property.latitude}, {property.longitude}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                        <TableHead>Tenant</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {property.units.map((unit) => {
                        const lease = getLeaseForUnit(unit.id);
                        return (
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
                          <TableCell data-testid={`text-unit-tenant-${unit.id}`}>
                            {lease?.tenant ? (
                              <Link href={`/tenants/${lease.tenant.id}`}>
                                <div className="flex items-center gap-2 hover:text-primary cursor-pointer">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{lease.tenant.legalName}</span>
                                </div>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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
                      )})}
                    
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

            <Card>
              <CardContent className="pt-6">
                <PropertyTree 
                  propertyId={propertyId} 
                  canEdit={property.isOwner !== false || property.userRole === "EDITOR"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Utility Bills
                </CardTitle>
                <Link href="/utilities">
                  <Button variant="outline" size="sm" data-testid="button-view-all-bills">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {utilityBills && utilityBills.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {utilityBills.slice(0, 5).map((bill) => (
                        <TableRow key={bill.id} data-testid={`row-bill-${bill.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getUtilityIcon(bill.utilityType)}
                              {bill.provider}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{bill.utilityType}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={new Date(bill.dueDate) < new Date() && bill.status !== "PAID" ? "text-destructive font-medium" : ""}>
                              {format(new Date(bill.dueDate), "dd MMM yyyy")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            SCR {parseFloat(bill.totalAmount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getBillStatusBadge(bill.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No utility bills recorded yet.</p>
                    <Link href="/utilities">
                      <Button variant="ghost" size="sm" className="mt-2" data-testid="button-record-first-bill">
                        Record your first bill
                      </Button>
                    </Link>
                  </div>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Compliance
                </CardTitle>
                <Link href={`/compliance?property=${propertyId}`}>
                  <Button variant="ghost" size="sm" data-testid="button-view-compliance">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {complianceDocuments && complianceDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {complianceDocuments.slice(0, 3).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2" data-testid={`compliance-doc-${doc.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.documentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.expiryDate ? format(new Date(doc.expiryDate), "dd MMM yyyy") : "No expiry"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            doc.computedStatus === "EXPIRED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              : doc.computedStatus === "EXPIRING_SOON"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                              : doc.computedStatus === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : ""
                          }
                        >
                          {doc.computedStatus === "EXPIRED" ? "Expired" :
                           doc.computedStatus === "EXPIRING_SOON" ? "Expiring" :
                           doc.computedStatus === "ACTIVE" ? "Active" : "N/A"}
                        </Badge>
                      </div>
                    ))}
                    {complianceDocuments.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{complianceDocuments.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No compliance documents</p>
                    <Link href={`/compliance?property=${propertyId}`}>
                      <Button variant="ghost" size="sm" className="mt-2" data-testid="button-add-compliance">
                        Add Document
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
