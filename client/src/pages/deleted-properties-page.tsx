import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Unit } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[] };

const propertyTypeLabels: Record<string, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  PLOT: "Plot",
  OFFICE: "Office",
  SHOP: "Shop",
};

export default function DeletedPropertiesPage() {
  const { toast } = useToast();

  const { data: deletedProperties, isLoading } = useQuery<PropertyWithUnits[]>({
    queryKey: ["/api/properties/deleted"],
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/properties/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/deleted"] });
      toast({
        title: "Property restored",
        description: "The property has been restored successfully.",
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

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties/deleted"] });
      toast({
        title: "Property permanently deleted",
        description: "The property and all its units have been permanently removed.",
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Deleted Properties</h1>
            <p className="text-muted-foreground mt-1">
              Restore or permanently delete your removed properties
            </p>
          </div>
          <Link href="/properties">
            <Button variant="outline" data-testid="button-back-to-properties">
              Back to Properties
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : deletedProperties && deletedProperties.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-deleted-count">
              {deletedProperties.length} deleted {deletedProperties.length === 1 ? "property" : "properties"}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {deletedProperties.map((property) => (
                <Card key={property.id} className="opacity-75" data-testid={`card-deleted-property-${property.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-1">{property.name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        {propertyTypeLabels[property.propertyType] || property.propertyType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {property.addressLine1}, {property.city}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {property.units.length} {property.units.length === 1 ? "unit" : "units"}
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => restoreMutation.mutate(property.id)}
                      disabled={restoreMutation.isPending}
                      data-testid={`button-restore-${property.id}`}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 gap-1"
                          disabled={permanentDeleteMutation.isPending}
                          data-testid={`button-permanent-delete-${property.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Forever
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Permanently Delete Property?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{property.name}" and all {property.units.length} associated units. 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => permanentDeleteMutation.mutate(property.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={Trash2}
            title="No deleted properties"
            description="Properties you delete will appear here. You can restore them or permanently delete them."
            actionLabel="View Properties"
            actionHref="/properties"
          />
        )}
      </main>
    </div>
  );
}
