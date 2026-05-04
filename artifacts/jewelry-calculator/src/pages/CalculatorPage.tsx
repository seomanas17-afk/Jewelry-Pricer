import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCalculatePrice, useGetPriceHistory, getGetPriceHistoryQueryKey } from "@workspace/api-client-react";
import { CalculateRequestMetalType, CalculateRequestPurity, CalculateResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calculator, Save, RefreshCw, Gem, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const calculateSchema = z.object({
  metalType: z.enum(["gold", "silver", "platinum"]),
  purity: z.enum(["10K", "14K", "18K", "standard"]),
  metalWeight: z.coerce.number().min(0.01, "Required"),
  centerDiamondWeight: z.coerce.number().min(0, "Invalid"),
  sideDiamondWeight: z.coerce.number().min(0, "Invalid"),
  saveToHistory: z.boolean().default(false),
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function CalculatorPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [result, setResult] = useState<CalculateResponse | null>(null);

  const calculateMutation = useCalculatePrice();

  const { data: historyData, isLoading: isLoadingHistory } = useGetPriceHistory(
    { limit: 5 },
    { query: { queryKey: getGetPriceHistoryQueryKey({ limit: 5 }) } }
  );

  const form = useForm<z.infer<typeof calculateSchema>>({
    resolver: zodResolver(calculateSchema),
    defaultValues: {
      metalType: "gold",
      purity: "14K",
      metalWeight: 0,
      centerDiamondWeight: 0,
      sideDiamondWeight: 0,
      saveToHistory: false,
    },
  });

  const selectedMetalType = form.watch("metalType");

  // Adjust purity options based on metal type
  useEffect(() => {
    if (selectedMetalType === "silver" || selectedMetalType === "platinum") {
      form.setValue("purity", "standard");
    } else if (selectedMetalType === "gold" && form.getValues("purity") === "standard") {
      form.setValue("purity", "14K");
    }
  }, [selectedMetalType, form]);

  function onSubmit(values: z.infer<typeof calculateSchema>) {
    calculateMutation.mutate(
      { data: values as any },
      {
        onSuccess: (data) => {
          setResult(data);
          if (values.saveToHistory) {
            queryClient.invalidateQueries({ queryKey: getGetPriceHistoryQueryKey() });
            toast({
              title: "Saved",
              description: "Calculation saved to history.",
            });
          }
        },
        onError: (error: any) => {
          toast({
            title: "Calculation Failed",
            description: error?.data?.error || "An error occurred during calculation.",
            variant: "destructive",
          });
        }
      }
    );
  }

  function handleReset() {
    form.reset({
      metalType: "gold",
      purity: "14K",
      metalWeight: 0,
      centerDiamondWeight: 0,
      sideDiamondWeight: 0,
      saveToHistory: false,
    });
    setResult(null);
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Jewelry Pricing Terminal</h1>
        <p className="text-muted-foreground mt-1">Real-time valuation based on current market rates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="metalType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metal</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select metal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="gold">Gold</SelectItem>
                              <SelectItem value="silver">Silver</SelectItem>
                              <SelectItem value="platinum">Platinum</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="purity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purity</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={selectedMetalType !== "gold"}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select purity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedMetalType === "gold" ? (
                                <>
                                  <SelectItem value="10K">10K</SelectItem>
                                  <SelectItem value="14K">14K</SelectItem>
                                  <SelectItem value="18K">18K</SelectItem>
                                </>
                              ) : (
                                <SelectItem value="standard">Standard</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="metalWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metal Weight (g)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" step="0.01" className="bg-background pl-10" {...field} />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="centerDiamondWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Center Diamond (ct)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.01" className="bg-background pl-10" {...field} />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Gem className="w-4 h-4 text-primary" />
                              </div>
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
                          <FormLabel>Side Diamonds (ct)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.01" className="bg-background pl-10" {...field} />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Gem className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 pb-2 border-t mt-4">
                    <FormField
                      control={form.control}
                      name="saveToHistory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                          <div className="space-y-0.5">
                            <FormLabel>Save to History</FormLabel>
                            <CardDescription>Keep a record of this quote</CardDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleReset}
                      className="w-1/3"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button 
                      type="submit" 
                      className="w-2/3 uppercase tracking-wider font-bold"
                      disabled={calculateMutation.isPending}
                    >
                      {calculateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Calculate Quote
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          {result ? (
            <Card className="border-border shadow-xl bg-card h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-primary"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-serif text-primary">Quote Breakdown</CardTitle>
                    <CardDescription>
                      {result.inputs.metalWeight}g {result.inputs.purity !== 'standard' ? result.inputs.purity : ''} {result.inputs.metalType}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="uppercase tracking-widest font-mono text-xs py-1">Valid Today</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Metal Value</span>
                    <span className="font-mono font-medium">{formatCurrency(result.metalPrice)}</span>
                  </div>
                  {result.centerDiamondPrice > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Center Diamond ({result.inputs.centerDiamondWeight}ct)</span>
                      <span className="font-mono font-medium">{formatCurrency(result.centerDiamondPrice)}</span>
                    </div>
                  )}
                  {result.sideDiamondPrice > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Side Diamonds ({result.inputs.sideDiamondWeight}ct)</span>
                      <span className="font-mono font-medium">{formatCurrency(result.sideDiamondPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Labour Cost</span>
                    <span className="font-mono font-medium">{formatCurrency(result.labourCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-medium">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(result.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-primary border-b border-border/50">
                    <span>Additional Charge (10%)</span>
                    <span className="font-mono">+{formatCurrency(result.additionalCharge)}</span>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-secondary text-secondary-foreground rounded-lg flex items-center justify-between">
                  <div className="font-serif text-lg text-primary">Total Quote</div>
                  <div className="text-3xl font-mono tracking-tight font-bold text-primary">{formatCurrency(result.totalPrice)}</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-border shadow-none bg-muted/20 h-full flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <Calculator className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg">Awaiting Input</p>
              <p className="text-sm opacity-70">Enter specifications to generate a quote.</p>
            </Card>
          )}
        </div>
      </div>

      <div className="pt-8">
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
                <TableHead className="text-right">Price</TableHead>
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
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{item.metalType}</Badge>
                        <span className="text-sm font-medium">{item.metalWeight}g</span>
                        {item.purity !== 'standard' && <span className="text-xs text-muted-foreground">({item.purity})</span>}
                        {(item.centerDiamondWeight > 0 || item.sideDiamondWeight > 0) && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-normal border-0">
                            <Gem className="w-3 h-3 mr-1 inline" /> 
                            {item.centerDiamondWeight + item.sideDiamondWeight}ct
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
                    No recent quotes found.
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
