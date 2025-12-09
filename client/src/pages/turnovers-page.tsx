import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useActiveProperty } from "@/contexts/active-property-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, RefreshCw, Calendar, User, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import type { TurnoverWithDetails } from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  CLEANING: { label: "Cleaning", variant: "default", icon: RefreshCw },
  INSPECTION: { label: "Inspection", variant: "outline", icon: AlertCircle },
  READY: { label: "Ready", variant: "default", icon: CheckCircle2 },
  BLOCKED: { label: "Blocked", variant: "destructive", icon: AlertCircle },
};

const turnoverFormSchema = z.object({
  checkoutDate: z.string().min(1, "Checkout date is required"),
  nextCheckinDate: z.string().optional(),
  guestName: z.string().optional(),
  guestNotes: z.string().optional(),
  unitId: z.number().optional().nullable(),
});

type TurnoverFormValues = z.infer<typeof turnoverFormSchema>;

export default function TurnoversPage() {
  const { activeProperty } = useActiveProperty();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: turnovers = [], isLoading } = useQuery<TurnoverWithDetails[]>({
    queryKey: ["/api/properties", activeProperty?.id, "turnovers"],
    enabled: !!activeProperty?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TurnoverFormValues) => {
      return apiRequest("POST", `/api/properties/${activeProperty?.id}/turnovers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "turnovers"] });
      setIsCreateOpen(false);
      toast({ title: "Turnover created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create turnover", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/turnovers/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "turnovers"] });
      toast({ title: "Status updated" });
    },
  });

  const form = useForm<TurnoverFormValues>({
    resolver: zodResolver(turnoverFormSchema),
    defaultValues: {
      checkoutDate: new Date().toISOString().split("T")[0],
      nextCheckinDate: "",
      guestName: "",
      guestNotes: "",
    },
  });

  const onSubmit = (data: TurnoverFormValues) => {
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
        <p className="text-muted-foreground">Turnovers are only available for short-term rental properties</p>
      </div>
    );
  }

  const pendingTurnovers = turnovers.filter(t => t.status === "PENDING");
  const activeTurnovers = turnovers.filter(t => ["CLEANING", "INSPECTION"].includes(t.status));
  const completedTurnovers = turnovers.filter(t => t.status === "READY");

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Room Turnovers</h1>
          <p className="text-muted-foreground">Manage checkout cleaning and preparation for next guests</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-turnover">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Turnover
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Room Turnover</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="checkoutDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checkout Date</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-checkout-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextCheckinDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Check-in Date (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-next-checkin-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departing Guest Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-guest-name" placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea data-testid="input-guest-notes" placeholder="Special cleaning instructions..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-turnover">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Turnover
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
      ) : turnovers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-muted-foreground mb-4">No turnovers scheduled</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add First Turnover
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingTurnovers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Pending ({pendingTurnovers.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {pendingTurnovers.map(turnover => (
                  <TurnoverCard key={turnover.id} turnover={turnover} onStatusChange={updateStatusMutation.mutate} />
                ))}
              </div>
            </div>
          )}

          {activeTurnovers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                In Progress ({activeTurnovers.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activeTurnovers.map(turnover => (
                  <TurnoverCard key={turnover.id} turnover={turnover} onStatusChange={updateStatusMutation.mutate} />
                ))}
              </div>
            </div>
          )}

          {completedTurnovers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Ready ({completedTurnovers.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {completedTurnovers.map(turnover => (
                  <TurnoverCard key={turnover.id} turnover={turnover} onStatusChange={updateStatusMutation.mutate} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TurnoverCard({ turnover, onStatusChange }: { 
  turnover: TurnoverWithDetails; 
  onStatusChange: (params: { id: number; status: string }) => void;
}) {
  const config = STATUS_CONFIG[turnover.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  
  const nextStatuses: Record<string, string[]> = {
    PENDING: ["CLEANING"],
    CLEANING: ["INSPECTION", "READY"],
    INSPECTION: ["READY", "CLEANING"],
    READY: [],
    BLOCKED: ["PENDING"],
  };

  return (
    <Card data-testid={`card-turnover-${turnover.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              {format(new Date(turnover.checkoutDate), "MMM d, yyyy")}
            </CardTitle>
            {turnover.guestName && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <User className="h-3 w-3" aria-hidden="true" />
                {turnover.guestName}
              </CardDescription>
            )}
          </div>
          <Badge variant={config.variant}>
            <StatusIcon className="h-3 w-3 mr-1" aria-hidden="true" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {turnover.unit && (
          <p className="text-sm text-muted-foreground">Unit: {turnover.unit.unitName}</p>
        )}
        {turnover.nextCheckinDate && (
          <p className="text-sm text-muted-foreground">
            Next guest: {format(new Date(turnover.nextCheckinDate), "MMM d")}
          </p>
        )}
        {turnover.guestNotes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{turnover.guestNotes}</p>
        )}
        {nextStatuses[turnover.status]?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {nextStatuses[turnover.status].map(status => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                onClick={() => onStatusChange({ id: turnover.id, status })}
                data-testid={`button-status-${status.toLowerCase()}-${turnover.id}`}
              >
                {status === "CLEANING" && "Start Cleaning"}
                {status === "INSPECTION" && "Ready for Inspection"}
                {status === "READY" && "Mark Ready"}
                {status === "PENDING" && "Unblock"}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
