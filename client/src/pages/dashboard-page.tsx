import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Home, Plus, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
