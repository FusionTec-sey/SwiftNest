import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, CheckCircle, Clock, Wrench, Trash2 } from "lucide-react";
import type { HomeMaintenanceSchedule, Property } from "@shared/schema";

const CATEGORIES = [
  "HVAC", "Plumbing", "Electrical", "Roofing", "Exterior", "Interior",
  "Lawn & Garden", "Pool & Spa", "Pest Control", "Appliances", "Safety", "Other"
];

const FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "BIANNUALLY", label: "Every 6 months" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "AS_NEEDED", label: "As Needed" },
];

const SEASONS = [
  { value: "ALL_YEAR", label: "Any time" },
  { value: "SPRING", label: "Spring" },
  { value: "SUMMER", label: "Summer" },
  { value: "FALL", label: "Fall" },
  { value: "WINTER", label: "Winter" },
];

const scheduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  frequency: z.string().default("ANNUALLY"),
  preferredSeason: z.string().default("ALL_YEAR"),
  estimatedCost: z.string().optional(),
  nextDueDate: z.string().optional(),
  reminderDaysBefore: z.coerce.number().default(14),
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export default function MaintenanceSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id || "0");
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: property } = useQuery<Property>({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });

  const { data: schedules = [], isLoading } = useQuery<HomeMaintenanceSchedule[]>({
    queryKey: ['/api/properties', propertyId, 'maintenance-schedules'],
    enabled: !!propertyId,
  });

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      frequency: "ANNUALLY",
      preferredSeason: "ALL_YEAR",
      estimatedCost: "",
      nextDueDate: "",
      reminderDaysBefore: 14,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      return apiRequest("POST", `/api/properties/${propertyId}/maintenance-schedules`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'maintenance-schedules'] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Maintenance schedule created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/maintenance-schedules/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'maintenance-schedules'] });
      toast({ title: "Marked as complete" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/maintenance-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'maintenance-schedules'] });
      toast({ title: "Schedule deleted" });
    },
  });

  const onSubmit = (data: ScheduleFormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (schedule: HomeMaintenanceSchedule) => {
    if (!schedule.nextDueDate) {
      return <Badge variant="secondary">No due date</Badge>;
    }
    const dueDate = new Date(schedule.nextDueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge variant="default">Due soon</Badge>;
    } else if (daysUntilDue <= 30) {
      return <Badge variant="secondary">Upcoming</Badge>;
    }
    return <Badge variant="outline">Scheduled</Badge>;
  };

  if (property?.usageType !== "OWNER_OCCUPIED") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Home maintenance scheduling is for owner-occupied properties</p>
      </div>
    );
  }

  const overdueSchedules = schedules.filter(s => {
    if (!s.nextDueDate) return false;
    return new Date(s.nextDueDate) < new Date();
  });

  const upcomingSchedules = schedules.filter(s => {
    if (!s.nextDueDate) return false;
    const dueDate = new Date(s.nextDueDate);
    const today = new Date();
    return dueDate >= today;
  });

  const noDateSchedules = schedules.filter(s => !s.nextDueDate);

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Home Maintenance</h1>
          <p className="text-muted-foreground">Schedule recurring maintenance tasks for your home</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-schedule">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Maintenance Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input data-testid="input-schedule-title" placeholder="e.g., HVAC Filter Replacement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-schedule-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-schedule-frequency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FREQUENCIES.map(f => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preferredSeason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Best Season</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-schedule-season">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEASONS.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nextDueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-schedule-due" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Cost</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" data-testid="input-schedule-cost" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea data-testid="input-schedule-description" placeholder="Optional details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-schedule">
                    {createMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">No maintenance tasks scheduled yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add regular maintenance tasks to keep your home in great condition</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {overdueSchedules.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3 text-destructive flex items-center gap-2">
                <Clock className="h-5 w-5" aria-hidden="true" />
                Overdue ({overdueSchedules.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {overdueSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onComplete={() => completeMutation.mutate(schedule.id)}
                    onDelete={() => deleteMutation.mutate(schedule.id)}
                    statusBadge={getStatusBadge(schedule)}
                  />
                ))}
              </div>
            </div>
          )}

          {upcomingSchedules.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" aria-hidden="true" />
                Upcoming ({upcomingSchedules.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onComplete={() => completeMutation.mutate(schedule.id)}
                    onDelete={() => deleteMutation.mutate(schedule.id)}
                    statusBadge={getStatusBadge(schedule)}
                  />
                ))}
              </div>
            </div>
          )}

          {noDateSchedules.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3 text-muted-foreground">As Needed ({noDateSchedules.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {noDateSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onComplete={() => completeMutation.mutate(schedule.id)}
                    onDelete={() => deleteMutation.mutate(schedule.id)}
                    statusBadge={getStatusBadge(schedule)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule,
  onComplete,
  onDelete,
  statusBadge,
}: {
  schedule: HomeMaintenanceSchedule;
  onComplete: () => void;
  onDelete: () => void;
  statusBadge: React.ReactNode;
}) {
  const frequencyLabel = FREQUENCIES.find(f => f.value === schedule.frequency)?.label || schedule.frequency;

  return (
    <Card data-testid={`card-schedule-${schedule.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{schedule.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{schedule.category}</Badge>
              <span className="text-xs text-muted-foreground">{frequencyLabel}</span>
            </div>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {schedule.description && (
          <p className="text-sm text-muted-foreground">{schedule.description}</p>
        )}
        <div className="flex items-center justify-between text-sm">
          <div>
            {schedule.nextDueDate && (
              <span className="text-muted-foreground">
                Due: {new Date(schedule.nextDueDate).toLocaleDateString()}
              </span>
            )}
            {schedule.estimatedCost && (
              <span className="text-muted-foreground ml-3">
                Est: ${parseFloat(schedule.estimatedCost).toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onComplete}
              title="Mark complete"
              data-testid={`button-complete-${schedule.id}`}
            >
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              title="Delete"
              data-testid={`button-delete-${schedule.id}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        {schedule.lastCompletedDate && (
          <p className="text-xs text-muted-foreground">
            Last completed: {new Date(schedule.lastCompletedDate).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
