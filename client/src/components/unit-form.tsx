import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { insertUnitSchema, type InsertUnit, type Unit } from "@shared/schema";

interface UnitFormProps {
  propertyId: number;
  defaultValues?: Partial<Unit>;
  onSubmit: (data: InsertUnit) => void;
  isSubmitting?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitForm({ propertyId, defaultValues, onSubmit, isSubmitting, open, onOpenChange }: UnitFormProps) {
  const form = useForm<InsertUnit>({
    resolver: zodResolver(insertUnitSchema),
    defaultValues: {
      propertyId: propertyId,
      unitName: defaultValues?.unitName || "",
      floor: defaultValues?.floor || "",
      areaSqFt: defaultValues?.areaSqFt || undefined,
      status: (defaultValues?.status as InsertUnit["status"]) || "VACANT",
    },
  });

  const handleSubmit = (data: InsertUnit) => {
    onSubmit({ ...data, propertyId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? "Edit Unit" : "Add New Unit"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unitName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Name/Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. A-101, Plot 23" 
                      {...field} 
                      data-testid="input-unit-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. 1, Ground" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-unit-floor"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="areaSqFt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (sq.ft)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="e.g. 1200" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-unit-area"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-unit-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="VACANT" data-testid="option-vacant">Vacant</SelectItem>
                      <SelectItem value="OCCUPIED" data-testid="option-occupied">Occupied</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-unit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="button-save-unit"
              >
                {isSubmitting ? "Saving..." : defaultValues?.id ? "Update Unit" : "Add Unit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
