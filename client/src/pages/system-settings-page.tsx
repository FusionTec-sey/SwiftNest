import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Settings, 
  DollarSign, 
  FileText, 
  Wrench, 
  Zap,
  Save,
  Loader2
} from "lucide-react";

type SettingValue = {
  value: any;
  category: string;
  label: string;
  description: string;
};

type SettingsMap = Record<string, SettingValue>;

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("financial");

  const { data: settings, isLoading } = useQuery<SettingsMap>({
    queryKey: ["/api/settings"],
  });

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "System Settings", href: "/system-settings" }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: "System Settings", href: "/system-settings" }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">System Settings</h1>
            <p className="text-muted-foreground">Configure organization defaults and automation</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="financial" className="gap-2" data-testid="tab-financial">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="lease" className="gap-2" data-testid="tab-lease">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Lease Defaults</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2" data-testid="tab-operations">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2" data-testid="tab-automation">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Automation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financial">
            <FinancialSettings settings={settings} />
          </TabsContent>

          <TabsContent value="lease">
            <LeaseDefaultsSettings settings={settings} />
          </TabsContent>

          <TabsContent value="operations">
            <OperationsSettings settings={settings} />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationSettings settings={settings} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function FinancialSettings({ settings }: { settings?: SettingsMap }) {
  const { toast } = useToast();
  const [lateFeeEnabled, setLateFeeEnabled] = useState(settings?.late_fee_enabled?.value ?? false);
  const [lateFeePercent, setLateFeePercent] = useState(settings?.late_fee_percent?.value ?? "5");
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(settings?.late_fee_grace_days?.value ?? 5);
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoice_prefix?.value ?? "INV-");
  const [expenseThreshold, setExpenseThreshold] = useState(settings?.expense_approval_threshold?.value ?? "1000");
  const [defaultCurrency, setDefaultCurrency] = useState(settings?.default_currency?.value ?? "USD");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/settings", {
        settings: [
          { key: "late_fee_enabled", category: "FINANCIAL", value: lateFeeEnabled },
          { key: "late_fee_percent", category: "FINANCIAL", value: lateFeePercent },
          { key: "late_fee_grace_days", category: "FINANCIAL", value: lateFeeGraceDays },
          { key: "invoice_prefix", category: "FINANCIAL", value: invoicePrefix },
          { key: "expense_approval_threshold", category: "FINANCIAL", value: expenseThreshold },
          { key: "default_currency", category: "FINANCIAL", value: defaultCurrency },
        ]
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Financial settings saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Settings
        </CardTitle>
        <CardDescription>Configure late fees, invoice numbering, and expense policies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Late Fee Configuration</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Late Fees</Label>
              <p className="text-sm text-muted-foreground">Apply late fees to overdue invoices by default</p>
            </div>
            <Switch
              checked={lateFeeEnabled}
              onCheckedChange={setLateFeeEnabled}
              data-testid="switch-late-fee-enabled"
            />
          </div>

          {lateFeeEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="lateFeePercent">Late Fee Percentage (%)</Label>
                <Input
                  id="lateFeePercent"
                  type="number"
                  step="0.1"
                  value={lateFeePercent}
                  onChange={(e) => setLateFeePercent(e.target.value)}
                  data-testid="input-late-fee-percent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graceDays">Grace Period (days)</Label>
                <Input
                  id="graceDays"
                  type="number"
                  value={lateFeeGraceDays}
                  onChange={(e) => setLateFeeGraceDays(parseInt(e.target.value) || 0)}
                  data-testid="input-grace-days"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Invoice Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
              <Input
                id="invoicePrefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-"
                data-testid="input-invoice-prefix"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger data-testid="select-default-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  <SelectItem value="SCR">SCR - Seychellois Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Expense Policies</h3>
          
          <div className="space-y-2">
            <Label htmlFor="expenseThreshold">Expense Approval Threshold</Label>
            <p className="text-sm text-muted-foreground">Expenses above this amount require approval</p>
            <Input
              id="expenseThreshold"
              type="number"
              value={expenseThreshold}
              onChange={(e) => setExpenseThreshold(e.target.value)}
              data-testid="input-expense-threshold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} data-testid="button-save-financial">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaseDefaultsSettings({ settings }: { settings?: SettingsMap }) {
  const { toast } = useToast();
  const [rentFrequency, setRentFrequency] = useState(settings?.default_rent_frequency?.value ?? "MONTHLY");
  const [paymentDueDay, setPaymentDueDay] = useState(settings?.default_payment_due_day?.value ?? 1);
  const [depositMonths, setDepositMonths] = useState(settings?.default_deposit_months?.value ?? 2);
  const [renewalReminderDays, setRenewalReminderDays] = useState(settings?.renewal_reminder_days?.value ?? 60);
  const [noticePeriodDays, setNoticePeriodDays] = useState(settings?.notice_period_days?.value ?? 30);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/settings", {
        settings: [
          { key: "default_rent_frequency", category: "LEASE_DEFAULTS", value: rentFrequency },
          { key: "default_payment_due_day", category: "LEASE_DEFAULTS", value: paymentDueDay },
          { key: "default_deposit_months", category: "LEASE_DEFAULTS", value: depositMonths },
          { key: "renewal_reminder_days", category: "LEASE_DEFAULTS", value: renewalReminderDays },
          { key: "notice_period_days", category: "LEASE_DEFAULTS", value: noticePeriodDays },
        ]
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Lease defaults saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Lease Defaults
        </CardTitle>
        <CardDescription>Set default values for new leases (can be overridden per lease)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rentFrequency">Default Rent Frequency</Label>
            <Select value={rentFrequency} onValueChange={setRentFrequency}>
              <SelectTrigger data-testid="select-rent-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDueDay">Default Payment Due Day</Label>
            <Select value={String(paymentDueDay)} onValueChange={(v) => setPaymentDueDay(parseInt(v))}>
              <SelectTrigger data-testid="select-payment-due-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 5, 10, 15, 20, 25, 28].map(day => (
                  <SelectItem key={day} value={String(day)}>{day}st/th of month</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="depositMonths">Security Deposit (months of rent)</Label>
            <Input
              id="depositMonths"
              type="number"
              min="0"
              max="12"
              value={depositMonths}
              onChange={(e) => setDepositMonths(parseInt(e.target.value) || 0)}
              data-testid="input-deposit-months"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="noticePeriodDays">Notice Period (days)</Label>
            <Input
              id="noticePeriodDays"
              type="number"
              value={noticePeriodDays}
              onChange={(e) => setNoticePeriodDays(parseInt(e.target.value) || 0)}
              data-testid="input-notice-period"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Renewal Reminders</h3>
          
          <div className="space-y-2">
            <Label htmlFor="renewalReminderDays">Renewal Reminder Lead Time (days)</Label>
            <p className="text-sm text-muted-foreground">Days before lease end to send renewal reminder</p>
            <Input
              id="renewalReminderDays"
              type="number"
              value={renewalReminderDays}
              onChange={(e) => setRenewalReminderDays(parseInt(e.target.value) || 0)}
              data-testid="input-renewal-reminder"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} data-testid="button-save-lease">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OperationsSettings({ settings }: { settings?: SettingsMap }) {
  const { toast } = useToast();
  const [slaHours, setSlaHours] = useState(settings?.maintenance_sla_hours?.value ?? 24);
  const [onboardingAutoAdvance, setOnboardingAutoAdvance] = useState(settings?.onboarding_auto_advance?.value ?? true);
  const [requirePhotoIssues, setRequirePhotoIssues] = useState(settings?.require_photo_for_issues?.value ?? false);
  const [requirePhotoOnboarding, setRequirePhotoOnboarding] = useState(settings?.require_photo_for_onboarding?.value ?? true);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/settings", {
        settings: [
          { key: "maintenance_sla_hours", category: "OPERATIONS", value: slaHours },
          { key: "onboarding_auto_advance", category: "OPERATIONS", value: onboardingAutoAdvance },
          { key: "require_photo_for_issues", category: "OPERATIONS", value: requirePhotoIssues },
          { key: "require_photo_for_onboarding", category: "OPERATIONS", value: requirePhotoOnboarding },
        ]
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Operations settings saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Operations Settings
        </CardTitle>
        <CardDescription>Configure maintenance and onboarding workflows</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Maintenance</h3>
          
          <div className="space-y-2">
            <Label htmlFor="slaHours">Default SLA Target (hours)</Label>
            <p className="text-sm text-muted-foreground">Target resolution time for maintenance issues</p>
            <Input
              id="slaHours"
              type="number"
              value={slaHours}
              onChange={(e) => setSlaHours(parseInt(e.target.value) || 24)}
              data-testid="input-sla-hours"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Photos for Issues</Label>
              <p className="text-sm text-muted-foreground">Require photo attachments when reporting issues</p>
            </div>
            <Switch
              checked={requirePhotoIssues}
              onCheckedChange={setRequirePhotoIssues}
              data-testid="switch-require-photo-issues"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Tenant Onboarding</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Advance Onboarding Stages</Label>
              <p className="text-sm text-muted-foreground">Automatically advance to next stage when requirements are met</p>
            </div>
            <Switch
              checked={onboardingAutoAdvance}
              onCheckedChange={setOnboardingAutoAdvance}
              data-testid="switch-onboarding-auto-advance"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Condition Photos</Label>
              <p className="text-sm text-muted-foreground">Require photos during move-in condition checklist</p>
            </div>
            <Switch
              checked={requirePhotoOnboarding}
              onCheckedChange={setRequirePhotoOnboarding}
              data-testid="switch-require-photo-onboarding"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} data-testid="button-save-operations">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AutomationSettings({ settings }: { settings?: SettingsMap }) {
  const { toast } = useToast();
  const [autoGenerateInvoices, setAutoGenerateInvoices] = useState(settings?.auto_generate_invoices?.value ?? true);
  const [invoiceLeadDays, setInvoiceLeadDays] = useState(settings?.invoice_generate_days_before?.value ?? 5);
  const [complianceReminderDays, setComplianceReminderDays] = useState(settings?.compliance_reminder_days?.value ?? 30);
  const [autoCalculateLateFees, setAutoCalculateLateFees] = useState(settings?.auto_calculate_late_fees?.value ?? false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/settings", {
        settings: [
          { key: "auto_generate_invoices", category: "AUTOMATION", value: autoGenerateInvoices },
          { key: "invoice_generate_days_before", category: "AUTOMATION", value: invoiceLeadDays },
          { key: "compliance_reminder_days", category: "AUTOMATION", value: complianceReminderDays },
          { key: "auto_calculate_late_fees", category: "AUTOMATION", value: autoCalculateLateFees },
        ]
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Automation settings saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Automation Settings
        </CardTitle>
        <CardDescription>Configure automatic processes and reminders</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Invoice Automation</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Generate Rent Invoices</Label>
              <p className="text-sm text-muted-foreground">Automatically create invoices before rent is due</p>
            </div>
            <Switch
              checked={autoGenerateInvoices}
              onCheckedChange={setAutoGenerateInvoices}
              data-testid="switch-auto-generate-invoices"
            />
          </div>

          {autoGenerateInvoices && (
            <div className="pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="invoiceLeadDays">Generate Invoices (days before due)</Label>
                <Input
                  id="invoiceLeadDays"
                  type="number"
                  value={invoiceLeadDays}
                  onChange={(e) => setInvoiceLeadDays(parseInt(e.target.value) || 5)}
                  data-testid="input-invoice-lead-days"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Calculate Late Fees</Label>
              <p className="text-sm text-muted-foreground">Automatically apply late fees to overdue invoices</p>
            </div>
            <Switch
              checked={autoCalculateLateFees}
              onCheckedChange={setAutoCalculateLateFees}
              data-testid="switch-auto-late-fees"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Compliance & Reminders</h3>
          
          <div className="space-y-2">
            <Label htmlFor="complianceReminderDays">Compliance Reminder Lead Time (days)</Label>
            <p className="text-sm text-muted-foreground">Days before document expiry to send reminder</p>
            <Input
              id="complianceReminderDays"
              type="number"
              value={complianceReminderDays}
              onChange={(e) => setComplianceReminderDays(parseInt(e.target.value) || 30)}
              data-testid="input-compliance-reminder"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} data-testid="button-save-automation">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
