import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/hooks/useInvoices';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, ArrowLeft, BarChart3, Target, Zap, Award } from 'lucide-react';

interface AdvancedStatisticsProps {
  invoices: Invoice[];
  onBack: () => void;
}

const parseInvoiceDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
};

interface MonthData {
  month: string;
  label: string;
  sales: number;
  commission: number;
  invoiceCount: number;
}

export const AdvancedStatistics = ({ invoices, onBack }: AdvancedStatisticsProps) => {
  // Calculate data for last 6 months
  const monthlyData = useMemo(() => {
    const data: MonthData[] = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = subMonths(now, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthInvoices = invoices.filter(inv => {
        const invDate = parseInvoiceDate(inv.invoice_date || inv.created_at);
        return isWithinInterval(invDate, { start, end });
      });
      
      data.push({
        month: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM', { locale: es }),
        sales: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
        commission: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0),
        invoiceCount: monthInvoices.length,
      });
    }
    
    return data.reverse();
  }, [invoices]);

  // Calculate comparisons
  const comparisons = useMemo(() => {
    const results: { label: string; month1: string; month2: string; change: number; type: 'increase' | 'decrease' | 'same' }[] = [];
    
    for (let i = 1; i < monthlyData.length; i++) {
      const current = monthlyData[i];
      const previous = monthlyData[i - 1];
      
      if (previous.commission > 0) {
        const change = ((current.commission - previous.commission) / previous.commission) * 100;
        results.push({
          label: `${previous.label} vs ${current.label}`,
          month1: previous.label,
          month2: current.label,
          change,
          type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'same',
        });
      }
    }
    
    return results;
  }, [monthlyData]);

  // Find best and worst months
  const bestMonth = useMemo(() => {
    return monthlyData.reduce((best, current) => 
      current.commission > best.commission ? current : best
    , monthlyData[0]);
  }, [monthlyData]);

  const worstMonth = useMemo(() => {
    const withData = monthlyData.filter(m => m.commission > 0);
    if (withData.length === 0) return null;
    return withData.reduce((worst, current) => 
      current.commission < worst.commission ? current : worst
    , withData[0]);
  }, [monthlyData]);

  // Calculate averages
  const averages = useMemo(() => {
    const monthsWithData = monthlyData.filter(m => m.invoiceCount > 0);
    if (monthsWithData.length === 0) return { avgCommission: 0, avgSales: 0, avgInvoices: 0 };
    
    return {
      avgCommission: monthsWithData.reduce((sum, m) => sum + m.commission, 0) / monthsWithData.length,
      avgSales: monthsWithData.reduce((sum, m) => sum + m.sales, 0) / monthsWithData.length,
      avgInvoices: monthsWithData.reduce((sum, m) => sum + m.invoiceCount, 0) / monthsWithData.length,
    };
  }, [monthlyData]);

  // Growth trend
  const growthTrend = useMemo(() => {
    if (monthlyData.length < 2) return 0;
    const first = monthlyData[0].commission;
    const last = monthlyData[monthlyData.length - 1].commission;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [monthlyData]);

  const maxCommission = Math.max(...monthlyData.map(m => m.commission), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Análisis Detallado</h2>
          <p className="text-sm text-muted-foreground">Comparación de los últimos 6 meses</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Promedio Mensual</span>
          </div>
          <p className="text-xl font-bold text-primary">${formatCurrency(averages.avgCommission)}</p>
        </Card>
        
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Award className="h-4 w-4 text-success" />
            </div>
            <span className="text-xs text-muted-foreground">Mejor Mes</span>
          </div>
          <p className="text-xl font-bold text-success">{bestMonth.label}</p>
          <p className="text-xs text-muted-foreground">${formatCurrency(bestMonth.commission)}</p>
        </Card>
        
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Fact. Promedio</span>
          </div>
          <p className="text-xl font-bold">{averages.avgInvoices.toFixed(0)}</p>
        </Card>
        
        <Card className="p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              growthTrend >= 0 ? 'bg-success/10' : 'bg-destructive/10'
            }`}>
              <Zap className={`h-4 w-4 ${growthTrend >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
            <span className="text-xs text-muted-foreground">Tendencia</span>
          </div>
          <p className={`text-xl font-bold ${growthTrend >= 0 ? 'text-success' : 'text-destructive'}`}>
            {growthTrend >= 0 ? '+' : ''}{growthTrend.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Visual Bar Chart */}
      <Card className="p-6 hover-lift">
        <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Comisiones por Mes
        </h3>
        <div className="space-y-4">
          {monthlyData.map((month, index) => {
            const barWidth = (month.commission / maxCommission) * 100;
            const isCurrentMonth = index === monthlyData.length - 1;
            
            return (
              <div key={month.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${isCurrentMonth ? 'text-primary' : 'text-foreground'}`}>
                    {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                    {isCurrentMonth && <span className="ml-2 text-xs text-primary">(Actual)</span>}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{month.invoiceCount} fact.</span>
                    <span className="font-bold text-success">${formatCurrency(month.commission)}</span>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      isCurrentMonth ? 'gradient-primary' : 'bg-muted-foreground/40'
                    }`}
                    style={{ width: `${barWidth}%`, animationDelay: `${index * 100}ms` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Month-to-Month Comparisons */}
      <Card className="p-6 hover-lift">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Comparación Mes a Mes
        </h3>
        <div className="space-y-3">
          {comparisons.map((comp, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground capitalize">{comp.month1}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-medium text-foreground capitalize">{comp.month2}</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                comp.type === 'increase' 
                  ? 'bg-success/10 text-success' 
                  : comp.type === 'decrease'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {comp.type === 'increase' && <TrendingUp className="h-4 w-4" />}
                {comp.type === 'decrease' && <TrendingDown className="h-4 w-4" />}
                {comp.type === 'same' && <Minus className="h-4 w-4" />}
                {comp.change >= 0 ? '+' : ''}{comp.change.toFixed(1)}%
              </div>
            </div>
          ))}
          
          {comparisons.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No hay suficientes datos para comparar
            </p>
          )}
        </div>
      </Card>

      {/* Summary Table */}
      <Card className="overflow-hidden hover-lift">
        <div className="p-4 bg-muted/30 border-b border-border">
          <h3 className="font-semibold text-foreground">Resumen Detallado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Mes</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Facturas</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Ventas</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((month, index) => (
                <tr 
                  key={month.month}
                  className={`border-b border-border/50 ${index === monthlyData.length - 1 ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-4 py-3 text-sm font-medium capitalize">
                    {month.label}
                    {index === monthlyData.length - 1 && (
                      <span className="ml-2 text-xs text-primary">(Actual)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">{month.invoiceCount}</td>
                  <td className="px-4 py-3 text-sm text-right">${formatNumber(month.sales)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-success">${formatCurrency(month.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};