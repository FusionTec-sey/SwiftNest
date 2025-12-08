import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Home, Plus, Users, TrendingUp, Store, MapPin, Building } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/header";
import { PropertyCard } from "@/components/property-card";
import { StatsCard } from "@/components/stats-card";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Unit } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[] };

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: properties, isLoading } = useQuery<PropertyWithUnits[]>({
    queryKey: ["/api/properties"],
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

  const totalProperties = properties?.length || 0;
  const totalUnits = properties?.reduce((acc, p) => acc + (p.units?.length || 0), 0) || 0;
  const vacantUnits = properties?.reduce(
    (acc, p) => acc + (p.units?.filter((u) => u.status === "VACANT").length || 0),
    0
  ) || 0;
  const occupiedUnits = totalUnits - vacantUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const propertyTypeBreakdown = properties?.reduce((acc, p) => {
    acc[p.propertyType] = (acc[p.propertyType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const propertyTypeLabels: Record<string, { label: string; icon: typeof Building2 }> = {
    APARTMENT: { label: "Apartments", icon: Building },
    VILLA: { label: "Villas", icon: Home },
    PLOT: { label: "Plots", icon: MapPin },
    OFFICE: { label: "Offices", icon: Building2 },
    SHOP: { label: "Shops", icon: Store },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-welcome">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your property portfolio
            </p>
          </div>
          <Link href="/properties/new">
            <Button className="gap-2" data-testid="button-add-property">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard
                title="Total Properties"
                value={totalProperties}
                icon={Building2}
              />
              <StatsCard
                title="Total Units"
                value={totalUnits}
                icon={Home}
              />
              <StatsCard
                title="Vacant Units"
                value={vacantUnits}
                icon={Users}
                className="bg-amber-50 dark:bg-amber-950/20"
              />
              <StatsCard
                title="Occupied Units"
                value={occupiedUnits}
                icon={Users}
                className="bg-green-50 dark:bg-green-950/20"
              />
            </div>

            {totalUnits > 0 && (
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Occupancy Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-end justify-between">
                        <span className="text-4xl font-bold" data-testid="stat-occupancy-rate">{occupancyRate}%</span>
                        <span className="text-sm text-muted-foreground">
                          {occupiedUnits} of {totalUnits} units occupied
                        </span>
                      </div>
                      <Progress value={occupancyRate} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {vacantUnits} Vacant
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {occupiedUnits} Occupied
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Properties by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(propertyTypeBreakdown).length > 0 ? (
                        Object.entries(propertyTypeBreakdown).map(([type, count]) => {
                          const typeInfo = propertyTypeLabels[type];
                          const TypeIcon = typeInfo?.icon || Building2;
                          const percentage = Math.round((count / totalProperties) * 100);
                          return (
                            <div key={type} className="flex items-center gap-3" data-testid={`breakdown-${type.toLowerCase()}`}>
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium truncate">{typeInfo?.label || type}</span>
                                  <span className="text-sm text-muted-foreground shrink-0">{count}</span>
                                </div>
                                <Progress value={percentage} className="h-1.5 mt-1" />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">No properties to display</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {properties && properties.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Your Properties</h2>
                  <Link href="/properties">
                    <Button variant="ghost" size="sm" data-testid="link-view-all">
                      View All
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {properties.slice(0, 6).map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
                {properties.length > 6 && (
                  <div className="text-center mt-8">
                    <Link href="/properties">
                      <Button variant="outline" data-testid="button-view-more">
                        View All {properties.length} Properties
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No properties yet"
                description="Get started by adding your first property. You can manage apartments, villas, plots, offices, and shops."
                actionLabel="Add Your First Property"
                actionHref="/properties/new"
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
