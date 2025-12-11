import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, CalendarIcon, Save, Trash2, Plus, X } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Invoice } from '@/hooks/useInvoices';
import { useProducts } from '@/hooks/useProducts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditInvoiceDialogProps {
  invoice: Invoice;
  onUpdate: (
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
  onDelete: (id: string) => Promise<boolean>;
  trigger?: React.ReactNode;
}

const parseInvoiceDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
};

export const EditInvoiceDialog = ({ invoice, onUpdate, onDelete, trigger }: EditInvoiceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const [ncfSuffix, setNcfSuffix] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [totalAmount, setTotalAmount] = useState(0);
  const [products, setProducts] = useState<{ name: string; amount: number; percentage: number; commission: number }[]>([]);
  const [restPercentage] = useState(invoice.rest_percentage || 25);
  
  // Obtenemos todos los productos del catálogo para poder agregarlos
  const { products: allProducts } = useProducts();

  const ncfPrefix = 'B01000';

  useEffect(() => {
    if (open) {
      // Extract last 4 digits from NCF
      const suffix = invoice.ncf.length >= 4 ? invoice.ncf.slice(-4) : invoice.ncf;
      setNcfSuffix(suffix);
      setInvoiceDate(parseInvoiceDate(invoice.invoice_date || invoice.created_at));
      setTotalAmount(invoice.total_amount);
      
      // Load products
      const prods = invoice.products?.map(p => ({
        name: p.product_name,
        amount: p.amount,
        percentage: p.percentage,
        commission: p.commission,
      })) || [];
      setProducts(prods);
      setDeleteConfirm(false);
    }
  }, [open, invoice]);

  const handleProductAmountChange = (index: number, value: string) => {
    const numValue = parseInt(value.replace(/,/g, ''), 10) || 0;
    const newProducts = [...products];
    newProducts[index].amount = numValue;
    newProducts[index].commission = numValue * (newProducts[index].percentage / 100);
    setProducts(newProducts);
  };

  const handleAddProduct = (productName: string) => {
    const catalogProduct = allProducts.find(p => p.name === productName);
    if (catalogProduct) {
      setProducts([...products, {
        name: catalogProduct.name,
        amount: 0,
        percentage: catalogProduct.percentage,
        commission: 0
      }]);
    }
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ncfSuffix.length !== 4) return;
    
    setLoading(true);
    
    const fullNcf = `${ncfPrefix}${ncfSuffix.padStart(4, '0')}`;
    const productsTotal = products.reduce((sum, p) => sum + p.amount, 0);
    const productsCommission = products.reduce((sum, p) => sum + p.commission, 0);
    const restAmount = totalAmount - productsTotal;
    const restCommission = restAmount * (restPercentage / 100);
    const totalCommission = productsCommission + restCommission;
    
    const result = await onUpdate(
      invoice.id,
      fullNcf,
      format(invoiceDate, 'yyyy-MM-dd'),
      totalAmount,
      restAmount,
      restPercentage,
      restCommission,
      totalCommission,
      products
    );
    
    setLoading(false);
    if (result) {
      setOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    setLoading(true);
    const result = await onDelete(invoice.id);
    setLoading(false);
    if (result) {
      setOpen(false);
    }
  };

  // Filtrar productos que ya están en la factura para no duplicarlos en el selector
  const availableProducts = allProducts.filter(
    p => !products.some(current => current.name === p.name)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Factura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-base">Fecha de la Factura</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !invoiceDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {invoiceDate ? format(invoiceDate, "d 'de' MMMM, yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={invoiceDate}
                  onSelect={(date) => date && setInvoiceDate(date)}
                  initialFocus
                  locale={es}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* NCF Input */}
          <div className="space-y-2">
            <Label htmlFor="ncf" className="text-base">NCF (últimos 4 dígitos)</Label>
            <div className="flex items-center rounded-lg border border-border bg-muted/30 overflow-hidden">
              <span className="px-3 py-3 text-lg font-mono font-medium text-muted-foreground bg-muted border-r border-border">
                {ncfPrefix}
              </span>
              <Input
                id="ncf"
                value={ncfSuffix}
                onChange={(e) => setNcfSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                className="border-0 text-lg font-mono font-bold text-center focus-visible:ring-0"
                maxLength={4}
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {/* Total Amount */}
          <div className="space-y-2">
            <Label className="text-base">Total Factura</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">
                $
              </span>
              <Input
                type="text"
                inputMode="numeric"
                value={totalAmount > 0 ? formatNumber(totalAmount) : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '');
                  setTotalAmount(parseInt(raw, 10) || 0);
                }}
                className="h-14 pl-9 text-2xl font-bold"
                placeholder="0"
              />
            </div>
          </div>

          {/* Products List */}
          <div className="space-y-3">
            <Label className="text-base flex justify-between items-center">
              Productos Variables
              <span className="text-xs font-normal text-muted-foreground">
                {products.length} agregado(s)
              </span>
            </Label>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {products.map((product, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                        {product.percentage}%
                      </span>
                      <span className="text-sm font-medium truncate" title={product.name}>
                        {product.name}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={product.amount > 0 ? formatNumber(product.amount) : ''}
                        onChange={(e) => handleProductAmountChange(index, e.target.value)}
                        className="h-8 pl-5 text-sm text-right font-medium bg-background"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleRemoveProduct(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {products.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
                  No hay productos variables
                </div>
              )}
            </div>

            {/* Add Product Selector */}
            {availableProducts.length > 0 && (
              <div className="pt-2">
                 <Select onValueChange={handleAddProduct}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Agregar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-8 text-center bg-muted rounded">
                            {p.percentage}%
                          </span>
                          <span>{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant={deleteConfirm ? "destructive" : "outline"}
              onClick={handleDelete}
              disabled={loading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleteConfirm ? 'Confirmar' : 'Eliminar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || ncfSuffix.length !== 4}
              className="flex-1 gap-2 gradient-primary"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
