import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useActiveProperty } from "@/contexts/active-property-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, SprayCan, ClipboardList, CheckCircle2, Circle, Trash2, Loader2 } from "lucide-react";
import type { CleaningTemplate, CleaningTask } from "@shared/schema";

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  roomType: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  items: z.array(z.object({
    task: z.string(),
    order: z.number(),
    isRequired: z.boolean(),
  })).default([]),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function CleaningPage() {
  const { activeProperty } = useActiveProperty();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [taskItems, setTaskItems] = useState<{ task: string; order: number; isRequired: boolean }[]>([]);

  const { data: templates = [], isLoading } = useQuery<CleaningTemplate[]>({
    queryKey: ["/api/properties", activeProperty?.id, "cleaning-templates"],
    enabled: !!activeProperty?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return apiRequest("POST", `/api/properties/${activeProperty?.id}/cleaning-templates`, {
        ...data,
        items: taskItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "cleaning-templates"] });
      setIsCreateOpen(false);
      setTaskItems([]);
      form.reset();
      toast({ title: "Cleaning template created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/cleaning-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "cleaning-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      roomType: "",
      estimatedMinutes: undefined,
      items: [],
    },
  });

  const addTaskItem = () => {
    if (newTaskInput.trim()) {
      setTaskItems([...taskItems, { 
        task: newTaskInput.trim(), 
        order: taskItems.length, 
        isRequired: true 
      }]);
      setNewTaskInput("");
    }
  };

  const removeTaskItem = (index: number) => {
    setTaskItems(taskItems.filter((_, i) => i !== index));
  };

  const onSubmit = (data: TemplateFormValues) => {
    createMutation.mutate(data);
  };

  if (!activeProperty) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a property first</p>
      </div>
    );
  }

  if (activeProperty.usageType !== "SHORT_TERM_RENTAL") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cleaning checklists are only available for short-term rental properties</p>
      </div>
    );
  }

  const roomTypes = ["BEDROOM", "BATHROOM", "KITCHEN", "LIVING_AREA", "EXTERIOR", "COMMON"];

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Cleaning Checklists</h1>
          <p className="text-muted-foreground">Create and manage cleaning task templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setTaskItems([]);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Cleaning Template</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-template-name" placeholder="e.g., Standard Room Clean" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-room-type" placeholder="e.g., BEDROOM, BATHROOM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea data-testid="input-template-description" placeholder="Template description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Time (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          data-testid="input-estimated-time" 
                          placeholder="30"
                          {...field}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Checklist Items</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={newTaskInput}
                      onChange={e => setNewTaskInput(e.target.value)}
                      placeholder="Add a task..."
                      data-testid="input-new-task"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTaskItem();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTaskItem}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {taskItems.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {taskItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Circle className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <span className="flex-1 text-sm">{item.task}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeTaskItem(index)}
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-template">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Template
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-muted-foreground mb-4">No cleaning templates yet</p>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create templates with checklist items that can be applied to room turnovers
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              onDelete={() => deleteMutation.mutate(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, onDelete }: { template: CleaningTemplate; onDelete: () => void }) {
  const items = (template.items as { task: string; order: number; isRequired: boolean }[]) || [];
  
  return (
    <Card data-testid={`card-template-${template.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <SprayCan className="h-4 w-4" aria-hidden="true" />
              {template.name}
            </CardTitle>
            {template.description && (
              <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
            )}
          </div>
          {template.roomType && (
            <Badge variant="outline">{template.roomType}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.estimatedMinutes && (
          <p className="text-sm text-muted-foreground">
            Est. {template.estimatedMinutes} minutes
          </p>
        )}
        {items.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">{items.length} tasks:</p>
            <ul className="space-y-1">
              {items.slice(0, 4).map((item, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Circle className="h-2 w-2 flex-shrink-0" aria-hidden="true" />
                  <span className="line-clamp-1">{item.task}</span>
                </li>
              ))}
              {items.length > 4 && (
                <li className="text-sm text-muted-foreground">
                  +{items.length - 4} more tasks
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
            data-testid={`button-delete-template-${template.id}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
