import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  UserPlus,
  Shield,
  MoreHorizontal,
  Power,
  PowerOff,
  Plus,
  Trash2,
  Building2,
  Check,
} from "lucide-react";
import type { Property } from "@shared/schema";

interface Permission {
  id: number;
  key: string;
  description: string;
  module: string;
}

interface RoleWithPermissions {
  id: number;
  name: string;
  description: string | null;
  isSystem: number;
  permissions: Permission[];
}

interface RoleAssignment {
  id: number;
  userId: number;
  roleId: number;
  propertyId: number | null;
  isActive: number;
  role: {
    id: number;
    name: string;
    description: string | null;
  };
  property?: {
    id: number;
    name: string;
  } | null;
}

interface UserWithRoles {
  id: number;
  name: string;
  email: string;
  phone: string;
  isSuperAdmin: number;
  isActive: number;
  roles: RoleAssignment[];
}

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  accountType: z.enum(["INDIVIDUAL", "ORGANIZATION"]).default("INDIVIDUAL"),
  organizationName: z.string().optional(),
  organizationType: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const assignRoleSchema = z.object({
  roleId: z.number({ required_error: "Please select a role" }),
  propertyId: z.number().optional().nullable(),
});

type AssignRoleForm = z.infer<typeof assignRoleSchema>;

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithRoles[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.isSuperAdmin === 1,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleWithPermissions[]>({
    queryKey: ["/api/admin/roles"],
    enabled: user?.isSuperAdmin === 1,
  });

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ["/api/admin/permissions"],
    enabled: user?.isSuperAdmin === 1,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: user?.isSuperAdmin === 1,
  });

  const createUserForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      accountType: "INDIVIDUAL",
      organizationName: "",
      organizationType: "",
    },
  });

  const assignRoleForm = useForm<AssignRoleForm>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: {
      roleId: undefined,
      propertyId: null,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      return apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User created successfully" });
      setCreateDialogOpen(false);
      createUserForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: number }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User status updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, propertyId }: { userId: number; roleId: number; propertyId: number | null }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/roles`, { roleId, propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role assigned successfully" });
      setAssignRoleDialogOpen(false);
      assignRoleForm.reset();
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest("DELETE", `/api/admin/role-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role removed successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateUser = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const onAssignRole = (data: AssignRoleForm) => {
    if (!selectedUser) return;
    assignRoleMutation.mutate({
      userId: selectedUser.id,
      roleId: data.roleId,
      propertyId: data.propertyId || null,
    });
  };

  const openAssignRoleDialog = (u: UserWithRoles) => {
    setSelectedUser(u);
    setAssignRoleDialogOpen(true);
  };

  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (user?.isSuperAdmin !== 1) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You need super admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="admin-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-admin-title">User Management</h1>
          <p className="text-muted-foreground">Create and manage user accounts and role assignments</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. They can log in immediately.
              </DialogDescription>
            </DialogHeader>
            <Form {...createUserForm}>
              <form onSubmit={createUserForm.handleSubmit(onCreateUser)} className="space-y-4">
                <FormField
                  control={createUserForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          {...field}
                          data-testid="input-user-name" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="john@example.com" 
                          {...field}
                          data-testid="input-user-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+1234567890" 
                          {...field}
                          data-testid="input-user-phone" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Min 8 characters" 
                          {...field}
                          data-testid="input-user-password" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-account-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                          <SelectItem value="ORGANIZATION">Organization</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-create-user"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "user" : "users"} in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium" data-testid={`text-user-name-${u.id}`}>{u.name}</span>
                            <span className="text-sm text-muted-foreground">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {u.isSuperAdmin === 1 && (
                              <Badge variant="default" className="bg-amber-600" data-testid={`badge-superadmin-${u.id}`}>
                                Super Admin
                              </Badge>
                            )}
                            <Badge 
                              variant={u.isActive === 1 ? "default" : "secondary"}
                              data-testid={`badge-status-${u.id}`}
                            >
                              {u.isActive === 1 ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.filter(r => r.isActive === 1).map((r) => (
                              <Badge 
                                key={r.id} 
                                variant="outline" 
                                className="flex items-center gap-1"
                                data-testid={`badge-role-${r.id}`}
                              >
                                {r.role.name}
                                {r.property && (
                                  <span className="text-xs text-muted-foreground">
                                    ({r.property.name})
                                  </span>
                                )}
                                <button
                                  onClick={() => removeRoleMutation.mutate(r.id)}
                                  className="ml-1 opacity-60 hover:opacity-100"
                                  data-testid={`button-remove-role-${r.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            {u.roles.length === 0 && (
                              <span className="text-sm text-muted-foreground">No roles assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                data-testid={`button-user-actions-${u.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openAssignRoleDialog(u)}
                                data-testid={`menu-assign-role-${u.id}`}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Assign Role
                              </DropdownMenuItem>
                              {u.id !== user?.id && (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({
                                    userId: u.id,
                                    isActive: u.isActive === 1 ? 0 : 1,
                                  })}
                                  data-testid={`menu-toggle-status-${u.id}`}
                                >
                                  {u.isActive === 1 ? (
                                    <>
                                      <PowerOff className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Power className="mr-2 h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles & Permissions
            </CardTitle>
            <CardDescription>
              {roles.length} roles, {permissions.length} permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rolesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {roles.map((role) => (
                  <AccordionItem key={role.id} value={`role-${role.id}`}>
                    <AccordionTrigger 
                      className="text-sm"
                      data-testid={`accordion-role-${role.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {role.permissions.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {role.description}
                      </p>
                      <div className="space-y-2">
                        {Object.entries(permissionsByModule).map(([module, perms]) => {
                          const activePerms = perms.filter(p => 
                            role.permissions.some(rp => rp.id === p.id)
                          );
                          if (activePerms.length === 0) return null;
                          return (
                            <div key={module}>
                              <span className="text-xs font-medium uppercase text-muted-foreground">
                                {module}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {activePerms.map(p => (
                                  <Badge 
                                    key={p.id} 
                                    variant="outline" 
                                    className="text-xs flex items-center gap-1"
                                  >
                                    <Check className="h-3 w-3" />
                                    {p.key.split(".").pop()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Select a role and optionally scope it to a specific property.
            </DialogDescription>
          </DialogHeader>
          <Form {...assignRoleForm}>
            <form onSubmit={assignRoleForm.handleSubmit(onAssignRole)} className="space-y-4">
              <FormField
                control={assignRoleForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(parseInt(v))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem 
                            key={role.id} 
                            value={role.id.toString()}
                          >
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The role determines what permissions the user has.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignRoleForm.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Scope (Optional)</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === "global" ? null : parseInt(v))} 
                      value={field.value?.toString() || "global"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property-scope">
                          <SelectValue placeholder="Global (all properties)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="global">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Global (all properties)
                          </div>
                        </SelectItem>
                        {properties.map((prop) => (
                          <SelectItem 
                            key={prop.id} 
                            value={prop.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {prop.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave as Global to apply the role to all properties, or select a specific property.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={assignRoleMutation.isPending}
                data-testid="button-submit-assign-role"
              >
                {assignRoleMutation.isPending ? "Assigning..." : "Assign Role"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
