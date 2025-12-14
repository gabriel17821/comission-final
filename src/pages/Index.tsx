import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, History, BarChart3, Layers, Calendar, User } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { useSellers } from "@/hooks/useSellers";
import { CalculatorView } from "@/components/CalculatorView";
import { InvoiceHistory } from "@/components/InvoiceHistory";
import { Statistics } from "@/components/Statistics";
import { MonthlyBreakdown } from "@/components/MonthlyBreakdown";
import { SellerManager } from "@/components/SellerManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { LastInvoiceNotification } from "@/components/LastInvoiceNotification"; // <--- IMPORTANTE

const Index = () => {
  const { products, loading: productsLoading, addProduct, updateProduct, deleteProduct } = useProducts();
  const { restPercentage, loading: settingsLoading, updateRestPercentage, getNextNcfNumber, updateLastNcfNumber } = useSettings();
  const { invoices, loading: invoicesLoading, saveInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { sellers, activeSeller, loading: sellersLoading, addSeller, updateSeller, deleteSeller, selectSeller } = useSellers();

  const [totalInvoice, setTotalInvoice] = useState(0);
  const [productAmounts, setProductAmounts] = useState<Record<string, number>>({});
  
  // --- Estados de Notificación / Preview ---
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [lastInvoiceNotification, setLastInvoiceNotification] = useState<Invoice | null>(null);

  useEffect(() => {
    if (products.length > 0) {
      const initialAmounts: Record<string, number> = {};
      products.forEach(p => {
        if (!(p.id in productAmounts)) {
          initialAmounts[p.id] = 0;
        }
      });
      if (Object.keys(initialAmounts).length > 0) {
        setProductAmounts(prev => ({ ...prev, ...initialAmounts }));
      }
    }
  }, [products]);

  const calculations = useMemo(() => {
    const breakdown = products.map((product) => ({
      name: product.name,
      label: product.name,
      amount: productAmounts[product.id] || 0,
      percentage: product.percentage,
      commission: (productAmounts[product.id] || 0) * (product.percentage / 100),
      color: product.color,
    }));

    const specialProductsTotal = Object.values(productAmounts).reduce(
      (sum, amount) => sum + amount,
      0
    );

    const restAmount = Math.max(0, totalInvoice - specialProductsTotal);
    const restCommission = restAmount * (restPercentage / 100);

    const totalCommission =
      breakdown.reduce((sum, item) => sum + item.commission, 0) + restCommission;

    return {
      breakdown,
      restAmount,
      restCommission,
      totalCommission,
    };
  }, [totalInvoice, productAmounts, products, restPercentage]);

  const handleReset = () => {
    setTotalInvoice(0);
    const resetAmounts: Record<string, number> = {};
    products.forEach(p => {
      resetAmounts[p.id] = 0;
    });
    setProductAmounts(resetAmounts);
  };

  const handleProductChange = (id: string, value: number) => {
    setProductAmounts((prev) => ({ ...prev, [id]: value }));
  };

const handleSaveInvoice = async (ncf: string, invoiceDate: string, clientId?: string) => {
    
    // ... (el código de calculations sigue igual) ...
    const productBreakdown = calculations.breakdown.map(b => ({
      name: b.name,
      amount: b.amount,
      percentage: b.percentage,
      commission: b.commission,
    }));

    const result = await saveInvoice(
      ncf,
      invoiceDate,
      totalInvoice,
      calculations.restAmount,
      restPercentage,
      calculations.restCommission,
      calculations.totalCommission,
      productBreakdown,
      activeSeller?.id,
      clientId // <--- AQUÍ PASAMOS EL CLIENTE QUE VIENE DE LA VISTA
    );

    if (result) {
      const ncfNumber = parseInt(ncf.slice(-4), 10);
      if (!isNaN(ncfNumber)) {
        await updateLastNcfNumber(ncfNumber);
      }
      
      setLastInvoiceNotification(result); // La notificación ahora recibirá el objeto completo :)
      handleReset();
    }

    return result;
  };

  const suggestedNcf = getNextNcfNumber();
  const isLoading = productsLoading || settingsLoading;

  const filteredInvoices = useMemo(() => {
    if (!activeSeller) return invoices;
    return invoices.filter(inv => inv.seller_id === activeSeller.id);
  }, [invoices, activeSeller]);

  // Helper para renderizar el contenido del diálogo de factura (Preview manual)
  const renderInvoiceDialogContent = (invoice: Invoice) => (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Fecha
          </span>
          <div className="font-medium">
            {format(new Date(invoice.invoice_date || invoice.created_at), "d MMMM yyyy", { locale: es })}
          </div>
        </div>
        {sellers.find(s => s.id === invoice.seller_id) && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Vendedor
            </span>
            <div className="font-medium truncate">
              {sellers.find(s => s.id === invoice.seller_id)?.name}
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/30 p-4 rounded-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Monto Total</span>
          <span className="text-lg font-bold">${formatNumber(invoice.total_amount)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center text-primary">
          <span className="text-sm font-medium">Comisión Generada</span>
          <span className="text-xl font-bold">${formatCurrency(invoice.total_commission)}</span>
        </div>
      </div>
      {/* ... Detalle de productos omitido aquí por brevedad, se usa el componente ... */}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Calculadora de Comisiones
                </h1>
                <p className="text-sm text-muted-foreground">
                  Tu herramienta para calcular ganancias
                </p>
              </div>
            </div>
            
            <SellerManager
              sellers={sellers}
              activeSeller={activeSeller}
              onSelectSeller={selectSeller}
              onAddSeller={addSeller}
              onUpdateSeller={updateSeller}
              onDeleteSeller={deleteSeller}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Tabs defaultValue="calculator" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 h-14 p-1.5 bg-muted rounded-xl">
            <TabsTrigger value="calculator" className="gap-2 text-base rounded-lg"><Calculator className="h-5 w-5"/><span className="hidden sm:inline">Calculadora</span></TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-base rounded-lg"><History className="h-5 w-5"/><span className="hidden sm:inline">Historial</span></TabsTrigger>
            <TabsTrigger value="breakdown" className="gap-2 text-base rounded-lg"><Layers className="h-5 w-5"/><span className="hidden sm:inline">Desglose</span></TabsTrigger>
            <TabsTrigger value="statistics" className="gap-2 text-base rounded-lg"><BarChart3 className="h-5 w-5"/><span className="hidden sm:inline">Estadísticas</span></TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="mt-8">
            <CalculatorView
              products={products}
              productAmounts={productAmounts}
              totalInvoice={totalInvoice}
              setTotalInvoice={setTotalInvoice}
              calculations={calculations}
              restPercentage={restPercentage}
              isLoading={isLoading}
              onProductChange={handleProductChange}
              onReset={handleReset}
              onAddProduct={addProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              onUpdateRestPercentage={updateRestPercentage}
              onSaveInvoice={handleSaveInvoice}
              suggestedNcf={suggestedNcf}
              activeSeller={activeSeller}
            />
          </TabsContent>

          <TabsContent value="history">
            <InvoiceHistory invoices={filteredInvoices} loading={invoicesLoading} onDelete={deleteInvoice} onUpdate={updateInvoice} />
          </TabsContent>

          <TabsContent value="breakdown">
            <MonthlyBreakdown invoices={filteredInvoices} onUpdateInvoice={updateInvoice} onDeleteInvoice={deleteInvoice} sellerName={activeSeller?.name} />
          </TabsContent>

          <TabsContent value="statistics">
            <Statistics invoices={filteredInvoices} sellerName={activeSeller?.name} onPreviewInvoice={setPreviewInvoice} />
          </TabsContent>
        </Tabs>
      </main>

      {/* --- ESTO ES LO QUE TE FALTABA AL FINAL --- */}
      
      {/* 1. Diálogo para previsualizar facturas desde estadísticas */}
      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-primary">
                {previewInvoice?.ncf}
              </span>
            </DialogTitle>
          </DialogHeader>
          {previewInvoice && renderInvoiceDialogContent(previewInvoice)}
        </DialogContent>
      </Dialog>

      {/* 2. Componente de notificación al guardar */}
      <LastInvoiceNotification 
        invoice={lastInvoiceNotification} 
        onClose={() => setLastInvoiceNotification(null)}
        sellers={sellers}
      />
      
    </div>
  );
};

export default Index;
