import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Calculator, DollarSign, Check, Package, CalendarIcon, FileText } from "lucide-react";
import { SaveInvoiceDialog } from "@/components/SaveInvoiceDialog";
import { EditRestPercentageDialog } from "@/components/EditRestPercentageDialog";
import { BreakdownTable } from "@/components/BreakdownTable";
import { ProductManager } from "@/components/ProductManager";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  percentage: number;
  color: string;
  is_default: boolean;
}

interface Breakdown {
  name: string;
  label: string;
  amount: number;
  percentage: number;
  commission: number;
  color: string;
}

interface Calculations {
  breakdown: Breakdown[];
  restAmount: number;
  restCommission: number;
  totalCommission: number;
}

interface CalculatorViewProps {
  products: Product[];
  productAmounts: Record<string, number>;
  totalInvoice: number;
  setTotalInvoice: (value: number) => void;
  calculations: Calculations;
  restPercentage: number;
  isLoading: boolean;
  onProductChange: (id: string, value: number) => void;
  onReset: () => void;
  onAddProduct: (name: string, percentage: number) => Promise<any>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  onDeleteProduct: (id: string) => void;
  onUpdateRestPercentage: (value: number) => Promise<boolean>;
  onSaveInvoice: (ncf: string, invoiceDate: string) => Promise<any>;
  suggestedNcf?: number | null;
}

export const CalculatorView = ({
  products,
  productAmounts,
  totalInvoice,
  setTotalInvoice,
  calculations,
  restPercentage,
  isLoading,
  onProductChange,
  onReset,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateRestPercentage,
  onSaveInvoice,
  suggestedNcf,
}: CalculatorViewProps) => {
  const [displayValue, setDisplayValue] = useState(totalInvoice > 0 ? formatNumber(totalInvoice) : '');
  const [productDisplayValues, setProductDisplayValues] = useState<Record<string, string>>({});

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw && !/^\d+$/.test(raw)) return;
    
    const numValue = parseInt(raw, 10) || 0;
    setTotalInvoice(numValue);
    
    if (numValue > 0) {
      setDisplayValue(formatNumber(numValue));
    } else {
      setDisplayValue('');
    }
  };

  const handleProductAmountChange = (id: string, value: string) => {
    const raw = value.replace(/,/g, '');
    if (raw && !/^\d+$/.test(raw)) return;
    
    const numValue = parseInt(raw, 10) || 0;
    onProductChange(id, numValue);
    
    if (numValue > 0) {
      setProductDisplayValues(prev => ({ ...prev, [id]: formatNumber(numValue) }));
    } else {
      setProductDisplayValues(prev => ({ ...prev, [id]: '' }));
    }
  };

  const handleReset = () => {
    setDisplayValue('');
    setProductDisplayValues({});
    onReset();
  };

  const hasResult = totalInvoice > 0;

  return (
    <div className="animate-fade-in">
      <div className={`grid gap-6 ${hasResult ? 'lg:grid-cols-2' : 'max-w-xl mx-auto'}`}>
        {/* Left Column - Calculator */}
        <Card className="overflow-hidden card-shadow hover-lift">
          {/* Header */}
          <div className="gradient-primary px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-primary-foreground">Calculadora de Comisiones</h1>
                <p className="text-primary-foreground/70 text-sm">Calcula tu ganancia rápidamente</p>
              </div>
            </div>
          </div>

          {/* Invoice Total Input */}
          <div className="p-5 border-b border-border">
            <label className="block text-sm font-medium text-foreground mb-2">
              Total de la factura
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground group-focus-within:text-primary transition-colors">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleTotalChange}
                className="w-full h-14 pl-9 pr-4 text-2xl font-bold text-foreground rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all hover:border-primary/50"
                placeholder="0"
              />
            </div>
            {hasResult && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5 animate-fade-in">
                <Check className="h-3.5 w-3.5 text-success" />
                Factura registrada
              </p>
            )}
          </div>

          {/* Products Section */}
          {hasResult && (
            <div className="border-b border-border">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-accent" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Productos con Comisión Variable</h3>
                </div>
                
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <ProductManager
                    products={products}
                    productAmounts={productAmounts}
                    productDisplayValues={productDisplayValues}
                    onProductChange={handleProductAmountChange}
                    onDeleteProduct={onDeleteProduct}
                    onUpdateProduct={onUpdateProduct}
                    onAddProduct={onAddProduct}
                  />
                )}
                
                {/* Rest info */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 text-sm mt-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {restPercentage}%
                    </span>
                    <span className="text-muted-foreground">Resto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">${formatNumber(calculations.restAmount)}</span>
                    <EditRestPercentageDialog 
                      currentValue={restPercentage} 
                      onUpdate={onUpdateRestPercentage} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Result Section - Mobile */}
          {hasResult && (
            <div className="p-5 gradient-success lg:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-success-foreground/80 mb-0.5">Tu comisión total</p>
                  <p className="text-3xl font-bold text-success-foreground animate-number">
                    ${formatCurrency(calculations.totalCommission)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success-foreground/20 flex items-center justify-center animate-pulse-soft">
                  <DollarSign className="h-6 w-6 text-success-foreground" />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Right Column - Breakdown Table */}
        {hasResult && (
          <div className="space-y-4">
            <BreakdownTable
              totalInvoice={totalInvoice}
              breakdown={calculations.breakdown}
              restAmount={calculations.restAmount}
              restPercentage={restPercentage}
              restCommission={calculations.restCommission}
              totalCommission={calculations.totalCommission}
            />
            
            {/* Actions */}
            <div className="flex gap-3 animate-slide-up">
              <SaveInvoiceDialog
                totalInvoice={totalInvoice}
                totalCommission={calculations.totalCommission}
                onSave={onSaveInvoice}
                disabled={totalInvoice === 0}
                suggestedNcf={suggestedNcf}
              />
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2 h-11 flex-1"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions - When no result yet */}
      {!hasResult && (
        <div className="max-w-xl mx-auto mt-4">
          <p className="text-center text-muted-foreground text-sm">
            Ingresa el total de la factura para calcular tu comisión
          </p>
        </div>
      )}
    </div>
  );
};
