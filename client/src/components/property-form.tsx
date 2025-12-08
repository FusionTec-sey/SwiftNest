import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building, Building2, Home, Landmark, Store, MapPin, Map, Warehouse, Factory, Layers, TreeDeciduous, HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertPropertySchema, type InsertProperty, type Property } from "@shared/schema";

interface PropertyFormProps {
  defaultValues?: Partial<Property>;
  onSubmit: (data: InsertProperty) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

const propertyTypes = [
  { value: "APARTMENT", label: "Apartment", icon: Building },
  { value: "VILLA", label: "Villa", icon: Home },
  { value: "HOUSE", label: "House", icon: HomeIcon },
  { value: "TOWNHOUSE", label: "Townhouse", icon: Layers },
  { value: "PLOT", label: "Plot", icon: Landmark },
  { value: "LAND", label: "Land", icon: TreeDeciduous },
  { value: "OFFICE", label: "Office", icon: Building2 },
  { value: "SHOP", label: "Shop", icon: Store },
  { value: "WAREHOUSE", label: "Warehouse", icon: Warehouse },
  { value: "INDUSTRIAL", label: "Industrial", icon: Factory },
  { value: "MIXED_USE", label: "Mixed Use", icon: Layers },
];

const occupancyPurposes = [
  { value: "OWNER_OCCUPIED", label: "Owner Occupied (Personal Use)" },
  { value: "RENTAL", label: "Rental Property" },
  { value: "INVESTMENT", label: "Investment Property" },
  { value: "VACANT_LAND", label: "Vacant Land" },
];

export function PropertyForm({ defaultValues, onSubmit, isSubmitting, onCancel }: PropertyFormProps) {
  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: defaultValues?.name || "",
      propertyType: (defaultValues?.propertyType as InsertProperty["propertyType"]) || "APARTMENT",
      occupancyPurpose: (defaultValues?.occupancyPurpose as InsertProperty["occupancyPurpose"]) || "RENTAL",
      addressLine1: defaultValues?.addressLine1 || "",
      addressLine2: defaultValues?.addressLine2 || "",
      city: defaultValues?.city || "",
      state: defaultValues?.state || "",
      country: defaultValues?.country || "",
      pincode: defaultValues?.pincode || "",
      latitude: defaultValues?.latitude || undefined,
      longitude: defaultValues?.longitude || undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Shree Residency" 
                        {...field} 
                        data-testid="input-property-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-property-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propertyTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem 
                              key={type.value} 
                              value={type.value}
                              data-testid={`option-${type.value.toLowerCase()}`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="occupancyPurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupancy Purpose</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "RENTAL"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-occupancy-purpose">
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {occupancyPurposes.map((purpose) => (
                        <SelectItem 
                          key={purpose.value} 
                          value={purpose.value}
                          data-testid={`option-${purpose.value.toLowerCase().replace("_", "-")}`}
                        >
                          {purpose.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Address Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Street address, building name" 
                      {...field} 
                      data-testid="input-address-line1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2 (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Apartment, suite, floor, etc." 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-address-line2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="City" 
                        {...field} 
                        data-testid="input-city"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="State" 
                        {...field} 
                        data-testid="input-state"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Country" 
                        {...field} 
                        data-testid="input-country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode / ZIP</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Pincode" 
                        {...field} 
                        data-testid="input-pincode"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Location Coordinates (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="e.g. 28.6139" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-latitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="e.g. 77.2090" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-longitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting}
            data-testid="button-save-property"
          >
            {isSubmitting ? "Saving..." : "Save Property"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
