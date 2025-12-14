import { EditRestPercentageDialog } from "./EditRestPercentageDialog";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";

interface CalculationItem {
  name: string;
  amount: number;
  percentage: number;
  commission: number;
  color?: string;
}

interface Calculations {
  breakdown: CalculationItem[];
  restAmount: number;
  restCommission: number;
  totalCommission: number;
}

interface CalculationBreakdownProps {
  calculations: Calculations;
  restPercentage: number;
  onUpdateRestPercentage: (value: number) => Promise<void>;
}

export const CalculationBreakdown = ({
  calculations,
  restPercentage,
  onUpdateRestPercentage,
}: CalculationBreakdownProps) => {
  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Desglose de Comisiones
        </h3>
        
        <div className="border rounded-lg bg-card overflow-hidden">
          {/* Listado de Productos Especiales */}
          {calculations.breakdown.map((item, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color || "#000" }} 
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">${formatNumber(item.amount)}</div>
                <div className="text-xs text-muted-foreground text-emerald-600 font-bold">
                  +${formatCurrency(item.commission)} ({item.percentage}%)
                </div>
              </div>
            </div>
          ))}

          {/* Sección del Resto */}
          <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-medium">Resto de Factura</span>
              <EditRestPercentageDialog 
                currentPercentage={restPercentage} 
                onSave={onUpdateRestPercentage} 
              />
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">${formatNumber(calculations.restAmount)}</div>
              <div className="text-xs text-muted-foreground text-emerald-600 font-bold">
                +${formatCurrency(calculations.restCommission)} ({restPercentage}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Totales */}
      <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
        <span className="text-emerald-900 dark:text-emerald-100 font-bold text-lg">Total Comisiones</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-black text-2xl">
          ${formatCurrency(calculations.totalCommission)}
        </span>
      </div>
    </div>
  );
};
