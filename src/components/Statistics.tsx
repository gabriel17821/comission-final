import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Receipt, Calendar, ChevronLeft, ChevronRight, FileText, ArrowUpRight, ArrowDownRight, Minus, Filter, CalendarDays } from 'lucide-react';
import { Invoice } from '@/hooks/useInvoices';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths, isSameMonth, startOfYear, endOfYear, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { generateMonthlyPDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StatisticsProps {
  invoices: Invoice[];
  sellerName?: string;
}

// Helper function to parse dates correctly without timezone issues
const parseInvoiceDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
};

export const Statistics = ({ invoices, sellerName }: StatisticsProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  // Get all available years from invoices
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Add current year and a few years back
    for (let i = 0; i <= 5; i++) {
      years.add(currentYear - i);
    }
    
    // Add years from invoices
    invoices.forEach(inv => {
      const date = parseInvoiceDate(inv.invoice_date || inv.created_at);
      years.add(getYear(date));
    });
    
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Get all months with data for selected year
  const monthsInYear = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const date = new Date(selectedYear, m, 1);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthInvoices = invoices.filter(inv => {
        const invDate = parseInvoiceDate(inv.invoice_date || inv.created_at);
        return isWithinInterval(invDate, { start, end });
      });
      
      months.push({
        date,
        month: m,
        year: selectedYear,
        label: format(date, 'MMMM', { locale: es }),
        shortLabel: format(date, 'MMM', { locale: es }),
        invoiceCount: monthInvoices.length,
        totalSales: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
        totalCommission: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0),
      });
    }
    return months;
  }, [invoices, selectedYear]);

  // Stats for selected month
  const selectedMonthStats = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    
    const monthInvoices = invoices.filter(inv => {
      const date = parseInvoiceDate(inv.invoice_date || inv.created_at);
      return isWithinInterval(date, { start, end });
    });

    return {
      totalSales: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
      totalCommission: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0),
      invoiceCount: monthInvoices.length,
      invoices: monthInvoices,
      avgPerInvoice: monthInvoices.length > 0 
        ? monthInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0) / monthInvoices.length
        : 0,
    };
  }, [invoices, selectedDate]);

  // Year stats
  const yearStats = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));
    
    const yearInvoices = invoices.filter(inv => {
      const date = parseInvoiceDate(inv.invoice_date || inv.created_at);
      return isWithinInterval(date, { start, end });
    });

    return {
      totalSales: yearInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
      totalCommission: yearInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0),
      invoiceCount: yearInvoices.length,
      avgPerMonth: yearInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0) / 12,
    };
  }, [invoices, selectedYear]);

  // Previous month/year stats for comparison
  const previousMonthStats = useMemo(() => {
    const prevDate = subMonths(selectedDate, 1);
    const start = startOfMonth(prevDate);
    const end = endOfMonth(prevDate);
    
    const monthInvoices = invoices.filter(inv => {
      const date = parseInvoiceDate(inv.invoice_date || inv.created_at);
      return isWithinInterval(date, { start, end });
    });

    return {
      totalSales: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
      totalCommission: monthInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0),
      invoiceCount: monthInvoices.length,
    };
  }, [invoices, selectedDate]);

  const previousYearStats = useMemo(() => {
    const start = startOfYear(new Date(selectedYear - 1, 0, 1));
    const end = endOfYear(new Date(selectedYear - 1, 0, 1));
    
    const yearInvoices = invoices.filter(inv => {
      const date = parseInvoiceDate(inv.invoice_date || inv.created_at);
      return isWithinInterval(date, { start, end });
    });

    return {
      totalSales: yearInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
      totalCommission: yearInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0),
      invoiceCount: yearInvoices.length,
    };
  }, [invoices, selectedYear]);

  const salesChange = previousMonthStats.totalSales > 0 
    ? ((selectedMonthStats.totalSales - previousMonthStats.totalSales) / previousMonthStats.totalSales) * 100 
    : 0;
  
  const commissionChange = previousMonthStats.totalCommission > 0 
    ? ((selectedMonthStats.totalCommission - previousMonthStats.totalCommission) / previousMonthStats.totalCommission) * 100 
    : 0;

  const invoiceCountChange = previousMonthStats.invoiceCount > 0
    ? ((selectedMonthStats.invoiceCount - previousMonthStats.invoiceCount) / previousMonthStats.invoiceCount) * 100
    : 0;

  const yearSalesChange = previousYearStats.totalSales > 0 
    ? ((yearStats.totalSales - previousYearStats.totalSales) / previousYearStats.totalSales) * 100 
    : 0;

  const yearCommissionChange = previousYearStats.totalCommission > 0 
    ? ((yearStats.totalCommission - previousYearStats.totalCommission) / previousYearStats.totalCommission) * 100 
    : 0;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const monthLabel = format(selectedDate, "MMMM yyyy", { locale: es });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const prevMonthLabel = format(subMonths(selectedDate, 1), "MMMM", { locale: es });

  const getChangeIndicator = (change: number) => {
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    if (isNeutral) {
      return {
        icon: Minus,
        color: 'text-muted-foreground',
        bg: 'bg-muted',
        label: 'Sin cambio'
      };
    }
    
    return {
      icon: isPositive ? ArrowUpRight : ArrowDownRight,
      color: isPositive ? 'text-success' : 'text-destructive',
      bg: isPositive ? 'bg-success/10' : 'bg-destructive/10',
      label: isPositive ? 'Incremento' : 'Decremento'
    };
  };

  const maxCommission = Math.max(...monthsInYear.map(m => m.totalCommission), 1);

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'month' | 'year')}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="grid grid-cols-2 w-48">
              <TabsTrigger value="month" className="gap-2">
                <Calendar className="h-4 w-4" />
                Mes
              </TabsTrigger>
              <TabsTrigger value="year" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Año
              </TabsTrigger>
            </TabsList>

            {/* Year Selector */}
            <Select value={String(selectedYear)} onValueChange={(v) => {
              setSelectedYear(Number(v));
              setSelectedDate(new Date(Number(v), selectedDate.getMonth(), 1));
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monthly View */}
          <TabsContent value="month" className="space-y-6 mt-6">
            {/* Month Navigation */}
            <Card className="p-4 hover-lift">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                  className="h-10 w-10 hover:bg-primary/10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold text-foreground">{capitalizedMonth}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                  disabled={isSameMonth(selectedDate, new Date())}
                  className="h-10 w-10 hover:bg-primary/10"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </Card>

            {/* Month Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {monthsInYear.map((month, index) => {
                const isSelected = isSameMonth(month.date, selectedDate);
                const hasData = month.invoiceCount > 0;
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(month.date)}
                    className={`month-pill whitespace-nowrap hover-lift flex flex-col items-center min-w-16 ${isSelected ? 'active' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <span>{month.shortLabel.charAt(0).toUpperCase() + month.shortLabel.slice(1)}</span>
                    {hasData && (
                      <span className="text-[10px] opacity-70">{month.invoiceCount} fact.</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Sales Card */}
              <Card className="p-5 space-y-3 stat-card hover-lift hover-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">Ventas</span>
                  </div>
                </div>
                <p className="text-3xl font-bold animate-count-up">${formatNumber(selectedMonthStats.totalSales)}</p>
                {previousMonthStats.totalSales > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help ${getChangeIndicator(salesChange).bg} ${getChangeIndicator(salesChange).color}`}>
                        {(() => {
                          const Icon = getChangeIndicator(salesChange).icon;
                          return <Icon className="h-3 w-3" />;
                        })()}
                        {salesChange > 0 ? '+' : ''}{salesChange.toFixed(1)}%
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">vs {prevMonthLabel}: ${formatNumber(previousMonthStats.totalSales)}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </Card>

              {/* Commission Card */}
              <Card className="p-5 space-y-3 stat-card hover-lift hover-glow border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">Comisiones</span>
                  </div>
                  {selectedMonthStats.invoiceCount > 0 && (
                    <div className="badge-neutral text-xs">
                      ~${formatNumber(Math.round(selectedMonthStats.avgPerInvoice))}/fact
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-primary animate-count-up">${formatCurrency(selectedMonthStats.totalCommission)}</p>
                {previousMonthStats.totalCommission > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help ${getChangeIndicator(commissionChange).bg} ${getChangeIndicator(commissionChange).color}`}>
                        {(() => {
                          const Icon = getChangeIndicator(commissionChange).icon;
                          return <Icon className="h-3 w-3" />;
                        })()}
                        {commissionChange > 0 ? '+' : ''}{commissionChange.toFixed(1)}%
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">vs {prevMonthLabel}: ${formatCurrency(previousMonthStats.totalCommission)}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </Card>

              {/* Invoice Count Card */}
              <Card className="p-5 space-y-3 stat-card hover-lift hover-glow">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Facturas</span>
                </div>
                <p className="text-3xl font-bold animate-count-up">{selectedMonthStats.invoiceCount}</p>
                {previousMonthStats.invoiceCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help ${getChangeIndicator(invoiceCountChange).bg} ${getChangeIndicator(invoiceCountChange).color}`}>
                        {(() => {
                          const Icon = getChangeIndicator(invoiceCountChange).icon;
                          return <Icon className="h-3 w-3" />;
                        })()}
                        {invoiceCountChange > 0 ? '+' : ''}{invoiceCountChange.toFixed(0)}%
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">vs {prevMonthLabel}: {previousMonthStats.invoiceCount} facturas</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </Card>
            </div>

            {/* PDF generation button */}
            {selectedMonthStats.invoiceCount > 0 && (
              <Button
                variant="outline" 
                className="w-full gap-2 hover-lift"
                onClick={() => {
                  generateMonthlyPDF(selectedMonthStats.invoices, capitalizedMonth);
                  toast.success('PDF generado correctamente');
                }}
              >
                <FileText className="h-4 w-4" />
                Generar Reporte PDF ({selectedMonthStats.invoiceCount} facturas)
              </Button>
            )}
          </TabsContent>

          {/* Yearly View */}
          <TabsContent value="year" className="space-y-6 mt-6">
            {/* Year Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-5 space-y-3 stat-card hover-lift hover-glow">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Ventas {selectedYear}</span>
                </div>
                <p className="text-3xl font-bold">${formatNumber(yearStats.totalSales)}</p>
                {previousYearStats.totalSales > 0 && (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getChangeIndicator(yearSalesChange).bg} ${getChangeIndicator(yearSalesChange).color}`}>
                    {(() => {
                      const Icon = getChangeIndicator(yearSalesChange).icon;
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {yearSalesChange > 0 ? '+' : ''}{yearSalesChange.toFixed(1)}% vs {selectedYear - 1}
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-3 stat-card hover-lift hover-glow border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Comisiones {selectedYear}</span>
                </div>
                <p className="text-3xl font-bold text-primary">${formatCurrency(yearStats.totalCommission)}</p>
                {previousYearStats.totalCommission > 0 && (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getChangeIndicator(yearCommissionChange).bg} ${getChangeIndicator(yearCommissionChange).color}`}>
                    {(() => {
                      const Icon = getChangeIndicator(yearCommissionChange).icon;
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {yearCommissionChange > 0 ? '+' : ''}{yearCommissionChange.toFixed(1)}% vs {selectedYear - 1}
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-3 stat-card hover-lift hover-glow">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Facturas {selectedYear}</span>
                </div>
                <p className="text-3xl font-bold">{yearStats.invoiceCount}</p>
                <p className="text-xs text-muted-foreground">
                  Promedio: ~${formatNumber(Math.round(yearStats.avgPerMonth))}/mes
                </p>
              </Card>
            </div>

            {/* Monthly Chart for Year */}
            <Card className="p-5 hover-lift">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Comisiones Mensuales {selectedYear}
              </h3>
              
              <div className="space-y-3">
                {monthsInYear.map((month, index) => {
                  const barWidth = (month.totalCommission / maxCommission) * 100;
                  const isCurrentMonth = isSameMonth(month.date, new Date());
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedDate(month.date);
                        setViewMode('month');
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all hover-lift ${
                        isCurrentMonth 
                          ? 'bg-primary/5 ring-1 ring-primary/30' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isCurrentMonth ? 'text-primary' : 'text-foreground'}`}>
                          {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                          {isCurrentMonth && <span className="ml-2 text-xs opacity-70">(Actual)</span>}
                        </span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">{month.invoiceCount} fact.</span>
                          <span className="font-semibold text-success">${formatCurrency(month.totalCommission)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isCurrentMonth ? 'gradient-primary' : month.totalCommission > 0 ? 'bg-primary/50' : 'bg-muted-foreground/20'
                          }`}
                          style={{ width: `${Math.max(barWidth, month.totalCommission > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Year Comparison */}
            {availableYears.length > 1 && (
              <Card className="p-5 hover-lift">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Comparación por Año
                </h3>
                
                <div className="space-y-3">
                  {availableYears.slice(0, 5).map((year) => {
                    const start = startOfYear(new Date(year, 0, 1));
                    const end = endOfYear(new Date(year, 0, 1));
                    
                    const yearInvoices = invoices.filter(inv => {
                      const date = parseInvoiceDate(inv.invoice_date || inv.created_at);
                      return isWithinInterval(date, { start, end });
                    });
                    
                    const totalCommission = yearInvoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0);
                    const maxYearCommission = Math.max(...availableYears.slice(0, 5).map(y => {
                      const s = startOfYear(new Date(y, 0, 1));
                      const e = endOfYear(new Date(y, 0, 1));
                      return invoices
                        .filter(inv => {
                          const d = parseInvoiceDate(inv.invoice_date || inv.created_at);
                          return isWithinInterval(d, { start: s, end: e });
                        })
                        .reduce((sum, inv) => sum + Number(inv.total_commission), 0);
                    }), 1);
                    const barWidth = (totalCommission / maxYearCommission) * 100;
                    const isSelected = year === selectedYear;
                    
                    return (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`w-full text-left p-3 rounded-xl transition-all hover-lift ${
                          isSelected 
                            ? 'bg-primary/5 ring-1 ring-primary/30' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {year}
                          </span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">{yearInvoices.length} fact.</span>
                            <span className="font-semibold text-success">${formatCurrency(totalCommission)}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isSelected ? 'gradient-primary' : 'bg-primary/40'
                            }`}
                            style={{ width: `${Math.max(barWidth, totalCommission > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
