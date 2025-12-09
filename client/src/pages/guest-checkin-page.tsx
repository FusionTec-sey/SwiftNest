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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, LogIn, LogOut, User, Calendar, Phone, Mail, Check, X, Clock, Loader2 } from "lucide-react";
import type { GuestCheckinWithDetails } from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  EXPECTED: { label: "Expected", variant: "outline" },
  CHECKED_IN: { label: "Checked In", variant: "default" },
  CHECKED_OUT: { label: "Checked Out", variant: "secondary" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const checkinFormSchema = z.object({
  guestName: z.string().min(1, "Guest name is required"),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),
  numberOfGuests: z.number().min(1).default(1),
  expectedCheckinDate: z.string().min(1, "Check-in date is required"),
  expectedCheckoutDate: z.string().min(1, "Check-out date is required"),
  accessCode: z.string().optional(),
  specialRequests: z.string().optional(),
});

type CheckinFormValues = z.infer<typeof checkinFormSchema>;

export default function GuestCheckinPage() {
  const { activeProperty } = useActiveProperty();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: checkins = [], isLoading } = useQuery<GuestCheckinWithDetails[]>({
    queryKey: ["/api/properties", activeProperty?.id, "guest-checkins"],
    enabled: !!activeProperty?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CheckinFormValues) => {
      return apiRequest("POST", `/api/properties/${activeProperty?.id}/guest-checkins`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "guest-checkins"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Guest booking created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create booking", description: error.message, variant: "destructive" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/guest-checkins/${id}/checkin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "guest-checkins"] });
      toast({ title: "Guest checked in successfully" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/guest-checkins/${id}/checkout`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "guest-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", activeProperty?.id, "turnovers"] });
      toast({ title: "Guest checked out - turnover created" });
    },
  });

  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      numberOfGuests: 1,
      expectedCheckinDate: new Date().toISOString().split("T")[0],
      expectedCheckoutDate: "",
      accessCode: "",
      specialRequests: "",
    },
  });

  const onSubmit = (data: CheckinFormValues) => {
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
        <p className="text-muted-foreground">Guest check-in is only available for short-term rental properties</p>
      </div>
    );
  }

  const expectedGuests = checkins.filter(c => c.status === "EXPECTED");
  const currentGuests = checkins.filter(c => c.status === "CHECKED_IN");
  const pastGuests = checkins.filter(c => ["CHECKED_OUT", "NO_SHOW", "CANCELLED"].includes(c.status));

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Quick Check-in</h1>
          <p className="text-muted-foreground">Manage guest arrivals and departures</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-checkin">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Guest Booking</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-guest-name" placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guestEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" data-testid="input-guest-email" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guestPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input data-testid="input-guest-phone" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="numberOfGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Guests</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          data-testid="input-guest-count" 
                          value={field.value}
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expectedCheckinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-checkin-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedCheckoutDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-out Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-checkout-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="accessCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Code (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-access-code" placeholder="Door code, keybox code, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Textarea data-testid="input-special-requests" placeholder="Any special requirements..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-checkin">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Booking
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
      ) : checkins.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LogIn className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-muted-foreground mb-4">No guest bookings yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add First Guest
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {currentGuests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" aria-hidden="true" />
                Currently Staying ({currentGuests.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {currentGuests.map(checkin => (
                  <GuestCard 
                    key={checkin.id} 
                    checkin={checkin} 
                    onCheckin={checkinMutation.mutate}
                    onCheckout={checkoutMutation.mutate}
                  />
                ))}
              </div>
            </div>
          )}

          {expectedGuests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Expected Arrivals ({expectedGuests.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {expectedGuests.map(checkin => (
                  <GuestCard 
                    key={checkin.id} 
                    checkin={checkin} 
                    onCheckin={checkinMutation.mutate}
                    onCheckout={checkoutMutation.mutate}
                  />
                ))}
              </div>
            </div>
          )}

          {pastGuests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <LogOut className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Past Guests ({pastGuests.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {pastGuests.slice(0, 6).map(checkin => (
                  <GuestCard 
                    key={checkin.id} 
                    checkin={checkin} 
                    onCheckin={checkinMutation.mutate}
                    onCheckout={checkoutMutation.mutate}
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

function GuestCard({ checkin, onCheckin, onCheckout }: { 
  checkin: GuestCheckinWithDetails; 
  onCheckin: (id: number) => void;
  onCheckout: (id: number) => void;
}) {
  const config = STATUS_CONFIG[checkin.status] || STATUS_CONFIG.EXPECTED;

  return (
    <Card data-testid={`card-guest-${checkin.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              {checkin.guestName}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              {checkin.numberOfGuests} guest{checkin.numberOfGuests !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {format(new Date(checkin.expectedCheckinDate), "MMM d")} - {format(new Date(checkin.expectedCheckoutDate), "MMM d")}
        </div>
        {checkin.guestEmail && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" aria-hidden="true" />
            {checkin.guestEmail}
          </div>
        )}
        {checkin.guestPhone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" aria-hidden="true" />
            {checkin.guestPhone}
          </div>
        )}
        {checkin.specialRequests && (
          <p className="text-sm text-muted-foreground line-clamp-2">{checkin.specialRequests}</p>
        )}
        <div className="flex gap-2 pt-2">
          {checkin.status === "EXPECTED" && (
            <Button 
              size="sm" 
              onClick={() => onCheckin(checkin.id)}
              data-testid={`button-checkin-${checkin.id}`}
            >
              <LogIn className="h-4 w-4 mr-1" aria-hidden="true" />
              Check In
            </Button>
          )}
          {checkin.status === "CHECKED_IN" && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCheckout(checkin.id)}
              data-testid={`button-checkout-${checkin.id}`}
            >
              <LogOut className="h-4 w-4 mr-1" aria-hidden="true" />
              Check Out
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
