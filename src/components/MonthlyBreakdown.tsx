import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Invoice } from '@/hooks/useInvoices';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Package, FileDown, Loader2, Pencil, Settings2, Save } from 'lucide-react';
import { generateBreakdownPdf } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import { EditInvoiceDialog } from '@/components/EditInvoiceDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MonthlyBreakdownProps {
  invoices: Invoice[];
  onUpdateInvoice?: (
    id: string,
    ncf: string,
    invoiceDate: string,
    totalAmount: number,
    restAmount: number,
    restPercentage: number,
    restCommission: number,
    totalCommission: number,
    products: { name: string; amount: number; percentage: number; commission: number }[]
  ) => Promise<any>;
  onDeleteInvoice?: (id: string) => Promise<boolean>;
  sellerName?: string;
}

interface ProductEntry {
  ncf: string;
  date: string;
  amount: number;
}

interface ProductBreakdown {
  name: string;
  percentage: number;
  entries: ProductEntry[];
  totalAmount: number;
  totalCommission: number;
}

const parseInvoiceDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  const date = new Date(dateString);
  date.setHours(12, 0, 0, 0);
  return date;
};

const getMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const MonthlyBreakdown = ({ invoices, onUpdateInvoice, onDeleteInvoice, sellerName }: MonthlyBreakdownProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return getMonthKey(now);
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Estado para la edición global de porcentaje
  const [editingProduct, setEditingProduct] = useState<{ name: string; currentPercentage: number } | null>(null);
  const [newPercentage, setNewPercentage] = useState<string>('');
  const [isUpdatingPercentage, setIsUpdatingPercentage] = useState(false);

  const months = useMemo(() => {
    const uniqueMonths = new Set<string>();
    const now = new Date();
    const currentYear = now.getFullYear();
    for (let m = 0; m < 12; m++) uniqueMonths.add(`${currentYear}-${String(m + 1).padStart(2, '0')}`);
    for (let m = 0; m < 12; m++) uniqueMonths.add(`${currentYear + 1}-${String(m + 1).padStart(2, '0')}`);
    invoices.forEach(inv => {
      const date = parseInvoiceDate(inv.invoice_date || inv.created_at);
      uniqueMonths.add(getMonthKey(date));
    });
    return Array.from(uniqueMonths).sort().reverse();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1, 15, 12, 0, 0));
    const end = endOfMonth(new Date(year, month - 1, 15, 12, 0, 0));
    return invoices.filter(inv => {
      const invDate = parseInvoiceDate(inv.invoice_date || inv.created_at);
      return isWithinInterval(invDate, { start, end });
    });
  }, [invoices, selectedMonth]);

  const productsBreakdown = useMemo(() => {
    const products: Record<string, ProductBreakdown> = {};
    filteredInvoices.forEach(invoice => {
      invoice.products?.forEach(product => {
        if (product.amount <= 0) return;
        const key = product.product_name;
        if (!products[key]) {
          products[key] = {
            name: product.product_name,
            percentage: product.percentage,
            entries: [],
            totalAmount: 0,
            totalCommission: 0,
          };
        }
        products[key].entries.push({
          ncf: invoice.ncf,
          date: invoice.invoice_date || invoice.created_at,
          amount: Number(product.amount),
        });
        products[key].totalAmount += Number(product.amount);
        products[key].totalCommission += Number(product.commission);
      });
    });
    return Object.values(products).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredInvoices]);

  const restBreakdown = useMemo(() => {
    const entries: ProductEntry[] = [];
    let totalAmount = 0;
    let totalCommission = 0;
    filteredInvoices.forEach(inv => {
      if (inv.rest_amount > 0) {
        entries.push({
          ncf: inv.ncf,
          date: inv.invoice_date || inv.created_at,
          amount: Number(inv.rest_amount),
        });
        totalAmount += Number(inv.rest_amount);
        totalCommission += Number(inv.rest_commission);
      }
    });
    return { entries, totalAmount, totalCommission };
  }, [filteredInvoices]);

  const grandTotalCommission = useMemo(() => {
    return productsBreakdown.reduce((sum, p) => sum + p.totalCommission, 0) + restBreakdown.totalCommission;
  }, [productsBreakdown, restBreakdown]);

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthLabel = format(new Date(year, month - 1, 15), "MMMM yyyy", { locale: es });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const isCurrentMonth = selectedMonth === getMonthKey(new Date());

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateBreakdownPdf({
        month: capitalizedMonth,
        products: productsBreakdown,
        rest: restBreakdown,
        grandTotal: grandTotalCommission,
      }, selectedMonth, sellerName);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- LÓGICA DE EDICIÓN GLOBAL ---
  const handleEditPercentage = (product: ProductBreakdown) => {
    setEditingProduct({ name: product.name, currentPercentage: product.percentage });
    setNewPercentage(product.percentage.toString());
  };

  const confirmPercentageUpdate = async () => {
    if (!editingProduct || !onUpdateInvoice) return;
    const percentage = parseFloat(newPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) return;

    setIsUpdatingPercentage(true);
    try {
      // Filtrar facturas que contienen este producto
      const affectedInvoices = filteredInvoices.filter(inv => 
        inv.products?.some(p => p.product_name === editingProduct.name)
      );

      let successCount = 0;

      // Actualizar cada factura
      for (const inv of affectedInvoices) {
        // 1. Recalcular productos
        const updatedProducts = (inv.products || []).map(p => {
          if (p.product_name === editingProduct.name) {
            const newCommission = Number(p.amount) * (percentage / 100);
            return { ...p, percentage: percentage, commission: newCommission };
          }
          return p;
        });

        // 2. Convertir al formato que espera onUpdate (name, amount, percentage, commission)
        const productsPayload = updatedProducts.map(p => ({
          name: p.product_name,
          amount: Number(p.amount),
          percentage: Number(p.percentage),
          commission: Number(p.commission)
        }));

        // 3. Recalcular totales de la factura
        const productsCommission = productsPayload.reduce((sum, p) => sum + p.commission, 0);
        const totalCommission = productsCommission + Number(inv.rest_commission); // La comisión del resto se mantiene igual

        // 4. Guardar
        await onUpdateInvoice(
          inv.id,
          inv.ncf,
          inv.invoice_date || inv.created_at, // Mantener fecha original
          Number(inv.total_amount),
          Number(inv.rest_amount),
          Number(inv.rest_percentage),
          Number(inv.rest_commission),
          totalCommission,
          productsPayload
        );
        successCount++;
      }

      toast.success(`Actualizado ${editingProduct.name} al ${percentage}% en ${successCount} facturas.`);
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al actualizar las facturas.");
    } finally {
      setIsUpdatingPercentage(false);
    }
  };

  if (invoices.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border-border">
        <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center animate-pulse-soft">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Sin datos</h3>
        <p className="text-sm text-muted-foreground">Guarda facturas para ver el desglose mensual</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-foreground">Desglose Mensual</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isCurrentMonth ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {capitalizedMonth}
              {isCurrentMonth && <span className="ml-1.5 text-xs">(Actual)</span>}
            </span>
          </div>
          <p className="text-muted-foreground">Resumen detallado por producto</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-56 bg-card border-border hover:bg-muted/50 transition-colors">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => {
                const [y, mo] = m.split('-').map(Number);
                const label = format(new Date(y, mo - 1, 15), 'MMMM yyyy', { locale: es });
                return (
                  <SelectItem key={m} value={m}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {filteredInvoices.length > 0 && (
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground">
              {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border">
          <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center"><Calendar className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold text-foreground mb-1">Sin facturas este mes</h3>
          <p className="text-sm text-muted-foreground">No hay facturas registradas para {capitalizedMonth}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {productsBreakdown.map((product, index) => (
              <Card key={product.name} className="overflow-hidden bg-card border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="px-5 py-4 bg-muted/30 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-foreground">{product.name}</h3>
                    
                    {/* Botón de Editar Porcentaje Global */}
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-bold">
                        {product.percentage}%
                        </span>
                        {onUpdateInvoice && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => handleEditPercentage(product)}
                                title="Editar porcentaje en este mes"
                            >
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {product.entries.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground font-medium font-mono text-xs">{entry.ncf}</span>
                          <span className="text-muted-foreground text-xs">{format(parseInvoiceDate(entry.date), 'd MMM yyyy', { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">${formatNumber(entry.amount)}</span>
                          {onUpdateInvoice && onDeleteInvoice && (
                            <EditInvoiceDialog
                              invoice={filteredInvoices.find(inv => inv.ncf === entry.ncf)!}
                              onUpdate={onUpdateInvoice}
                              onDelete={onDeleteInvoice}
                              trigger={<Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10"><Pencil className="h-3 w-3" /></Button>}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t-2 border-dashed border-border my-4" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-xl text-foreground">${formatNumber(product.totalAmount)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-success font-medium">Comisión ({product.percentage}%)</span>
                      <span className="font-bold text-2xl text-success">${formatCurrency(product.totalCommission)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {restBreakdown.totalAmount > 0 && (
              <Card className="overflow-hidden bg-card border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="px-5 py-4 bg-muted/50 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-foreground">Resto de Productos</h3>
                    <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-bold">25%</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {restBreakdown.entries.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground font-medium font-mono text-xs">{entry.ncf}</span>
                          <span className="text-muted-foreground text-xs">{format(parseInvoiceDate(entry.date), 'd MMM yyyy', { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">${formatNumber(entry.amount)}</span>
                          {onUpdateInvoice && onDeleteInvoice && (
                            <EditInvoiceDialog
                              invoice={filteredInvoices.find(inv => inv.ncf === entry.ncf)!}
                              onUpdate={onUpdateInvoice}
                              onDelete={onDeleteInvoice}
                              trigger={<Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10"><Pencil className="h-3 w-3" /></Button>}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t-2 border-dashed border-border my-4" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-xl text-foreground">${formatNumber(restBreakdown.totalAmount)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-success font-medium">Comisión (25%)</span>
                      <span className="font-bold text-2xl text-success">${formatCurrency(restBreakdown.totalCommission)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden bg-card border border-border shadow-md">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                {productsBreakdown.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <div className="px-5 py-3 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{product.name}</p>
                      <p className="font-bold text-lg text-foreground">${formatCurrency(product.totalCommission)}</p>
                    </div>
                    {(index < productsBreakdown.length - 1 || restBreakdown.totalAmount > 0) && <span className="text-3xl font-light text-muted-foreground">+</span>}
                  </div>
                ))}
                {restBreakdown.totalAmount > 0 && (
                  <div className="px-5 py-3 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Resto (25%)</p>
                    <p className="font-bold text-lg text-foreground">${formatCurrency(restBreakdown.totalCommission)}</p>
                  </div>
                )}
              </div>
              <div className="relative max-w-2xl mx-auto mb-8">
                <div className="border-t-2 border-border" />
                <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-4"><span className="text-muted-foreground font-bold text-lg">=</span></div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">Comisión Total — {capitalizedMonth}</p>
                <p className="text-5xl md:text-6xl font-bold text-success">${formatCurrency(grandTotalCommission)}</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* DIALOGO DE EDICIÓN DE PORCENTAJE GLOBAL */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Editar Porcentaje Global</DialogTitle>
                <DialogDescription>
                    Cambiar el porcentaje de <strong>{editingProduct?.name}</strong> en todas las facturas de {capitalizedMonth}.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="percent" className="text-right">
                        Porcentaje
                    </Label>
                    <div className="col-span-3 relative">
                        <Input
                            id="percent"
                            type="number"
                            value={newPercentage}
                            onChange={(e) => setNewPercentage(e.target.value)}
                            className="pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingProduct(null)} disabled={isUpdatingPercentage}>Cancelar</Button>
                <Button onClick={confirmPercentageUpdate} disabled={isUpdatingPercentage} className="gap-2">
                    {isUpdatingPercentage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};