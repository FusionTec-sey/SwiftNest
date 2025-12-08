import { Link } from "wouter";
import { Building, Building2, Home, Landmark, MapPin, MoreVertical, Pencil, Store, Trash2, Warehouse, Factory, Layers, TreeDeciduous, HomeIcon, User, DollarSign, Key } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Property, Unit } from "@shared/schema";

interface PropertyCardProps {
  property: Property & { units?: Unit[]; role?: string };
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
  hideDelete?: boolean;
  hideEdit?: boolean;
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

const occupancyPurposeLabels: Record<string, { label: string; icon: typeof User }> = {
  OWNER_OCCUPIED: { label: "Owner Occupied", icon: User },
  RENTAL: { label: "Rental", icon: Key },
  INVESTMENT: { label: "Investment", icon: DollarSign },
  VACANT_LAND: { label: "Vacant Land", icon: TreeDeciduous },
};

export function PropertyCard({ property, onDelete, isDeleting, hideDelete, hideEdit }: PropertyCardProps) {
  const Icon = propertyTypeIcons[property.propertyType] || Building;
  const typeColorClass = propertyTypeColors[property.propertyType] || "bg-muted text-muted-foreground";
  const unitCount = property.units?.length || 0;
  const vacantCount = property.units?.filter((u) => u.status === "VACANT").length || 0;
  const occupiedCount = property.units?.filter((u) => u.status === "OCCUPIED").length || 0;

  const fullAddress = [
    property.addressLine1,
    property.addressLine2,
    property.city,
    property.state,
    property.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="group overflow-visible hover-elevate" data-testid={`card-property-${property.id}`}>
      <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center rounded-t-md">
        <Icon className="h-16 w-16 text-primary/40" />
      </div>
      
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate" data-testid={`text-property-name-${property.id}`}>
            {property.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <Badge 
              variant="secondary" 
              className={`gap-1 ${typeColorClass} border-0`}
              data-testid={`badge-property-type-${property.id}`}
            >
              <Icon className="h-3 w-3" />
              {property.propertyType.replace("_", " ")}
            </Badge>
            {property.occupancyPurpose && (
              <Badge 
                variant="outline" 
                className="gap-1"
                data-testid={`badge-occupancy-${property.id}`}
              >
                {(() => {
                  const purpose = occupancyPurposeLabels[property.occupancyPurpose];
                  const PurposeIcon = purpose?.icon || Key;
                  return (
                    <>
                      <PurposeIcon className="h-3 w-3" />
                      {purpose?.label || property.occupancyPurpose}
                    </>
                  );
                })()}
              </Badge>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`button-property-menu-${property.id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!hideEdit && (
              <Link href={`/properties/${property.id}/edit`}>
                <DropdownMenuItem className="cursor-pointer" data-testid={`button-edit-property-${property.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </Link>
            )}
            {!hideDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                    data-testid={`button-delete-property-${property.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Property</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{property.name}"? This action cannot be undone.
                      {unitCount > 0 && ` This will also delete ${unitCount} unit(s) associated with this property.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete?.(property.id)}
                      className="bg-destructive text-destructive-foreground"
                      disabled={isDeleting}
                      data-testid={`button-confirm-delete-${property.id}`}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="line-clamp-2" data-testid={`text-property-address-${property.id}`}>{fullAddress}</span>
        </div>
        
        {unitCount > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-sm">
                <span className="font-medium">{unitCount}</span>
                <span className="text-muted-foreground ml-1">Units</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-green-600 dark:text-green-400">{occupiedCount}</span>
                <span className="text-muted-foreground ml-1">Occupied</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">{vacantCount}</span>
                <span className="text-muted-foreground ml-1">Vacant</span>
              </div>
            </div>
            {occupiedCount > 0 && (
              <div className="mt-2">
                <Badge 
                  variant="secondary" 
                  className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-0"
                  data-testid={`badge-leased-${property.id}`}
                >
                  <User className="h-3 w-3" />
                  {Math.round((occupiedCount / unitCount) * 100)}% Occupancy
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0">
        <Link href={`/properties/${property.id}`} className="w-full">
          <Button 
            variant="outline" 
            className="w-full"
            data-testid={`button-view-property-${property.id}`}
          >
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
