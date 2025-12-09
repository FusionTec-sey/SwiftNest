import { ChevronsUpDown, Building2, Home, Store, CheckIcon } from "lucide-react";
import { useActiveProperty } from "@/contexts/active-property-context";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

const usageTypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  LONG_TERM_RENTAL: { label: "Long-term", variant: "default" },
  SHORT_TERM_RENTAL: { label: "Short-term", variant: "secondary" },
  OWNER_OCCUPIED: { label: "Personal", variant: "outline" },
};

const propertyTypeIcons: Record<string, typeof Building2> = {
  APARTMENT: Building2,
  VILLA: Home,
  HOUSE: Home,
  OFFICE: Building2,
  SHOP: Store,
  DEFAULT: Building2,
};

export function PropertySelector() {
  const { activeProperty, properties, isLoading, setActivePropertyId } = useActiveProperty();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        <span className="text-muted-foreground">Loading properties...</span>
      </Button>
    );
  }

  if (properties.length === 0) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        <span className="text-muted-foreground">No properties available</span>
      </Button>
    );
  }

  const getIcon = (propertyType: string | null | undefined) => {
    return propertyTypeIcons[propertyType || "DEFAULT"] || propertyTypeIcons.DEFAULT;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid="button-property-selector"
        >
          {activeProperty ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {(() => {
                const Icon = getIcon(activeProperty.propertyType);
                return <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />;
              })()}
              <span className="truncate">{activeProperty.name}</span>
              {activeProperty.usageType && (
                <Badge
                  variant={usageTypeLabels[activeProperty.usageType]?.variant || "default"}
                  className="ml-auto shrink-0"
                >
                  {usageTypeLabels[activeProperty.usageType]?.label || activeProperty.usageType}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select a property</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search properties..." data-testid="input-property-search" />
          <CommandList>
            <CommandEmpty>No properties found.</CommandEmpty>
            <CommandGroup>
              {properties.map((property) => {
                const Icon = getIcon(property.propertyType);
                return (
                  <CommandItem
                    key={property.id}
                    value={property.name}
                    onSelect={() => {
                      setActivePropertyId(property.id);
                      setOpen(false);
                    }}
                    data-testid={`option-property-${property.id}`}
                  >
                    <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{property.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {property.city}{property.state ? `, ${property.state}` : ""}
                      </span>
                    </div>
                    {property.usageType && (
                      <Badge
                        variant={usageTypeLabels[property.usageType]?.variant || "default"}
                        className="ml-2 shrink-0"
                      >
                        {usageTypeLabels[property.usageType]?.label || property.usageType}
                      </Badge>
                    )}
                    <CheckIcon
                      className={cn(
                        "ml-2 h-4 w-4 shrink-0",
                        activeProperty?.id === property.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
