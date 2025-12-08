import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/header";
import { PropertyCard } from "@/components/property-card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Unit } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[] };
type SharedProperty = Property & { units: Unit[]; role: string };

const propertyTypes = [
  { value: "all", label: "All Types" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "HOUSE", label: "House" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "PLOT", label: "Plot" },
  { value: "LAND", label: "Land" },
  { value: "OFFICE", label: "Office" },
  { value: "SHOP", label: "Shop" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "MIXED_USE", label: "Mixed Use" },
];

export default function PropertiesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: properties, isLoading } = useQuery<PropertyWithUnits[]>({
    queryKey: ["/api/properties"],
  });

  const { data: sharedProperties, isLoading: isLoadingShared } = useQuery<SharedProperty[]>({
    queryKey: ["/api/shared-properties"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property deleted",
        description: "The property has been deleted successfully.",
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

  const filteredProperties = properties?.filter((property) => {
    const matchesSearch =
      property.name.toLowerCase().includes(search.toLowerCase()) ||
      property.city.toLowerCase().includes(search.toLowerCase()) ||
      property.addressLine1.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || property.propertyType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Properties</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your properties in one place
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/properties/deleted">
              <Button variant="outline" className="gap-2" data-testid="button-view-trash">
                <Trash2 className="h-4 w-4" />
                Trash
              </Button>
            </Link>
            <Link href="/properties/new">
              <Button className="gap-2" data-testid="button-add-property">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-type-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {propertyTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} data-testid={`filter-${type.value}`}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : filteredProperties && filteredProperties.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-results-count">
              Showing {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          </>
        ) : properties && properties.length > 0 ? (
          <EmptyState
            icon={Search}
            title="No properties found"
            description="Try adjusting your search or filter to find what you're looking for."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearch("");
              setTypeFilter("all");
            }}
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Get started by adding your first property. You can manage apartments, villas, plots, offices, and shops."
            actionLabel="Add Your First Property"
            actionHref="/properties/new"
          />
        )}

        {sharedProperties && sharedProperties.length > 0 && (
          <>
            <Separator className="my-8" />
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold" data-testid="text-shared-title">Shared with Me</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Properties that others have shared with you
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sharedProperties.map((property) => (
                <div key={property.id} className="relative">
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 right-3 z-10 text-xs"
                  >
                    {property.role === "EDITOR" ? "Editor" : "Viewer"}
                  </Badge>
                  <PropertyCard
                    property={property}
                    onDelete={() => {}}
                    isDeleting={false}
                    hideDelete={true}
                    hideEdit={property.role === "VIEWER"}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {isLoadingShared && (
          <div className="mt-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
