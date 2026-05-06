import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCalculatePrice,
  useGetPriceHistory,
  useGetSettings,
  getGetPriceHistoryQueryKey,
  getGetSettingsQueryKey,
  CalculateResponse,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calculator, Save, RefreshCw, Gem, Activity, Cpu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const calculateSchema = z.object({
  goldWeight: z.coerce.number().min(0.001, "Gold weight required"),
  centerDiamondWeight: z.coerce.number().min(0, "Invalid"),
  sideDiamondWeight: z.coerce.number().min(0, "Invalid"),
  cadDesignCharges: z.boolean().default(false),
  saveToHistory: z.boolean().default(false),
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function BreakdownRow({
  label,
  value,
  sub,
  highlight,
  total,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  total?: boolean;
}) {
  if (total) {
    return (
      <tr className="border-t-2 border-primary/30">
        <td className="py-3 font-serif text-lg font-bold text-primary">{label}</td>
        <td className="py-3 text-right font-mono text-2xl font-bold text-primary">{value}</td>
      </tr>
    );
  }
  return (
    <tr className={`border-b border-border/40 ${highlight ? "bg-primary/5" : ""}`}>
      <td className="py-2.5 text-muted-foreground text-sm">
        {label}
        {sub && <span className="ml-1 text-xs opacity-60">{sub}</span>}
      </td>
      <td className="py-2.5 text-right font-mono font-medium text-sm">{value}</td>
    </tr>
  );
}

export default function CalculatorPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [result, setResult] = useState<CalculateResponse | null>(null);

  const calculateMutation = useCalculatePrice();

  const { data: historyData, isLoading: isLoadingHistory } = useGetPriceHistory(
    { limit: 5 },
    { query: { queryKey: getGetPriceHistoryQueryKey({ limit: 5 }) } }
  );

  const { data: settings } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const form = useForm<z.infer<typeof calculateSchema>>({
    resolver: zodResolver(calculateSchema),
    defaultValues: {
      goldWeight: 0,
      centerDiamondWeight: 0,
      sideDiamondWeight: 0,
      cadDesignCharges: false,
      saveToHistory: false,
    },
  });

  function onSubmit(values: z.infer<typeof calculateSchema>) {
    calculateMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setResult(data);
          if (values.saveToHistory) {
            queryClient.invalidateQueries({ queryKey: getGetPriceHistoryQueryKey() });
            toast({ title: "Saved", description: "Calculation saved to history." });
          }
        },
        onError: (error: any) => {
          toast({
            title: "Calculation Failed",
            description: error?.data?.error || "An error occurred during calculation.",
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleReset() {
    form.reset({ goldWeight: 0, centerDiamondWeight: 0, sideDiamondWeight: 0, cadDesignCharges: false, saveToHistory: false });
    setResult(null);
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Jewelry Pricing Terminal</h1>
        <p className="text-muted-foreground mt-1">Real-time gold jewelry valuation.</p>
      </div>

      {/* Current rates banner */}
      {settings && (
        <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-muted/40 border border-border/50 text-sm">
          <span className="text-muted-foreground">Active Rates:</span>
          <span className="font-mono font-medium">Gold {formatCurrency(0)}/g</span>
          <Separator orientation="vertical" className="h-4 self-center" />
          <span className="font-mono font-medium">Labour {formatCurrency(settings.labourChargePerGram)}/g</span>
          <Separator orientation="vertical" className="h-4 self-center" />
          <span className="font-mono font-medium">Diamond {formatCurrency(settings.diamondPricePerCarat)}/ct</span>
          <Separator orientation="vertical" className="h-4 self-center" />
          <span className="font-mono font-medium">Handling 5%</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-lg">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center text-lg">
                <Calculator className="w-5 h-5 mr-2 text-primary" />
                Input Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                  {/* Gold weight */}
                  <FormField
                    control={form.control}
                    name="goldWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Gold Weight
                          <Badge variant="outline" className="font-normal text-xs">grams</Badge>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              className="bg-background pl-10"
                              placeholder="0.000"
                              data-testid="input-gold-weight"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Diamond inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="centerDiamondWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 flex-wrap">
                            Center Diamond
                            <Badge variant="outline" className="font-normal text-xs">ct</Badge>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Gem className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                              <Input type="number" step="0.01" min="0" className="bg-background pl-10" placeholder="0.00" data-testid="input-center-diamond" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sideDiamondWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 flex-wrap">
                            Side Diamonds
                            <Badge variant="outline" className="font-normal text-xs">ct</Badge>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Gem className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input type="number" step="0.01" min="0" className="bg-background pl-10" placeholder="0.00" data-testid="input-side-diamond" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2 space-y-3 border-t">
                    {/* CAD Design Charges toggle */}
                    <FormField
                      control={form.control}
                      name="cadDesignCharges"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-primary" />
                              CAD Design Charges
                            </FormLabel>
                            <CardDescription className="text-xs">
                              Adds {settings ? formatCurrency(settings.cadDesignCharge) : "$80.00"} flat fee
                            </CardDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="toggle-cad" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Save to history toggle */}
                    <FormField
                      control={form.control}
                      name="saveToHistory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                          <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2">
                              <Save className="w-4 h-4 text-muted-foreground" />
                              Save to History
                            </FormLabel>
                            <CardDescription className="text-xs">Keep a record of this quote</CardDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="toggle-save-history" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={handleReset} className="w-1/3" data-testid="button-reset">
                      <RefreshCw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button
                      type="submit"
                      className="w-2/3 uppercase tracking-wider font-bold"
                      disabled={calculateMutation.isPending}
                      data-testid="button-calculate"
                    >
                      {calculateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Calculate Quote
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Quote breakdown */}
        <div className="lg:col-span-7">
          {result ? (
            <Card className="border-border shadow-xl bg-card flex flex-col relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-serif text-primary">Quote Breakdown</CardTitle>
                    <CardDescription>
                      {result.inputs.goldWeight}g Gold
                      {(result.inputs.centerDiamondWeight > 0 || result.inputs.sideDiamondWeight > 0) &&
                        ` · ${(result.inputs.centerDiamondWeight + result.inputs.sideDiamondWeight).toFixed(2)}ct diamonds`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="uppercase tracking-widest font-mono text-xs py-1">
                    Valid Today
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 text-left font-medium">Item</th>
                      <th className="pb-2 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <BreakdownRow
                      label="Gold Metal Value"
                      sub={`(${result.inputs.goldWeight}g × ${formatCurrency(result.goldPricePerGram)}/g)`}
                      value={formatCurrency(result.goldValue)}
                    />
                    {result.centerDiamondPrice > 0 && (
                      <BreakdownRow
                        label="Center Diamond"
                        sub={`(${result.inputs.centerDiamondWeight}ct × ${formatCurrency(result.diamondPricePerCarat)}/ct)`}
                        value={formatCurrency(result.centerDiamondPrice)}
                      />
                    )}
                    {result.sideDiamondPrice > 0 && (
                      <BreakdownRow
                        label="Side Diamonds"
                        sub={`(${result.inputs.sideDiamondWeight}ct × ${formatCurrency(result.diamondPricePerCarat)}/ct)`}
                        value={formatCurrency(result.sideDiamondPrice)}
                      />
                    )}
                    <BreakdownRow
                      label="Labour Cost"
                      sub={`(${result.inputs.goldWeight}g × ${formatCurrency(result.labourRatePerGram)}/g)`}
                      value={formatCurrency(result.labourCost)}
                    />
                    <tr className="border-b border-border/40 bg-muted/20">
                      <td className="py-2 text-sm font-semibold">Subtotal</td>
                      <td className="py-2 text-right font-mono font-semibold">{formatCurrency(result.subtotal)}</td>
                    </tr>
                    <BreakdownRow
                      label="Handling Charges (5%)"
                      value={formatCurrency(result.handlingCharge)}
                      highlight
                    />
                    {result.cadDesignCharge > 0 && (
                      <BreakdownRow
                        label="CAD Design Charges"
                        value={formatCurrency(result.cadDesignCharge)}
                        highlight
                      />
                    )}
                    <BreakdownRow label="Grand Total" value={formatCurrency(result.totalPrice)} total />
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-border shadow-none bg-muted/20 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <Calculator className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg">Awaiting Input</p>
              <p className="text-sm opacity-70">Enter specifications to generate a quote.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Recent quotes */}
      <div className="pt-4">
        <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center">
          <Save className="w-5 h-5 mr-2 text-primary" />
          Recent Quotes
        </h2>
        <Card className="border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Specs</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : historyData?.items && historyData.items.length > 0 ? (
                historyData.items.map((item) => (
                  <TableRow key={item.id} data-testid={`row-history-${item.id}`}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString()}{" "}
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">Gold</Badge>
                        <span className="text-sm font-medium">{item.metalWeight}g</span>
                        {(item.centerDiamondWeight > 0 || item.sideDiamondWeight > 0) && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-normal border-0">
                            <Gem className="w-3 h-3 mr-1 inline" />
                            {(Number(item.centerDiamondWeight) + Number(item.sideDiamondWeight)).toFixed(2)}ct
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No saved quotes yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
