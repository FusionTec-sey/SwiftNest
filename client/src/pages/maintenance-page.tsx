import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertCircle, CheckCircle, Clock, Package, Users, Wrench, Calendar, Plus, AlertTriangle, Loader2, Wallet } from "lucide-react";
import type { Property, IssueWithDetails, TaskWithDetails, MaintenanceSchedule, MaintenanceMaterial, TeamMemberWithSkills, Owner } from "@shared/schema";

export default function MaintenancePage() {
  const params = useParams<{ id: string }>();
  const propertyId = parseInt(params.id || "0");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<TaskWithDetails | null>(null);
  const [issueExpenseDialogOpen, setIssueExpenseDialogOpen] = useState(false);
  const [issueForExpense, setIssueForExpense] = useState<IssueWithDetails | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseVendor, setExpenseVendor] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  const { data: property, isLoading: propertyLoading } = useQuery<Property & { units: any[]; userRole: string; isOwner: boolean }>({
    queryKey: ["/api/properties", propertyId],
    enabled: propertyId > 0,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    openIssues: number;
    inProgressTasks: number;
    overdueTasks: number;
    completedThisMonth: number;
    lowStockMaterials: number;
  }>({
    queryKey: [`/api/properties/${propertyId}/maintenance/stats`],
    enabled: propertyId > 0,
  });

  const { data: issues = [] } = useQuery<IssueWithDetails[]>({
    queryKey: [`/api/properties/${propertyId}/maintenance/issues`],
    enabled: propertyId > 0,
  });

  const { data: tasks = [] } = useQuery<TaskWithDetails[]>({
    queryKey: [`/api/properties/${propertyId}/maintenance/tasks`],
    enabled: propertyId > 0,
  });

  const { data: schedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: [`/api/properties/${propertyId}/maintenance/schedules`],
    enabled: propertyId > 0,
  });

  const { data: materials = [] } = useQuery<MaintenanceMaterial[]>({
    queryKey: [`/api/properties/${propertyId}/maintenance/materials`],
    enabled: propertyId > 0,
  });

  const { data: team = [] } = useQuery<TeamMemberWithSkills[]>({
    queryKey: [`/api/properties/${propertyId}/maintenance/team`],
    enabled: propertyId > 0,
  });

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      if (propertyId && !isNaN(propertyId) && propertyId > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/expenses/property", propertyId] });
      }
      if (variables.ownerId && typeof variables.ownerId === 'number' && variables.ownerId > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/expenses/owner", variables.ownerId] });
      }
      toast({ title: "Expense recorded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to record expense", variant: "destructive" });
    },
  });

  const handleTaskStatusChange = (task: TaskWithDetails, status: string) => {
    if (status === "COMPLETED") {
      setTaskToComplete(task);
      setExpenseDescription(`Maintenance: ${task.title}`);
      setExpenseAmount(task.totalCost ? String(parseFloat(task.totalCost)) : "");
      setExpenseVendor("");
      setSelectedOwnerId("");
      setCompletionDialogOpen(true);
    } else {
      updateTaskStatusMutation.mutate({ taskId: task.id, status });
    }
  };

  const completeTaskWithExpense = async () => {
    if (!taskToComplete) return;

    if (expenseAmount && parseFloat(expenseAmount) > 0 && selectedOwnerId) {
      await createExpenseMutation.mutateAsync({
        ownerId: parseInt(selectedOwnerId),
        propertyId: propertyId,
        maintenanceTaskId: taskToComplete.id,
        category: "MAINTENANCE",
        expenseDate: new Date().toISOString().split("T")[0],
        description: expenseDescription || `Maintenance: ${taskToComplete.title}`,
        amount: expenseAmount,
        taxAmount: "0",
        vendorName: expenseVendor || undefined,
        paymentStatus: "UNPAID",
      });
    }

    await updateTaskStatusMutation.mutateAsync({ taskId: taskToComplete.id, status: "COMPLETED" });
    
    setCompletionDialogOpen(false);
    setTaskToComplete(null);
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseVendor("");
    setSelectedOwnerId("");
  };

  const skipExpenseAndComplete = async () => {
    if (!taskToComplete) return;
    await updateTaskStatusMutation.mutateAsync({ taskId: taskToComplete.id, status: "COMPLETED" });
    setCompletionDialogOpen(false);
    setTaskToComplete(null);
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseVendor("");
    setSelectedOwnerId("");
  };

  const createIssueMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/properties/${propertyId}/maintenance/issues`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/issues`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/stats`] });
      setIssueDialogOpen(false);
      toast({ title: "Issue reported successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create issue", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/properties/${propertyId}/maintenance/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/stats`] });
      setTaskDialogOpen(false);
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return apiRequest("POST", `/api/maintenance/tasks/${taskId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/stats`] });
      toast({ title: "Task status updated" });
    },
  });

  const updateIssueStatusMutation = useMutation({
    mutationFn: async ({ issueId, status }: { issueId: number; status: string }) => {
      return apiRequest("POST", `/api/maintenance/issues/${issueId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/issues`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/stats`] });
      toast({ title: "Issue status updated" });
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/properties/${propertyId}/maintenance/schedules`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/schedules`] });
      setScheduleDialogOpen(false);
      toast({ title: "Recurring schedule created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create schedule", variant: "destructive" });
    },
  });

  const runScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest("POST", `/api/maintenance/schedules/${scheduleId}/run`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/schedules`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/maintenance/stats`] });
      toast({ title: "Task created from schedule" });
    },
    onError: () => {
      toast({ title: "Failed to run schedule", variant: "destructive" });
    },
  });

  if (propertyLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Property not found</p>
      </div>
    );
  }

  const canEdit = property.isOwner || property.userRole === "EDITOR" || property.userRole === "SUPER_ADMIN";

  const severityColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    URGENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    TODO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    ON_HOLD: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  const openIssueExpenseDialog = (issue: IssueWithDetails) => {
    setIssueForExpense(issue);
    const laborCost = parseFloat(issue.costLabor || "0");
    const materialCost = parseFloat(issue.costMaterials || "0");
    const totalCost = laborCost + materialCost;
    setExpenseAmount(totalCost > 0 ? String(totalCost) : "");
    setExpenseDescription(`Maintenance Issue: ${issue.title}`);
    setExpenseVendor("");
    setSelectedOwnerId("");
    setIssueExpenseDialogOpen(true);
  };

  const createIssueExpense = async () => {
    if (!issueForExpense || !expenseAmount || !selectedOwnerId) return;

    await createExpenseMutation.mutateAsync({
      ownerId: parseInt(selectedOwnerId),
      propertyId: propertyId,
      maintenanceIssueId: issueForExpense.id,
      category: "MAINTENANCE",
      expenseDate: new Date().toISOString().split("T")[0],
      description: expenseDescription || `Maintenance Issue: ${issueForExpense.title}`,
      amount: expenseAmount,
      taxAmount: "0",
      vendorName: expenseVendor || undefined,
      paymentStatus: "UNPAID",
    });

    setIssueExpenseDialogOpen(false);
    setIssueForExpense(null);
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseVendor("");
    setSelectedOwnerId("");
  };

  return (
    <div className="p-6">
      <div className="border-b -m-6 mb-6">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <Link href={`/properties/${propertyId}`}>
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-property-name">{property.name}</h1>
                <p className="text-sm text-muted-foreground">Maintenance Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <>
                  <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-report-issue">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Report Issue
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createIssueMutation.mutate({
                            title: formData.get("title"),
                            description: formData.get("description"),
                            category: formData.get("category"),
                            severity: formData.get("severity"),
                          });
                        }}
                      >
                        <DialogHeader>
                          <DialogTitle>Report Maintenance Issue</DialogTitle>
                          <DialogDescription>
                            Report a new maintenance issue that needs attention.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" placeholder="Brief description of the issue" required data-testid="input-issue-title" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" placeholder="Detailed description of the issue..." data-testid="input-issue-description" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="category">Category</Label>
                              <Select name="category" defaultValue="GENERAL">
                                <SelectTrigger data-testid="select-issue-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PLUMBING">Plumbing</SelectItem>
                                  <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                                  <SelectItem value="HVAC">HVAC</SelectItem>
                                  <SelectItem value="STRUCTURAL">Structural</SelectItem>
                                  <SelectItem value="APPLIANCE">Appliance</SelectItem>
                                  <SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
                                  <SelectItem value="LANDSCAPING">Landscaping</SelectItem>
                                  <SelectItem value="SECURITY">Security</SelectItem>
                                  <SelectItem value="CLEANING">Cleaning</SelectItem>
                                  <SelectItem value="GENERAL">General</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="severity">Severity</Label>
                              <Select name="severity" defaultValue="MEDIUM">
                                <SelectTrigger data-testid="select-issue-severity">
                                  <SelectValue placeholder="Select severity" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LOW">Low</SelectItem>
                                  <SelectItem value="MEDIUM">Medium</SelectItem>
                                  <SelectItem value="HIGH">High</SelectItem>
                                  <SelectItem value="CRITICAL">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createIssueMutation.isPending} data-testid="button-submit-issue">
                            {createIssueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Report Issue
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-task">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createTaskMutation.mutate({
                            title: formData.get("title"),
                            description: formData.get("description"),
                            category: formData.get("category"),
                            priority: formData.get("priority"),
                          });
                        }}
                      >
                        <DialogHeader>
                          <DialogTitle>Create Maintenance Task</DialogTitle>
                          <DialogDescription>
                            Create a new maintenance task for the team.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="task-title">Title</Label>
                            <Input id="task-title" name="title" placeholder="Task title" required data-testid="input-task-title" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="task-description">Description</Label>
                            <Textarea id="task-description" name="description" placeholder="Task details..." data-testid="input-task-description" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="task-category">Category</Label>
                              <Select name="category" defaultValue="GENERAL">
                                <SelectTrigger data-testid="select-task-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PLUMBING">Plumbing</SelectItem>
                                  <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                                  <SelectItem value="HVAC">HVAC</SelectItem>
                                  <SelectItem value="STRUCTURAL">Structural</SelectItem>
                                  <SelectItem value="APPLIANCE">Appliance</SelectItem>
                                  <SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
                                  <SelectItem value="LANDSCAPING">Landscaping</SelectItem>
                                  <SelectItem value="SECURITY">Security</SelectItem>
                                  <SelectItem value="CLEANING">Cleaning</SelectItem>
                                  <SelectItem value="GENERAL">General</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="task-priority">Priority</Label>
                              <Select name="priority" defaultValue="MEDIUM">
                                <SelectTrigger data-testid="select-task-priority">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LOW">Low</SelectItem>
                                  <SelectItem value="MEDIUM">Medium</SelectItem>
                                  <SelectItem value="HIGH">High</SelectItem>
                                  <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit-task">
                            {createTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Task
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-open-issues">{stats?.openIssues || 0}</p>
                  <p className="text-xs text-muted-foreground">Open Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-in-progress">{stats?.inProgressTasks || 0}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-overdue">{stats?.overdueTasks || 0}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-completed">{stats?.completedThisMonth || 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-low-stock">{stats?.lowStockMaterials || 0}</p>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList data-testid="tabs-maintenance">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="issues" data-testid="tab-issues">Issues ({issues.length})</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">Team ({team.length})</TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">Materials ({materials.length})</TabsTrigger>
            <TabsTrigger value="schedules" data-testid="tab-schedules">Schedules ({schedules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Recent Issues
                  </CardTitle>
                  <CardDescription>Latest reported maintenance issues</CardDescription>
                </CardHeader>
                <CardContent>
                  {issues.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No issues reported</p>
                  ) : (
                    <div className="space-y-3">
                      {issues.slice(0, 5).map((issue) => (
                        <div key={issue.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid={`text-issue-title-${issue.id}`}>{issue.title}</p>
                            <p className="text-xs text-muted-foreground">{issue.category}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={severityColors[issue.severity || "MEDIUM"]} variant="secondary">
                              {issue.severity}
                            </Badge>
                            <Badge className={statusColors[issue.status || "OPEN"]} variant="secondary">
                              {issue.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Active Tasks
                  </CardTitle>
                  <CardDescription>Tasks currently in progress or pending</CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks.filter(t => t.status !== "COMPLETED" && t.status !== "CLOSED").length === 0 ? (
                    <p className="text-muted-foreground text-sm">No active tasks</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.filter(t => t.status !== "COMPLETED" && t.status !== "CLOSED").slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid={`text-task-title-${task.id}`}>{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {task.assignedMember?.user?.name || "Unassigned"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={priorityColors[task.priority || "MEDIUM"]} variant="secondary">
                              {task.priority}
                            </Badge>
                            <Badge className={statusColors[task.status || "TODO"]} variant="secondary">
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members
                  </CardTitle>
                  <CardDescription>Maintenance team for this property</CardDescription>
                </CardHeader>
                <CardContent>
                  {team.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No team members assigned</p>
                  ) : (
                    <div className="space-y-3">
                      {team.slice(0, 5).map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium" data-testid={`text-member-name-${member.id}`}>{member.user?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {member.skills?.slice(0, 2).map((s) => (
                              <Badge key={s.id} variant="outline" className="text-xs">
                                {s.skill}
                              </Badge>
                            ))}
                            {(member.skills?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(member.skills?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Schedules
                  </CardTitle>
                  <CardDescription>Scheduled maintenance tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  {schedules.filter(s => s.isActive).length === 0 ? (
                    <p className="text-muted-foreground text-sm">No active schedules</p>
                  ) : (
                    <div className="space-y-3">
                      {schedules.filter(s => s.isActive).slice(0, 5).map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium" data-testid={`text-schedule-title-${schedule.id}`}>{schedule.title}</p>
                            <p className="text-xs text-muted-foreground">{schedule.cadence}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleDateString() : "Not scheduled"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Issues</CardTitle>
                <CardDescription>Maintenance issues reported for this property</CardDescription>
              </CardHeader>
              <CardContent>
                {issues.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No issues reported yet</p>
                    {canEdit && (
                      <Button variant="outline" className="mt-4" onClick={() => setIssueDialogOpen(true)} data-testid="button-report-issue-empty">
                        Report an Issue
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {issues.map((issue) => (
                      <div key={issue.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold" data-testid={`text-issue-title-${issue.id}`}>{issue.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{issue.description || "No description"}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                              <span>Category: {issue.category}</span>
                              <span>Reported: {new Date(issue.createdAt!).toLocaleDateString()}</span>
                              {issue.assignedMember && (
                                <span>Assigned to: {issue.assignedMember.user?.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            <Badge className={severityColors[issue.severity || "MEDIUM"]} variant="secondary">
                              {issue.severity}
                            </Badge>
                            {canEdit && issue.status !== "CLOSED" && issue.status !== "RESOLVED" ? (
                              <Select
                                value={issue.status || "OPEN"}
                                onValueChange={(status) => updateIssueStatusMutation.mutate({ issueId: issue.id, status })}
                              >
                                <SelectTrigger className="w-[130px]" data-testid={`select-issue-status-${issue.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="OPEN">Open</SelectItem>
                                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                                  <SelectItem value="CLOSED">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <>
                                <Badge className={statusColors[issue.status || "OPEN"]} variant="secondary">
                                  {issue.status}
                                </Badge>
                                {canEdit && (issue.status === "CLOSED" || issue.status === "RESOLVED") && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => openIssueExpenseDialog(issue)}
                                    data-testid={`button-create-expense-issue-${issue.id}`}
                                  >
                                    <Wallet className="h-4 w-4 mr-1" />
                                    Create Expense
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>Maintenance tasks for this property</CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tasks created yet</p>
                    {canEdit && (
                      <Button variant="outline" className="mt-4" onClick={() => setTaskDialogOpen(true)} data-testid="button-create-task-empty">
                        Create a Task
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold" data-testid={`text-task-title-${task.id}`}>{task.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{task.description || "No description"}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                              <span>Category: {task.category}</span>
                              <span>Created: {new Date(task.createdAt!).toLocaleDateString()}</span>
                              {task.dueAt && (
                                <span className={new Date(task.dueAt) < new Date() && task.status !== "COMPLETED" ? "text-red-500" : ""}>
                                  Due: {new Date(task.dueAt).toLocaleDateString()}
                                </span>
                              )}
                              {task.assignedMember && (
                                <span>Assigned to: {task.assignedMember.user?.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            <Badge className={priorityColors[task.priority || "MEDIUM"]} variant="secondary">
                              {task.priority}
                            </Badge>
                            {canEdit && task.status !== "COMPLETED" && task.status !== "CLOSED" ? (
                              <Select
                                value={task.status || "TODO"}
                                onValueChange={(status) => handleTaskStatusChange(task, status)}
                              >
                                <SelectTrigger className="w-[130px]" data-testid={`select-task-status-${task.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="TODO">To Do</SelectItem>
                                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={statusColors[task.status || "TODO"]} variant="secondary">
                                {task.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Maintenance team assigned to this property</CardDescription>
              </CardHeader>
              <CardContent>
                {team.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No team members assigned</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {team.map((member) => (
                      <Card key={member.id}>
                        <CardContent className="pt-6">
                          <div className="flex flex-col gap-2">
                            <h3 className="font-semibold" data-testid={`text-member-name-${member.id}`}>{member.user?.name || "Unknown"}</h3>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                            {member.hourlyRate && (
                              <p className="text-xs text-muted-foreground">Rate: ${member.hourlyRate}/hr</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.skills?.map((s) => (
                                <Badge key={s.id} variant="outline" className="text-xs">
                                  {s.skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Materials Inventory</CardTitle>
                <CardDescription>Maintenance materials and supplies</CardDescription>
              </CardHeader>
              <CardContent>
                {materials.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No materials in inventory</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {materials.map((material) => {
                      const isLowStock = parseFloat(material.quantityOnHand || "0") <= parseFloat(material.reorderThreshold || "5");
                      return (
                        <div key={material.id} className="flex items-center justify-between gap-4 border rounded-lg p-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium" data-testid={`text-material-name-${material.id}`}>{material.name}</h3>
                            {material.sku && <p className="text-sm text-muted-foreground">SKU: {material.sku}</p>}
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <p className={`font-semibold ${isLowStock ? "text-red-500" : ""}`}>
                                {material.quantityOnHand} {material.unit}
                              </p>
                              {isLowStock && (
                                <p className="text-xs text-red-500">Low Stock</p>
                              )}
                            </div>
                            {material.costPerUnit && (
                              <Badge variant="outline">${material.costPerUnit}/unit</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>Recurring Schedules</CardTitle>
                  <CardDescription>Automatically create tasks on a recurring basis</CardDescription>
                </div>
                {canEdit && (
                  <Button onClick={() => setScheduleDialogOpen(true)} data-testid="button-create-schedule">
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Create Schedule
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <p className="text-muted-foreground">No schedules set up</p>
                    {canEdit && (
                      <Button variant="outline" className="mt-4" onClick={() => setScheduleDialogOpen(true)} data-testid="button-create-schedule-empty">
                        Create a Recurring Schedule
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between gap-4 border rounded-lg p-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium" data-testid={`text-schedule-title-${schedule.id}`}>{schedule.title}</h3>
                            <Badge variant="secondary">{schedule.cadence}</Badge>
                            {!schedule.isActive && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{schedule.description || "No description"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Category: {schedule.category} | Priority: {schedule.priority}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                          <div className="flex flex-col items-end gap-1">
                            {schedule.nextRunAt && (
                              <Badge variant="outline">
                                Next: {new Date(schedule.nextRunAt).toLocaleDateString()}
                              </Badge>
                            )}
                            {schedule.lastRunAt && (
                              <span className="text-xs text-muted-foreground">
                                Last: {new Date(schedule.lastRunAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {canEdit && schedule.isActive && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => runScheduleMutation.mutate(schedule.id)}
                              disabled={runScheduleMutation.isPending}
                              data-testid={`button-run-schedule-${schedule.id}`}
                            >
                              {runScheduleMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                                  Run Now
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              Complete Task
            </DialogTitle>
            <DialogDescription>
              {taskToComplete?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Would you like to record an expense for this maintenance task?
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="completion-owner">Owner (required for expense)</Label>
                <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                  <SelectTrigger id="completion-owner" data-testid="select-completion-owner">
                    <SelectValue placeholder="Select owner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={String(owner.id)}>
                        {owner.legalName} ({owner.ownerType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="completion-amount">Amount</Label>
                <Input
                  id="completion-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  data-testid="input-completion-amount"
                />
              </div>
              
              <div>
                <Label htmlFor="completion-description">Description</Label>
                <Input
                  id="completion-description"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  data-testid="input-completion-description"
                />
              </div>
              
              <div>
                <Label htmlFor="completion-vendor">Vendor (optional)</Label>
                <Input
                  id="completion-vendor"
                  value={expenseVendor}
                  onChange={(e) => setExpenseVendor(e.target.value)}
                  placeholder="Vendor name"
                  data-testid="input-completion-vendor"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={skipExpenseAndComplete}
              disabled={updateTaskStatusMutation.isPending}
              data-testid="button-skip-expense"
            >
              Skip and Complete
            </Button>
            <Button 
              onClick={completeTaskWithExpense}
              disabled={!selectedOwnerId || !expenseAmount || parseFloat(expenseAmount) <= 0 || createExpenseMutation.isPending || updateTaskStatusMutation.isPending}
              data-testid="button-complete-with-expense"
            >
              {(createExpenseMutation.isPending || updateTaskStatusMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Record Expense and Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issueExpenseDialogOpen} onOpenChange={setIssueExpenseDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              Create Expense from Issue
            </DialogTitle>
            <DialogDescription>
              {issueForExpense?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Record an expense for this resolved maintenance issue.
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="issue-expense-owner">Owner (required)</Label>
                <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                  <SelectTrigger id="issue-expense-owner" data-testid="select-issue-expense-owner">
                    <SelectValue placeholder="Select owner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={String(owner.id)}>
                        {owner.legalName} ({owner.ownerType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="issue-expense-amount">Amount</Label>
                <Input
                  id="issue-expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  data-testid="input-issue-expense-amount"
                />
              </div>
              
              <div>
                <Label htmlFor="issue-expense-description">Description</Label>
                <Input
                  id="issue-expense-description"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  data-testid="input-issue-expense-description"
                />
              </div>
              
              <div>
                <Label htmlFor="issue-expense-vendor">Vendor (optional)</Label>
                <Input
                  id="issue-expense-vendor"
                  value={expenseVendor}
                  onChange={(e) => setExpenseVendor(e.target.value)}
                  placeholder="Vendor name"
                  data-testid="input-issue-expense-vendor"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIssueExpenseDialogOpen(false)}
              data-testid="button-cancel-issue-expense"
            >
              Cancel
            </Button>
            <Button 
              onClick={createIssueExpense}
              disabled={!selectedOwnerId || !expenseAmount || parseFloat(expenseAmount) <= 0 || createExpenseMutation.isPending}
              data-testid="button-create-issue-expense"
            >
              {createExpenseMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Create Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" aria-hidden="true" />
              Create Recurring Schedule
            </DialogTitle>
            <DialogDescription>
              Set up automatic task creation on a schedule
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              createScheduleMutation.mutate({
                title: formData.get("title"),
                description: formData.get("description"),
                category: formData.get("category"),
                priority: formData.get("priority"),
                cadence: formData.get("cadence"),
                estimatedDurationMinutes: formData.get("duration") ? parseInt(formData.get("duration") as string) : null,
                defaultAssignedMemberId: formData.get("assignee") ? parseInt(formData.get("assignee") as string) : null,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="schedule-title">Title</Label>
              <Input
                id="schedule-title"
                name="title"
                placeholder="e.g., Monthly HVAC Filter Change"
                required
                data-testid="input-schedule-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-description">Description</Label>
              <Textarea
                id="schedule-description"
                name="description"
                placeholder="Describe what needs to be done..."
                data-testid="input-schedule-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-category">Category</Label>
                <Select name="category" defaultValue="GENERAL">
                  <SelectTrigger id="schedule-category" data-testid="select-schedule-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                    <SelectItem value="PLUMBING">Plumbing</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="STRUCTURAL">Structural</SelectItem>
                    <SelectItem value="CLEANING">Cleaning</SelectItem>
                    <SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
                    <SelectItem value="APPLIANCE">Appliance</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-priority">Priority</Label>
                <Select name="priority" defaultValue="MEDIUM">
                  <SelectTrigger id="schedule-priority" data-testid="select-schedule-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-cadence">Frequency</Label>
                <Select name="cadence" defaultValue="MONTHLY">
                  <SelectTrigger id="schedule-cadence" data-testid="select-schedule-cadence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-duration">Est. Duration (min)</Label>
                <Input
                  id="schedule-duration"
                  name="duration"
                  type="number"
                  min="0"
                  placeholder="60"
                  data-testid="input-schedule-duration"
                />
              </div>
            </div>
            {team.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="schedule-assignee">Default Assignee (optional)</Label>
                <Select name="assignee">
                  <SelectTrigger id="schedule-assignee" data-testid="select-schedule-assignee">
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {team.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.user?.name || "Unknown"} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createScheduleMutation.isPending} data-testid="button-submit-schedule">
                {createScheduleMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Create Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
