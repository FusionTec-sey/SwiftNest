import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Mail, UserPlus, Trash2, Shield, Clock, Check, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Owner, OwnerTeamMember, OwnerInvitation, User } from "@shared/schema";
import { format } from "date-fns";

interface TeamMemberWithUser extends OwnerTeamMember {
  user: User;
}

const inviteFormSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["ADMIN", "ACCOUNTANT", "MAINTENANCE_MANAGER", "MAINTENANCE_STAFF", "VIEWER"]),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  MAINTENANCE_MANAGER: "Maintenance Manager",
  MAINTENANCE_STAFF: "Maintenance Staff",
  VIEWER: "Viewer",
};

const roleDescriptions: Record<string, string> = {
  ADMIN: "Full access to all owner data",
  ACCOUNTANT: "Access to accounting, assets, loans, and payments",
  MAINTENANCE_MANAGER: "Manage maintenance issues, tasks, and schedules",
  MAINTENANCE_STAFF: "Create issues and update assigned tasks",
  VIEWER: "Read-only access to all data",
};

interface OwnerTeamManagerProps {
  owner: Owner;
  isOpen: boolean;
  onClose: () => void;
}

export function OwnerTeamManager({ owner, isOpen, onClose }: OwnerTeamManagerProps) {
  const { toast } = useToast();
  const [removingMember, setRemovingMember] = useState<TeamMemberWithUser | null>(null);
  const [deletingInvitation, setDeletingInvitation] = useState<OwnerInvitation | null>(null);

  const { data: teamMembers, isLoading: loadingMembers } = useQuery<TeamMemberWithUser[]>({
    queryKey: ["/api/owners", owner.id, "team"],
    queryFn: async () => {
      const res = await fetch(`/api/owners/${owner.id}/team`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load team members");
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: invitations, isLoading: loadingInvitations } = useQuery<OwnerInvitation[]>({
    queryKey: ["/api/owners", owner.id, "invitations"],
    queryFn: async () => {
      const res = await fetch(`/api/owners/${owner.id}/invitations`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load invitations");
      return res.json();
    },
    enabled: isOpen,
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "VIEWER",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return apiRequest("POST", `/api/owners/${owner.id}/invitations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners", owner.id, "invitations"] });
      inviteForm.reset();
      toast({
        title: "Invitation sent",
        description: "An invitation has been created. Share the link with the team member.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/owner-team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners", owner.id, "team"] });
      setRemovingMember(null);
      toast({
        title: "Team member removed",
        description: "The team member has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners", owner.id, "invitations"] });
      setDeletingInvitation(null);
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "The invite link has been copied to your clipboard.",
    });
  };

  const pendingInvitations = invitations?.filter(inv => inv.status === "PENDING") || [];
  const pastInvitations = invitations?.filter(inv => inv.status !== "PENDING") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Accepted</Badge>;
      case "DECLINED":
        return <Badge variant="secondary" className="gap-1"><X className="h-3 w-3" />Declined</Badge>;
      case "EXPIRED":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management - {owner.legalName}
            </DialogTitle>
            <DialogDescription>
              Invite team members to help manage this owner's properties and finances.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="members" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members" data-testid="tab-team-members">
                Team Members {teamMembers && teamMembers.length > 0 && `(${teamMembers.length})`}
              </TabsTrigger>
              <TabsTrigger value="invitations" data-testid="tab-invitations">
                Invitations {pendingInvitations.length > 0 && `(${pendingInvitations.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4 space-y-4">
              {loadingMembers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : teamMembers && teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <Card key={member.id} data-testid={`card-team-member-${member.id}`}>
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{member.user.name}</span>
                            <Badge variant="secondary" className="shrink-0">
                              {roleLabels[member.role]}
                            </Badge>
                            {member.isActive === 0 && (
                              <Badge variant="outline" className="shrink-0">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{member.user.email}</span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setRemovingMember(member)}
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No team members yet</p>
                  <p className="text-sm">Invite team members to help manage this business.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="invitations" className="mt-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite New Team Member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={inviteForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="team@example.com" data-testid="input-invite-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={inviteForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-invite-role">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                                  <SelectItem value="MAINTENANCE_MANAGER">Maintenance Manager</SelectItem>
                                  <SelectItem value="MAINTENANCE_STAFF">Maintenance Staff</SelectItem>
                                  <SelectItem value="VIEWER">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                {roleDescriptions[field.value]}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" disabled={inviteMutation.isPending} data-testid="button-send-invite">
                        {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {loadingInvitations ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <>
                  {pendingInvitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Pending Invitations</h4>
                      <div className="space-y-3">
                        {pendingInvitations.map((invitation) => (
                          <Card key={invitation.id} data-testid={`card-invitation-${invitation.id}`}>
                            <CardContent className="flex items-center justify-between gap-4 p-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{invitation.email}</span>
                                  <Badge variant="secondary" className="shrink-0">
                                    {roleLabels[invitation.role]}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Expires {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => copyInviteLink(invitation.inviteToken)}
                                  data-testid={`button-copy-invite-${invitation.id}`}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeletingInvitation(invitation)}
                                  data-testid={`button-cancel-invite-${invitation.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastInvitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3 text-muted-foreground">Past Invitations</h4>
                      <div className="space-y-2">
                        {pastInvitations.slice(0, 5).map((invitation) => (
                          <div key={invitation.id} className="flex items-center justify-between gap-4 text-sm p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{invitation.email}</span>
                              <span className="text-muted-foreground shrink-0">as {roleLabels[invitation.role]}</span>
                            </div>
                            {getStatusBadge(invitation.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingInvitations.length === 0 && pastInvitations.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No invitations sent yet</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.user.name} from the team? They will lose access to all data for {owner.legalName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingMember && removeMemberMutation.mutate(removingMember.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-remove-member"
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingInvitation} onOpenChange={() => setDeletingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to {deletingInvitation?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInvitation && deleteInvitationMutation.mutate(deletingInvitation.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-cancel-invite"
            >
              {deleteInvitationMutation.isPending ? "Cancelling..." : "Cancel Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
