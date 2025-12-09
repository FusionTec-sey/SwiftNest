import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeftRight,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  TrendingUp,
  Calendar,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CURRENCIES, getCurrencySymbol } from "@/lib/currency";
import type { ExchangeRate } from "@shared/schema";

const exchangeRateFormSchema = z.object({
  baseCurrency: z.string().min(1, "Base currency is required"),
  quoteCurrency: z.string().min(1, "Quote currency is required"),
  rate: z.string().min(1, "Rate is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Rate must be positive"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  source: z.string().optional(),
}).refine((data) => data.baseCurrency !== data.quoteCurrency, {
  message: "Base and quote currencies must be different",
  path: ["quoteCurrency"],
});

type ExchangeRateFormData = z.infer<typeof exchangeRateFormSchema>;

export default function ExchangeRatesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [deletingRate, setDeletingRate] = useState<ExchangeRate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: exchangeRates, isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });

  const isAdmin = user?.isSuperAdmin === 1;

  const form = useForm<ExchangeRateFormData>({
    resolver: zodResolver(exchangeRateFormSchema),
    defaultValues: {
      baseCurrency: "USD",
      quoteCurrency: "",
      rate: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      source: "Manual",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ExchangeRateFormData) => {
      return apiRequest("POST", "/api/exchange-rates", {
        ...data,
        rate: data.rate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setIsFormOpen(false);
      form.reset();
      toast({ title: "Exchange rate created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create exchange rate", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ExchangeRateFormData & { id: number }) => {
      return apiRequest("PATCH", `/api/exchange-rates/${data.id}`, {
        rate: data.rate,
        effectiveDate: data.effectiveDate,
        source: data.source,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setIsFormOpen(false);
      setEditingRate(null);
      form.reset();
      toast({ title: "Exchange rate updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update exchange rate", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/exchange-rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setDeletingRate(null);
      toast({ title: "Exchange rate deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete exchange rate", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenForm = (rate?: ExchangeRate) => {
    if (rate) {
      setEditingRate(rate);
      form.reset({
        baseCurrency: rate.baseCurrency,
        quoteCurrency: rate.quoteCurrency,
        rate: rate.rate,
        effectiveDate: new Date(rate.effectiveDate).toISOString().split("T")[0],
        source: rate.source || "Manual",
      });
    } else {
      setEditingRate(null);
      form.reset({
        baseCurrency: "USD",
        quoteCurrency: "",
        rate: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        source: "Manual",
      });
    }
    setIsFormOpen(true);
  };

  const onSubmit = (data: ExchangeRateFormData) => {
    if (editingRate) {
      updateMutation.mutate({ ...data, id: editingRate.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredRates = exchangeRates?.filter((rate) => {
    const search = searchTerm.toLowerCase();
    return (
      rate.baseCurrency.toLowerCase().includes(search) ||
      rate.quoteCurrency.toLowerCase().includes(search)
    );
  }) || [];

  const uniqueCurrencyPairs = new Set(filteredRates.map(r => `${r.baseCurrency}/${r.quoteCurrency}`));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Exchange Rates</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Exchange rate management is only available to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Exchange Rates</h1>
          <p className="text-sm text-muted-foreground">
            Manage currency exchange rates for multi-currency transactions
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} data-testid="button-add-exchange-rate">
          <Plus className="h-4 w-4 mr-2" />
          Add Exchange Rate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Rates</p>
                <p className="text-2xl font-bold" data-testid="stat-total-rates">
                  {exchangeRates?.length || 0}
                </p>
              </div>
              <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Currency Pairs</p>
                <p className="text-2xl font-bold" data-testid="stat-currency-pairs">
                  {uniqueCurrencyPairs.size}
                </p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Supported Currencies</p>
                <p className="text-2xl font-bold" data-testid="stat-supported-currencies">
                  {CURRENCIES.length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium" data-testid="stat-last-updated">
                  {exchangeRates && exchangeRates.length > 0
                    ? formatDate(exchangeRates.sort((a, b) => 
                        new Date(b.updatedAt || b.effectiveDate).getTime() - 
                        new Date(a.updatedAt || a.effectiveDate).getTime()
                      )[0].updatedAt || exchangeRates[0].effectiveDate)
                    : "No data"}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Exchange Rate List</CardTitle>
              <CardDescription>View and manage all exchange rates</CardDescription>
            </div>
            <Input
              placeholder="Search by currency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              data-testid="input-search-rates"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredRates.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Base Currency</TableHead>
                    <TableHead>Quote Currency</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRates.map((rate) => (
                    <TableRow key={rate.id} data-testid={`row-exchange-rate-${rate.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getCurrencySymbol(rate.baseCurrency)} {rate.baseCurrency}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {getCurrencySymbol(rate.quoteCurrency)} {rate.quoteCurrency}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(rate.rate).toFixed(6)}
                      </TableCell>
                      <TableCell>{formatDate(rate.effectiveDate)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {rate.source || "Manual"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenForm(rate)}
                            data-testid={`button-edit-rate-${rate.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingRate(rate)}
                            data-testid={`button-delete-rate-${rate.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No exchange rates found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Add your first exchange rate to enable multi-currency support"}
              </p>
              <Button onClick={() => handleOpenForm()} data-testid="button-add-first-rate">
                <Plus className="h-4 w-4 mr-2" />
                Add Exchange Rate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Exchange Rate" : "Add Exchange Rate"}
            </DialogTitle>
            <DialogDescription>
              {editingRate
                ? "Update the exchange rate details."
                : "Add a new exchange rate for currency conversion."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="baseCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!editingRate}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-base-currency">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.symbol} {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quoteCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!editingRate}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-quote-currency">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.filter(c => c.code !== form.watch("baseCurrency")).map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.symbol} {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.000001"
                        placeholder="1.00"
                        data-testid="input-rate"
                      />
                    </FormControl>
                    <FormDescription>
                      1 {form.watch("baseCurrency") || "BASE"} = {field.value || "?"} {form.watch("quoteCurrency") || "QUOTE"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-effective-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Central Bank, Manual"
                        data-testid="input-source"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-rate"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingRate ? (
                    "Update Rate"
                  ) : (
                    "Add Rate"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRate} onOpenChange={() => setDeletingRate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exchange Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the exchange rate for{" "}
              {deletingRate?.baseCurrency}/{deletingRate?.quoteCurrency}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRate && deleteMutation.mutate(deletingRate.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
