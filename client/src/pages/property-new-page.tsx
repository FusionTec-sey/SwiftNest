import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { PropertyForm } from "@/components/property-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InsertProperty, Property } from "@shared/schema";

export default function PropertyNewPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const res = await apiRequest("POST", "/api/properties", data);
      return await res.json() as Property;
    },
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property created",
        description: `${property.name} has been added successfully.`,
      });
      setLocation(`/properties/${property.id}`);
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
      
      <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <Link href="/properties">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-4" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Properties
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Add New Property</h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details below to add a new property to your portfolio
          </p>
        </div>

        <PropertyForm
          onSubmit={(data) => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
          onCancel={() => setLocation("/properties")}
        />
      </main>
    </div>
  );
}
