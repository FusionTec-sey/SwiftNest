import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyForm } from "@/components/property-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InsertProperty, Property, Unit } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[] };

export default function PropertyEditPage() {
  const params = useParams<{ id: string }>();
  const propertyId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: property, isLoading, error } = useQuery<PropertyWithUnits>({
    queryKey: ["/api/properties", propertyId],
    enabled: !isNaN(propertyId),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const res = await apiRequest("PUT", `/api/properties/${propertyId}`, data);
      return await res.json() as Property;
    },
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
      toast({
        title: "Property updated",
        description: `${property.name} has been updated successfully.`,
      });
      setLocation(`/properties/${propertyId}`);
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
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
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

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href={`/properties/${propertyId}`}>
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-4" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Property
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Edit Property</h1>
          <p className="text-muted-foreground mt-1">
            Update the details of {property.name}
          </p>
        </div>

        <PropertyForm
          defaultValues={property}
          onSubmit={(data) => updateMutation.mutate(data)}
          isSubmitting={updateMutation.isPending}
          onCancel={() => setLocation(`/properties/${propertyId}`)}
        />
      </div>
    </div>
  );
}
