import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Plus, Trash2, Pencil, Warehouse, FolderTree, Key, Search, Box, ChevronRight, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  FormControl,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
import { EmptyState } from "@/components/empty-state";
import type { InventoryCategory, WarehouseLocation, InventoryItem, Property, InventoryCategoryWithChildren } from "@shared/schema";

const ITEM_TYPES = [
  { value: "KEY", label: "Key" },
  { value: "REMOTE", label: "Remote" },
  { value: "ACCESS_CARD", label: "Access Card" },
  { value: "APPLIANCE", label: "Appliance" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "FIXTURE", label: "Fixture" },
  { value: "TOOL", label: "Tool" },
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "ELECTRONIC", label: "Electronic" },
  { value: "OTHER", label: "Other" },
];

const ITEM_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "LOST", label: "Lost" },
  { value: "RETIRED", label: "Retired" },
];

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  parentId: z.number().nullable().optional(),
  itemType: z.string().optional(),
  sortOrder: z.number().default(0),
});

const warehouseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  description: z.string().optional(),
  isActive: z.number().default(1),
});

const itemFormSchema = z.object({
  itemType: z.string().min(1, "Item type is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sku: z.string().optional(),
  serialNumber: z.string().optional(),
  unitCost: z.string().optional(),
  reorderLevel: z.number().default(0),
  status: z.string().default("AVAILABLE"),
  warehouseId: z.number().nullable().optional(),
  propertyId: z.number().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  quantity: z.number().default(1),
  notes: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;
type WarehouseFormData = z.infer<typeof warehouseFormSchema>;
type ItemFormData = z.infer<typeof itemFormSchema>;

const getStatusVariant = (status: string) => {
  switch (status) {
    case "AVAILABLE":
      return "default";
    case "ASSIGNED":
      return "secondary";
    case "DAMAGED":
      return "destructive";
    case "LOST":
      return "destructive";
    case "RETIRED":
      return "outline";
    default:
      return "outline";
  }
};

function CategoryTree({ categories, level = 0, onEdit, onDelete }: { 
  categories: (InventoryCategory & { children?: InventoryCategory[] })[]; 
  level?: number;
  onEdit: (cat: InventoryCategory) => void;
  onDelete: (cat: InventoryCategory) => void;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (!categories.length) return null;

  return (
    <div className="space-y-1">
      {categories.map((cat) => (
        <div key={cat.id}>
          <div 
            className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            {cat.children && cat.children.length > 0 ? (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6"
                onClick={() => setExpanded(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
              >
                {expanded[cat.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">{cat.name}</span>
            {cat.itemType && (
              <Badge variant="outline" className="text-xs">{cat.itemType}</Badge>
            )}
            <Button size="icon" variant="ghost" onClick={() => onEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(cat)} data-testid={`button-delete-category-${cat.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {expanded[cat.id] && cat.children && cat.children.length > 0 && (
            <CategoryTree categories={cat.children} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function InventoryPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("items");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<InventoryCategory | null>(null);
  
  const [isWarehouseFormOpen, setIsWarehouseFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseLocation | null>(null);
  const [deletingWarehouse, setDeletingWarehouse] = useState<WarehouseLocation | null>(null);
  
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery<InventoryCategory[]>({
    queryKey: ["/api/inventory/categories"],
  });

  const { data: categoryTree } = useQuery<InventoryCategoryWithChildren[]>({
    queryKey: ["/api/inventory/categories/tree"],
  });

  const { data: warehouses, isLoading: warehousesLoading } = useQuery<WarehouseLocation[]>({
    queryKey: ["/api/inventory/warehouses"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: null,
      itemType: "",
      sortOrder: 0,
    },
  });

  const warehouseForm = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      isActive: 1,
    },
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      itemType: "",
      name: "",
      description: "",
      sku: "",
      serialNumber: "",
      unitCost: "",
      reorderLevel: 0,
      status: "AVAILABLE",
      warehouseId: null,
      propertyId: null,
      categoryId: null,
      quantity: 1,
      notes: "",
    },
  });

  const categoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (editingCategory) {
        return apiRequest("PATCH", `/api/inventory/categories/${editingCategory.id}`, data);
      }
      return apiRequest("POST", "/api/inventory/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories/tree"] });
      setIsCategoryFormOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: editingCategory ? "Category updated" : "Category created",
        description: editingCategory ? "The category has been updated." : "A new category has been created.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save category.", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories/tree"] });
      setDeletingCategory(null);
      toast({ title: "Category deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
    },
  });

  const warehouseMutation = useMutation({
    mutationFn: async (data: WarehouseFormData) => {
      if (editingWarehouse) {
        return apiRequest("PATCH", `/api/inventory/warehouses/${editingWarehouse.id}`, data);
      }
      return apiRequest("POST", "/api/inventory/warehouses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] });
      setIsWarehouseFormOpen(false);
      setEditingWarehouse(null);
      warehouseForm.reset();
      toast({
        title: editingWarehouse ? "Warehouse updated" : "Warehouse created",
        description: editingWarehouse ? "The warehouse has been updated." : "A new warehouse has been created.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save warehouse.", variant: "destructive" });
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] });
      setDeletingWarehouse(null);
      toast({ title: "Warehouse deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete warehouse.", variant: "destructive" });
    },
  });

  const itemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      if (editingItem) {
        return apiRequest("PATCH", `/api/inventory/items/${editingItem.id}`, data);
      }
      return apiRequest("POST", "/api/inventory/items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      setIsItemFormOpen(false);
      setEditingItem(null);
      itemForm.reset();
      toast({
        title: editingItem ? "Item updated" : "Item created",
        description: editingItem ? "The item has been updated." : "A new item has been created.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save item.", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      setDeletingItem(null);
      toast({ title: "Item deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const handleEditCategory = (cat: InventoryCategory) => {
    setEditingCategory(cat);
    categoryForm.reset({
      name: cat.name,
      description: cat.description || "",
      parentId: cat.parentId,
      itemType: cat.itemType || "",
      sortOrder: cat.sortOrder || 0,
    });
    setIsCategoryFormOpen(true);
  };

  const handleEditWarehouse = (wh: WarehouseLocation) => {
    setEditingWarehouse(wh);
    warehouseForm.reset({
      name: wh.name,
      address: wh.address || "",
      description: wh.description || "",
      isActive: wh.isActive,
    });
    setIsWarehouseFormOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    itemForm.reset({
      itemType: item.itemType,
      name: item.name,
      description: item.description || "",
      sku: item.sku || "",
      serialNumber: item.serialNumber || "",
      unitCost: item.unitCost || "",
      reorderLevel: item.reorderLevel || 0,
      status: item.status,
      warehouseId: item.warehouseId,
      propertyId: item.propertyId,
      categoryId: item.categoryId,
      quantity: item.quantity || 1,
      notes: item.notes || "",
    });
    setIsItemFormOpen(true);
  };

  const filteredItems = items?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
            <p className="text-sm text-muted-foreground">Track and manage property items, keys, and equipment</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="items" data-testid="tab-items">
            <Box className="h-4 w-4 mr-2" />
            Items
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <FolderTree className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="warehouses" data-testid="tab-warehouses">
            <Warehouse className="h-4 w-4 mr-2" />
            Warehouses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>All trackable items across properties and warehouses</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[250px]"
                    data-testid="input-search-items"
                  />
                </div>
                <Button onClick={() => { setEditingItem(null); itemForm.reset(); setIsItemFormOpen(true); }} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading items...</div>
              ) : !filteredItems?.length ? (
                <EmptyState
                  icon={Package}
                  title="No inventory items"
                  description="Add your first inventory item to start tracking"
                  actionLabel="Add Item"
                  onAction={() => { setEditingItem(null); itemForm.reset(); setIsItemFormOpen(true); }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.itemType}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.sku || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.propertyId 
                              ? properties?.find(p => p.id === item.propertyId)?.name || "Property"
                              : warehouses?.find(w => w.id === item.warehouseId)?.name || "-"}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitCost ? formatCurrency(parseFloat(item.unitCost), "USD") : "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => handleEditItem(item)} data-testid={`button-edit-item-${item.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeletingItem(item)} data-testid={`button-delete-item-${item.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Organize items into hierarchical categories</CardDescription>
              </div>
              <Button onClick={() => { setEditingCategory(null); categoryForm.reset(); setIsCategoryFormOpen(true); }} data-testid="button-add-category">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading categories...</div>
              ) : !categoryTree?.length ? (
                <EmptyState
                  icon={FolderTree}
                  title="No categories"
                  description="Create categories to organize your inventory"
                  actionLabel="Add Category"
                  onAction={() => { setEditingCategory(null); categoryForm.reset(); setIsCategoryFormOpen(true); }}
                />
              ) : (
                <CategoryTree 
                  categories={categoryTree} 
                  onEdit={handleEditCategory} 
                  onDelete={(cat) => setDeletingCategory(cat)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Warehouse Locations</CardTitle>
                <CardDescription>Manage storage locations for inventory</CardDescription>
              </div>
              <Button onClick={() => { setEditingWarehouse(null); warehouseForm.reset(); setIsWarehouseFormOpen(true); }} data-testid="button-add-warehouse">
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            </CardHeader>
            <CardContent>
              {warehousesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading warehouses...</div>
              ) : !warehouses?.length ? (
                <EmptyState
                  icon={Warehouse}
                  title="No warehouses"
                  description="Add warehouse locations to store inventory"
                  actionLabel="Add Warehouse"
                  onAction={() => { setEditingWarehouse(null); warehouseForm.reset(); setIsWarehouseFormOpen(true); }}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {warehouses.map((wh) => (
                    <Card key={wh.id} className="relative" data-testid={`card-warehouse-${wh.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                            <CardTitle className="text-base">{wh.name}</CardTitle>
                          </div>
                          <Badge variant={wh.isActive === 1 ? "default" : "secondary"}>
                            {wh.isActive === 1 ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {wh.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {wh.address}
                          </div>
                        )}
                        {wh.description && (
                          <p className="text-sm text-muted-foreground">{wh.description}</p>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => handleEditWarehouse(wh)} data-testid={`button-edit-warehouse-${wh.id}`}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeletingWarehouse(wh)} data-testid={`button-delete-warehouse-${wh.id}`}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category details" : "Create a new inventory category"}
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit((data) => categoryMutation.mutate(data))} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Category name" data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Optional description" data-testid="input-category-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select
                      value={field.value?.toString() || "__none__"}
                      onValueChange={(val) => field.onChange(val === "__none__" ? null : parseInt(val))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-parent-category">
                          <SelectValue placeholder="No parent (root category)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No parent (root category)</SelectItem>
                        {categories?.filter(c => c.id !== editingCategory?.id).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="itemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Item Type</FormLabel>
                    <Select 
                      value={field.value || "__none__"} 
                      onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-item-type">
                          <SelectValue placeholder="Any type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Any type</SelectItem>
                        {ITEM_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCategoryFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={categoryMutation.isPending} data-testid="button-save-category">
                  {categoryMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isWarehouseFormOpen} onOpenChange={setIsWarehouseFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
            <DialogDescription>
              {editingWarehouse ? "Update warehouse details" : "Create a new warehouse location"}
            </DialogDescription>
          </DialogHeader>
          <Form {...warehouseForm}>
            <form onSubmit={warehouseForm.handleSubmit((data) => warehouseMutation.mutate(data))} className="space-y-4">
              <FormField
                control={warehouseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Warehouse name" data-testid="input-warehouse-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Warehouse address" data-testid="input-warehouse-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Optional description" data-testid="input-warehouse-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value.toString()} onValueChange={(val) => field.onChange(parseInt(val))}>
                      <FormControl>
                        <SelectTrigger data-testid="select-warehouse-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Active</SelectItem>
                        <SelectItem value="0">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsWarehouseFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={warehouseMutation.isPending} data-testid="button-save-warehouse">
                  {warehouseMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update item details" : "Create a new inventory item"}
            </DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit((data) => itemMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={itemForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Item name" data-testid="input-item-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ITEM_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={itemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Optional description" data-testid="input-item-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={itemForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SKU code" data-testid="input-item-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Serial #" data-testid="input-item-serial" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-item-quantity" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={itemForm.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0.00" data-testid="input-item-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ITEM_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value?.toString() || "__none__"}
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : parseInt(val))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-item-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No category</SelectItem>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
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
                  control={itemForm.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse</FormLabel>
                      <Select
                        value={field.value?.toString() || "__none__"}
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : parseInt(val))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-item-warehouse">
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No warehouse</SelectItem>
                          {warehouses?.map((wh) => (
                            <SelectItem key={wh.id} value={wh.id.toString()}>{wh.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        value={field.value?.toString() || "__none__"}
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : parseInt(val))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-item-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No property</SelectItem>
                          {properties?.map((prop) => (
                            <SelectItem key={prop.id} value={prop.id.toString()}>{prop.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={itemForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes" data-testid="input-item-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsItemFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={itemMutation.isPending} data-testid="button-save-item">
                  {itemMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This will also delete all child categories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingCategory && deleteCategoryMutation.mutate(deletingCategory.id)}
              data-testid="button-confirm-delete-category"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingWarehouse} onOpenChange={() => setDeletingWarehouse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingWarehouse?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingWarehouse && deleteWarehouseMutation.mutate(deletingWarehouse.id)}
              data-testid="button-confirm-delete-warehouse"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingItem && deleteItemMutation.mutate(deletingItem.id)}
              data-testid="button-confirm-delete-item"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
