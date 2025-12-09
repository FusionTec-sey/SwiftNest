import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Landmark,
  TrendingDown,
  Calendar,
  Download,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { Property, Owner, Loan } from "@shared/schema";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("property-pnl");
  
  const currentYear = new Date().getFullYear();
  const [pnlStartDate, setPnlStartDate] = useState(`${currentYear}-01-01`);
  const [pnlEndDate, setPnlEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("all");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [depreciationAsOfDate, setDepreciationAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: loans } = useQuery<Loan[]>({ queryKey: ["/api/loans"] });

  const propertyPnlUrl = `/api/reports/property-pnl?startDate=${pnlStartDate}&endDate=${pnlEndDate}${selectedPropertyId !== "all" ? `&propertyId=${selectedPropertyId}` : ""}`;
  const ownerPnlUrl = `/api/reports/owner-pnl?startDate=${pnlStartDate}&endDate=${pnlEndDate}${selectedOwnerId !== "all" ? `&ownerId=${selectedOwnerId}` : ""}`;

  const { data: propertyPnL, isLoading: propertyPnLLoading, refetch: refetchPropertyPnL } = useQuery<any>({
    queryKey: [propertyPnlUrl],
    enabled: activeTab === "property-pnl",
  });

  const { data: ownerPnL, isLoading: ownerPnLLoading, refetch: refetchOwnerPnL } = useQuery<any>({
    queryKey: [ownerPnlUrl],
    enabled: activeTab === "owner-pnl",
  });

  const { data: loanSchedule, isLoading: loanScheduleLoading } = useQuery<any>({
    queryKey: [`/api/reports/loan-schedule/${selectedLoanId}`],
    enabled: activeTab === "loan-schedule" && !!selectedLoanId,
  });

  const { data: loansSummary, isLoading: loansSummaryLoading } = useQuery<any>({
    queryKey: ["/api/reports/loans-summary"],
    enabled: activeTab === "loan-schedule",
  });

  const depreciationUrl = `/api/reports/depreciation?asOfDate=${depreciationAsOfDate}${selectedOwnerId !== "all" ? `&ownerId=${selectedOwnerId}` : ""}${selectedPropertyId !== "all" ? `&propertyId=${selectedPropertyId}` : ""}`;
  const { data: depreciationReport, isLoading: depreciationLoading, refetch: refetchDepreciation } = useQuery<any>({
    queryKey: [depreciationUrl],
    enabled: activeTab === "depreciation",
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <h1 className="text-2xl font-semibold">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Financial reports and analytics for your portfolio
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-reports">
            <TabsTrigger value="property-pnl" data-testid="tab-property-pnl">
              <Building2 className="mr-2 h-4 w-4" />
              Property P&L
            </TabsTrigger>
            <TabsTrigger value="owner-pnl" data-testid="tab-owner-pnl">
              <Users className="mr-2 h-4 w-4" />
              Owner P&L
            </TabsTrigger>
            <TabsTrigger value="loan-schedule" data-testid="tab-loan-schedule">
              <Landmark className="mr-2 h-4 w-4" />
              Loan Schedules
            </TabsTrigger>
            <TabsTrigger value="depreciation" data-testid="tab-depreciation">
              <TrendingDown className="mr-2 h-4 w-4" />
              Depreciation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="property-pnl" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Property Profit & Loss Report
                </CardTitle>
                <CardDescription>
                  Income and expense breakdown by property
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={pnlStartDate}
                      onChange={(e) => setPnlStartDate(e.target.value)}
                      data-testid="input-pnl-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={pnlEndDate}
                      onChange={(e) => setPnlEndDate(e.target.value)}
                      data-testid="input-pnl-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                      <SelectTrigger className="w-[200px]" data-testid="select-pnl-property">
                        <SelectValue placeholder="All Properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {properties?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => refetchPropertyPnL()} data-testid="button-refresh-property-pnl">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {propertyPnLLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-full" />
                    <div className="h-8 bg-muted rounded w-full" />
                  </div>
                ) : propertyPnL ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Total Income</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600" data-testid="text-total-income">
                            {formatCurrency(propertyPnL.totals?.income || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2">
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Total Expenses</span>
                          </div>
                          <div className="text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                            {formatCurrency(propertyPnL.totals?.expenses || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm text-muted-foreground">Net Income</span>
                          </div>
                          <div
                            className={`text-2xl font-bold ${
                              (propertyPnL.totals?.netIncome || 0) >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                            data-testid="text-net-income"
                          >
                            {formatCurrency(propertyPnL.totals?.netIncome || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Property</TableHead>
                            <TableHead className="text-right">Income</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right">Net Income</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propertyPnL.properties?.map((prop: any) => (
                            <TableRow key={prop.propertyId} data-testid={`row-property-pnl-${prop.propertyId}`}>
                              <TableCell className="font-medium">{prop.propertyName}</TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(prop.income)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(prop.expenses)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium ${
                                  prop.netIncome >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {formatCurrency(prop.netIncome)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!propertyPnL.properties || propertyPnL.properties.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No data available for the selected period
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select date range and click Refresh to generate report
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owner-pnl" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Owner Profit & Loss Report
                </CardTitle>
                <CardDescription>
                  Income and expense breakdown by property owner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={pnlStartDate}
                      onChange={(e) => setPnlStartDate(e.target.value)}
                      data-testid="input-owner-pnl-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={pnlEndDate}
                      onChange={(e) => setPnlEndDate(e.target.value)}
                      data-testid="input-owner-pnl-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                      <SelectTrigger className="w-[200px]" data-testid="select-owner-pnl">
                        <SelectValue placeholder="All Owners" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Owners</SelectItem>
                        {owners?.map((o) => (
                          <SelectItem key={o.id} value={o.id.toString()}>
                            {o.legalName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => refetchOwnerPnL()} data-testid="button-refresh-owner-pnl">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {ownerPnLLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-full" />
                    <div className="h-8 bg-muted rounded w-full" />
                  </div>
                ) : ownerPnL ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Gross Income</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(ownerPnL.totals?.grossIncome || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2">
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Total Expenses</span>
                          </div>
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(ownerPnL.totals?.expenses || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm text-muted-foreground">Net Income</span>
                          </div>
                          <div
                            className={`text-2xl font-bold ${
                              (ownerPnL.totals?.netIncome || 0) >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(ownerPnL.totals?.netIncome || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Owner</TableHead>
                            <TableHead>Properties</TableHead>
                            <TableHead className="text-right">Gross Income</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right">Net Income</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ownerPnL.owners?.map((owner: any) => (
                            <TableRow key={owner.ownerId} data-testid={`row-owner-pnl-${owner.ownerId}`}>
                              <TableCell className="font-medium">{owner.ownerName}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {owner.properties?.map((p: any) => (
                                    <Badge key={p.propertyId} variant="secondary">
                                      {p.propertyName} ({p.ownershipPercent}%)
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(owner.grossIncome)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(owner.expenses)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium ${
                                  owner.netIncome >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {formatCurrency(owner.netIncome)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!ownerPnL.owners || ownerPnL.owners.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No data available for the selected period
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select date range and click Refresh to generate report
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loan-schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Loan Amortization Schedules
                </CardTitle>
                <CardDescription>
                  View loan payment schedules and balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loansSummaryLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-full" />
                  </div>
                ) : loansSummary ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Total Principal</div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(loansSummary.totals?.totalPrincipal || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Outstanding Balance</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(loansSummary.totals?.totalOutstanding || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Monthly Payments</div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(loansSummary.totals?.monthlyPayments || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Loan for Detailed Schedule</Label>
                      <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                        <SelectTrigger className="w-full max-w-md" data-testid="select-loan">
                          <SelectValue placeholder="Select a loan" />
                        </SelectTrigger>
                        <SelectContent>
                          {loansSummary.loans?.map((loan: any) => (
                            <SelectItem key={loan.loanId} value={loan.loanId.toString()}>
                              {loan.lenderName} - {loan.ownerName} ({formatCurrency(loan.principal)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {loanScheduleLoading ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-full" />
                      </div>
                    ) : loanSchedule ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                          <div>
                            <span className="text-sm text-muted-foreground">Lender</span>
                            <div className="font-medium">{loanSchedule.lenderName}</div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Principal</span>
                            <div className="font-medium">{formatCurrency(loanSchedule.principal)}</div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Interest Rate</span>
                            <div className="font-medium">{loanSchedule.interestRate}%</div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Term</span>
                            <div className="font-medium">{loanSchedule.termMonths} months</div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-sm text-muted-foreground">Total Interest</div>
                              <div className="text-xl font-bold">
                                {formatCurrency(loanSchedule.summary?.totalInterest || 0)}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-sm text-muted-foreground">Remaining Balance</div>
                              <div className="text-xl font-bold text-orange-600">
                                {formatCurrency(loanSchedule.summary?.remainingBalance || 0)}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-sm text-muted-foreground">Payments Made</div>
                              <div className="text-xl font-bold">
                                {loanSchedule.summary?.paidPeriods || 0} / {loanSchedule.schedule?.length || 0}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <ScrollArea className="h-[300px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Opening</TableHead>
                                <TableHead className="text-right">Principal</TableHead>
                                <TableHead className="text-right">Interest</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Closing</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loanSchedule.schedule?.map((entry: any) => (
                                <TableRow key={entry.id}>
                                  <TableCell>{entry.periodNumber}</TableCell>
                                  <TableCell>{formatDate(entry.dueDate)}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(parseFloat(entry.openingBalance))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(parseFloat(entry.principalDue))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(parseFloat(entry.interestDue))}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(parseFloat(entry.totalDue))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(parseFloat(entry.closingBalance))}
                                  </TableCell>
                                  <TableCell>
                                    {entry.isPaid === 1 ? (
                                      <Badge variant="default">Paid</Badge>
                                    ) : (
                                      <Badge variant="secondary">Pending</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    ) : selectedLoanId ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading schedule...
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Select a loan to view its amortization schedule
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No loans found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="depreciation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Asset Depreciation Report
                </CardTitle>
                <CardDescription>
                  Book and tax depreciation for all assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>As of Date</Label>
                    <Input
                      type="date"
                      value={depreciationAsOfDate}
                      onChange={(e) => setDepreciationAsOfDate(e.target.value)}
                      data-testid="input-depreciation-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                      <SelectTrigger className="w-[200px]" data-testid="select-depreciation-owner">
                        <SelectValue placeholder="All Owners" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Owners</SelectItem>
                        {owners?.map((o) => (
                          <SelectItem key={o.id} value={o.id.toString()}>
                            {o.legalName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                      <SelectTrigger className="w-[200px]" data-testid="select-depreciation-property">
                        <SelectValue placeholder="All Properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {properties?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => refetchDepreciation()} data-testid="button-refresh-depreciation">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {depreciationLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-full" />
                    <div className="h-8 bg-muted rounded w-full" />
                  </div>
                ) : depreciationReport ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-5">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Total Cost</div>
                          <div className="text-xl font-bold">
                            {formatCurrency(depreciationReport.totals?.totalCost || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Book Accum.</div>
                          <div className="text-xl font-bold">
                            {formatCurrency(depreciationReport.totals?.totalBookAccumulated || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Tax Accum.</div>
                          <div className="text-xl font-bold">
                            {formatCurrency(depreciationReport.totals?.totalTaxAccumulated || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Book Net Value</div>
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(depreciationReport.totals?.totalBookNetValue || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Tax Net Value</div>
                          <div className="text-xl font-bold text-blue-600">
                            {formatCurrency(depreciationReport.totals?.totalTaxNetValue || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Book Accum.</TableHead>
                            <TableHead className="text-right">Book NBV</TableHead>
                            <TableHead className="text-right">Tax Accum.</TableHead>
                            <TableHead className="text-right">Tax NBV</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {depreciationReport.assets?.map((asset: any) => (
                            <TableRow key={asset.assetId} data-testid={`row-depreciation-${asset.assetId}`}>
                              <TableCell className="font-medium">{asset.assetName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{asset.category}</Badge>
                              </TableCell>
                              <TableCell>{asset.ownerName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(asset.cost)}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(asset.bookAccumulatedDepreciation)}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(asset.bookNetValue)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(asset.taxAccumulatedDepreciation)}
                              </TableCell>
                              <TableCell className="text-right text-blue-600">
                                {formatCurrency(asset.taxNetValue)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!depreciationReport.assets || depreciationReport.assets.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground">
                                No assets found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Click Refresh to generate the depreciation report
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
