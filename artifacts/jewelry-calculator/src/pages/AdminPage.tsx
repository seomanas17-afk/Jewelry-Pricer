import { useState } from "react";
import {
  useGetMetalPrices,
  getGetMetalPricesQueryKey,
  useUpdateMetalPrice,
  useGetHistoryStats,
  getGetHistoryStatsQueryKey,
  useGetSettings,
  useUpdateSetting,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, TrendingUp, BarChart3, Database, Wrench } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

const METAL_DISPLAY: Record<string, { label: string; badge: string; description: string }> = {
  gold:     { label: "Gold",     badge: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30", description: "Base price per gram (pure). Purity factor applied in calculator." },
  silver:   { label: "Silver",   badge: "bg-slate-400/10 text-slate-600 border-slate-400/30",   description: "Base price per gram (pure). Purity factor applied in calculator." },
  platinum: { label: "Platinum", badge: "bg-blue-400/10 text-blue-700 border-blue-400/30",       description: "Base price per gram (pure). Purity factor applied in calculator." },
};

function EditableRow({
  label,
  description,
  currentValue,
  unit,
  settingKey,
  onSaved,
  isPercent,
}: {
  label: string;
  description: string;
  currentValue: number;
  unit: string;
  settingKey: string;
  onSaved: () => void;
  isPercent?: boolean;
}) {
  const { toast } = useToast();
  const updateSettingMutation = useUpdateSetting();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const handleEdit = () => { setValue(currentValue.toString()); setEditing(true); };

  const handleSave = () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      toast({ title: "Invalid Value", description: "Enter a valid non-negative number.", variant: "destructive" });
      return;
    }
    updateSettingMutation.mutate(
      { key: settingKey, data: { value: num } },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: `${label} updated successfully.` });
          setEditing(false);
          onSaved();
        },
        onError: (error: any) => {
          toast({ title: "Update Failed", description: error?.data?.error || "Could not update.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <TableRow className="group">
      <TableCell>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-2 max-w-[180px]">
            {!isPercent && <span className="text-muted-foreground text-sm">$</span>}
            <Input
              type="number"
              step={isPercent ? "0.1" : "0.01"}
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 font-mono bg-background"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <span className="text-muted-foreground text-xs whitespace-nowrap">{unit}</span>
          </div>
        ) : (
          <span className="font-mono text-lg">
            {isPercent ? `${currentValue}%` : formatCurrency(currentValue)}
            <span className="text-xs text-muted-foreground ml-1">{unit}</span>
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={updateSettingMutation.isPending}>
              {updateSettingMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleEdit} className="opacity-0 group-hover:opacity-100 transition-opacity">
            Update
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: metalPrices, isLoading: isLoadingPrices } = useGetMetalPrices({
    query: { queryKey: getGetMetalPricesQueryKey() },
  });
  const { data: stats, isLoading: isLoadingStats } = useGetHistoryStats({
    query: { queryKey: getGetHistoryStatsQueryKey() },
  });
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const updatePriceMutation = useUpdateMetalPrice();
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");

  const handleEditPrice = (id: number, current: number) => {
    setEditingPriceId(id);
    setEditPriceValue(current.toString());
  };

  const handleSavePrice = (id: number, label: string) => {
    const num = parseFloat(editPriceValue);
    if (isNaN(num) || num <= 0) {
      toast({ title: "Invalid Price", description: "Enter a valid positive number.", variant: "destructive" });
      return;
    }
    updatePriceMutation.mutate(
      { id, data: { pricePerUnit: num } },
      {
        onSuccess: () => {
          toast({ title: "Price Updated", description: `${label} base price saved.` });
          queryClient.invalidateQueries({ queryKey: getGetMetalPricesQueryKey() });
          setEditingPriceId(null);
        },
        onError: (error: any) => {
          toast({ title: "Update Failed", description: error?.data?.error || "Could not update.", variant: "destructive" });
        },
      }
    );
  };

  const invalidateSettings = () => queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });

  // Only show the 'standard' entry for each metal (one row per metal)
  const standardPrices = ["gold", "silver", "platinum"]
    .map((metal) => metalPrices?.find((p) => p.metalType === metal && p.purity === "standard"))
    .filter(Boolean) as NonNullable<typeof metalPrices>[number][];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Admin Terminal</h1>
        <p className="text-muted-foreground mt-1">Manage pricing rates and view system metrics.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Quotes</p>
              <div className="text-3xl font-bold font-mono">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : stats?.totalCalculations ?? 0}
              </div>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Quote</p>
              <div className="text-3xl font-bold font-mono text-primary">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin" /> : formatCurrency(stats?.averagePrice ?? 0)}
              </div>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Top Metal</p>
              <div className="text-2xl font-bold capitalize">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.topMetalType ?? "N/A"}
              </div>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metal Prices — one row per metal */}
      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-primary" />
            Metal Price Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Metal</TableHead>
                <TableHead>Base Price / gram (pure)</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPrices ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : standardPrices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No metal prices configured.</TableCell>
                </TableRow>
              ) : (
                standardPrices.map((price) => {
                  const meta = METAL_DISPLAY[price.metalType] ?? { label: price.metalType, badge: "", description: "" };
                  return (
                    <TableRow key={price.id} className="group">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={`w-fit capitalize text-xs ${meta.badge}`}>
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{meta.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingPriceId === price.id ? (
                          <div className="flex items-center gap-2 max-w-[160px]">
                            <span className="text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              className="h-8 font-mono bg-background"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSavePrice(price.id, meta.label);
                                if (e.key === "Escape") setEditingPriceId(null);
                              }}
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-base">{formatCurrency(price.pricePerUnit)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(price.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingPriceId === price.id ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingPriceId(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => handleSavePrice(price.id, meta.label)} disabled={updatePriceMutation.isPending}>
                              {updatePriceMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleEditPrice(price.id, price.pricePerUnit)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Update Rate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charges Configuration */}
      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-primary" />
            Charges Configuration
          </CardTitle>
          <CardDescription>
            Set labour charges, diamond pricing, handling percentage, and CAD design fee. Changes take effect on next calculation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Charge Type</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSettings ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : settings ? (
                <>
                  <EditableRow
                    label="Labour Charge"
                    description="Applied per gram of metal"
                    currentValue={settings.labourChargePerGram}
                    unit="/g"
                    settingKey="labour_charge_per_gram"
                    onSaved={invalidateSettings}
                  />
                  <EditableRow
                    label="Diamond Price"
                    description="Applied per carat (center & side diamonds)"
                    currentValue={settings.diamondPricePerCarat}
                    unit="/ct"
                    settingKey="diamond_price_per_carat"
                    onSaved={invalidateSettings}
                  />
                  <EditableRow
                    label="Handling Charge"
                    description="Percentage applied on subtotal"
                    currentValue={settings.handlingChargePercent}
                    unit="%"
                    settingKey="handling_charge_percent"
                    onSaved={invalidateSettings}
                    isPercent
                  />
                  <EditableRow
                    label="CAD Design Charge"
                    description="Flat fee added when CAD toggle is enabled"
                    currentValue={settings.cadDesignCharge}
                    unit="flat"
                    settingKey="cad_design_charge"
                    onSaved={invalidateSettings}
                  />
                  <EditableRow
                    label="Metal Value Divisor"
                    description="Divides the raw metal value (weight × price × purity factor) — default 75"
                    currentValue={settings.metalValueDivisor}
                    unit="÷"
                    settingKey="metal_value_divisor"
                    onSaved={invalidateSettings}
                  />
                </>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground text-center">
        All rate changes are persisted immediately and reflected in new calculations.
      </p>
    </div>
  );
}
