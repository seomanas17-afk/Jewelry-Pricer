import { useState } from "react";
import { useGetMetalPrices, getGetMetalPricesQueryKey, useUpdateMetalPrice, useGetHistoryStats, getGetHistoryStatsQueryKey } from "@workspace/api-client-react";
import { MetalPrice } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, TrendingUp, BarChart3, Database } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: metalPrices, isLoading: isLoadingPrices } = useGetMetalPrices({
    query: { queryKey: getGetMetalPricesQueryKey() }
  });

  const { data: stats, isLoading: isLoadingStats } = useGetHistoryStats({
    query: { queryKey: getGetHistoryStatsQueryKey() }
  });

  const updatePriceMutation = useUpdateMetalPrice();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEdit = (price: MetalPrice) => {
    setEditingId(price.id);
    setEditValue(price.pricePerUnit.toString());
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = (id: number) => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid positive number.",
        variant: "destructive"
      });
      return;
    }

    updatePriceMutation.mutate(
      { id, data: { pricePerUnit: numValue } },
      {
        onSuccess: () => {
          toast({ title: "Price Updated", description: "Market rate saved successfully." });
          queryClient.invalidateQueries({ queryKey: getGetMetalPricesQueryKey() });
          setEditingId(null);
        },
        onError: (error: any) => {
          toast({
            title: "Update Failed",
            description: error?.data?.error || "Could not update price.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Admin Terminal</h1>
        <p className="text-muted-foreground mt-1">Manage market rates and view system metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Quotes</p>
              <div className="text-3xl font-bold font-mono">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : stats?.totalCalculations || 0}
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
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Quote Value</p>
              <div className="text-3xl font-bold font-mono text-primary">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : formatCurrency(stats?.averagePrice || 0)}
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
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : stats?.topMetalType || 'N/A'}
              </div>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-primary" />
            Market Rates Configuration
          </CardTitle>
          <CardDescription>Update base metal prices per gram. Changes take effect immediately.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[150px]">Metal</TableHead>
                <TableHead>Purity</TableHead>
                <TableHead>Current Rate (/g)</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPrices ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-2">Loading market rates...</p>
                  </TableCell>
                </TableRow>
              ) : metalPrices?.map((price) => (
                <TableRow key={price.id} className="group">
                  <TableCell className="font-medium capitalize">{price.metalType}</TableCell>
                  <TableCell>
                    <Badge variant={price.purity === 'standard' ? "secondary" : "outline"}>
                      {price.purity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingId === price.id ? (
                      <div className="flex items-center max-w-[150px]">
                        <span className="text-muted-foreground mr-2">$</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={editValue} 
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 font-mono bg-background"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(price.id);
                            if (e.key === 'Escape') handleCancel();
                          }}
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-lg">{formatCurrency(price.pricePerUnit)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(price.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === price.id ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleSave(price.id)}
                          disabled={updatePriceMutation.isPending}
                        >
                          {updatePriceMutation.isPending && updatePriceMutation.variables?.id === price.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(price)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Update Rate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
