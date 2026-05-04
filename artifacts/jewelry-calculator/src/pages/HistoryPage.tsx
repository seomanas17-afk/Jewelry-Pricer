import { useGetPriceHistory, getGetPriceHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, Gem } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function HistoryPage() {
  const { data: historyData, isLoading } = useGetPriceHistory(
    { limit: 50 },
    { query: { queryKey: getGetPriceHistoryQueryKey({ limit: 50 }) } }
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Quote History</h1>
        <p className="text-muted-foreground mt-1">Log of your recently saved calculations.</p>
      </div>

      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center">
            <History className="w-5 h-5 mr-2 text-primary" />
            Calculation Log
          </CardTitle>
          <CardDescription>Showing your 50 most recent saved quotes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Metal Specs</TableHead>
                <TableHead>Diamond Details</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-2">Loading history...</p>
                  </TableCell>
                </TableRow>
              ) : historyData?.items && historyData.items.length > 0 ? (
                historyData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      <div className="font-medium">{new Date(item.timestamp).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{item.metalType}</Badge>
                          {item.purity !== 'standard' && <Badge variant="secondary">{item.purity}</Badge>}
                        </div>
                        <span className="text-sm font-medium">{item.metalWeight}g weight</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(item.centerDiamondWeight > 0 || item.sideDiamondWeight > 0) ? (
                        <div className="flex flex-col gap-1 text-sm">
                          {item.centerDiamondWeight > 0 && (
                            <div className="flex items-center text-primary font-medium">
                              <Gem className="w-3 h-3 mr-1" /> Center: {item.centerDiamondWeight}ct
                            </div>
                          )}
                          {item.sideDiamondWeight > 0 && (
                            <div className="flex items-center text-muted-foreground">
                              <Gem className="w-3 h-3 mr-1" /> Side: {item.sideDiamondWeight}ct
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-lg font-bold text-primary">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="max-w-xs mx-auto text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium text-lg mb-1">No History Found</p>
                      <p className="text-sm">You haven't saved any calculations yet. Use the toggle on the Calculator page to save quotes here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
