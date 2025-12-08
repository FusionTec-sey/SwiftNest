import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { CheckCircle, XCircle, Clock, Building2, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface InvitationInfo {
  id: number;
  email: string;
  role: string;
  ownerName: string;
  ownerTradingName?: string;
  expiresAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  MAINTENANCE_MANAGER: "Maintenance Manager",
  MAINTENANCE_STAFF: "Maintenance Staff",
  VIEWER: "Viewer",
};

const roleDescriptions: Record<string, string> = {
  ADMIN: "Full access to all owner data including properties, financials, and team management",
  ACCOUNTANT: "Access to accounting, assets, loans, and payment management",
  MAINTENANCE_MANAGER: "Manage maintenance issues, tasks, team members, and schedules",
  MAINTENANCE_STAFF: "Create and view issues, update assigned maintenance tasks",
  VIEWER: "Read-only access to view all data without editing privileges",
};

export default function InvitePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/invite/:token");
  const token = params?.token;
  const { user } = useAuth();

  const { data: invitation, isLoading, error, isError } = useQuery<InvitationInfo>({
    queryKey: ["/api/invitations", token],
    queryFn: async () => {
      const res = await fetch(`/api/invitations/${token}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load invitation");
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/invitations/${token}/accept`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted",
        description: `You now have ${roleLabels[invitation?.role || "VIEWER"]} access to ${invitation?.ownerName}.`,
      });
      setLocation("/owners");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/invitations/${token}/decline`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "The invitation has been declined.",
      });
      setLocation("/");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (isError || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {(error as Error)?.message || "This invitation link is no longer valid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in or create an account to accept this invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="font-medium">{invitation.ownerName}</p>
              {invitation.ownerTradingName && (
                <p className="text-sm text-muted-foreground">t/a {invitation.ownerTradingName}</p>
              )}
              <Badge variant="secondary">{roleLabels[invitation.role]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Sign in with <span className="font-medium">{invitation.email}</span> to accept this invitation.
            </p>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full" onClick={() => setLocation(`/auth?redirect=/invite/${token}`)} data-testid="button-sign-in">
              Sign In
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/")} data-testid="button-cancel">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const emailMatch = user.email.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-3 text-center">
            <div>
              <p className="font-medium text-lg">{invitation.ownerName}</p>
              {invitation.ownerTradingName && (
                <p className="text-sm text-muted-foreground">t/a {invitation.ownerTradingName}</p>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-sm">{roleLabels[invitation.role]}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">What you'll be able to do:</h4>
            <p className="text-sm text-muted-foreground">{roleDescriptions[invitation.role]}</p>
          </div>

          {!emailMatch && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
              <p className="text-amber-800 dark:text-amber-200">
                This invitation was sent to <span className="font-medium">{invitation.email}</span>, 
                but you're signed in as <span className="font-medium">{user.email}</span>.
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Please sign in with the correct email to accept this invitation.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          {emailMatch ? (
            <>
              <Button 
                className="w-full gap-2" 
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                data-testid="button-accept-invite"
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Accept Invitation
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => declineMutation.mutate()}
                disabled={declineMutation.isPending}
                data-testid="button-decline-invite"
              >
                Decline
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={() => setLocation("/auth")} data-testid="button-switch-account">
                Sign In with Different Account
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")} data-testid="button-cancel">
                Cancel
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
