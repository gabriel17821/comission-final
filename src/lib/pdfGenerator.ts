import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '@/hooks/useInvoices';
import { formatNumber } from '@/lib/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const parseDate = (d: string | null | undefined): Date => {
  if (!d) return new Date();
  try {
    const clean = typeof d === 'string' && d.includes('T') ? d.split('T')[0] : d;
    if (typeof clean === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, d] = clean.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0);
    }
    return new Date(d);
  } catch { return new Date(); }
};

export const generateMonthlyPDF = (invoices: Invoice[], label: string, seller: string = '') => {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('Reporte Mensual', 14, 20);
  doc.setFontSize(11); doc.text(label, 14, 28); doc.text(`Vendedor: ${seller}`, 14, 34);
  
  const rows = invoices.map(i => [
      i.ncf, 
      i.client_name || '-', 
      `$${formatNumber(i.total_amount)}`, 
      `$${formatNumber(i.total_commission)}`
  ]);
  
  autoTable(doc, { 
      startY: 40, 
      head: [['NCF', 'Cliente', 'Venta', 'Comisión']], 
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] }
  });
  doc.save(`reporte-${label}.pdf`);
};

export const generateAnnualPDF = (year: number, invoices: Invoice[], seller: string, label?: string) => {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text(label || `Reporte Anual ${year}`, 14, 20);
  doc.setFontSize(11); doc.text(`Vendedor: ${seller}`, 14, 28);
  
  const rows = invoices.map(i => [
      i.ncf, 
      (i.invoice_date || '').toString().split('T')[0], 
      `$${formatNumber(i.total_amount)}`, 
      `$${formatNumber(i.total_commission)}`
  ]);
  
  autoTable(doc, { startY: 35, head: [['NCF', 'Fecha', 'Venta', 'Comisión']], body: rows });
  doc.save(`reporte-anual-${year}.pdf`);
};

// FUNCIÓN PLACEHOLDER CRÍTICA (Evita que la app explote si alguien la intenta importar)
export const generateBreakdownPdf = async () => { console.log("Función legacy"); };