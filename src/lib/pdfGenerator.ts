import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "@/hooks/useInvoices";
import { formatCurrency, formatNumber } from "./formatters";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// --- 1. Generar PDF de una Factura Individual (Con Cliente) ---
export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Comisión", 14, 25);

  // Info Factura
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  const dateStr = format(new Date(invoice.invoice_date || invoice.created_at), "d 'de' MMMM, yyyy", { locale: es });
  
  // Columna Izquierda
  doc.setFont("helvetica", "bold");
  doc.text("NCF:", 14, 50);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.ncf, 35, 50);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 14, 56);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, 35, 56);

  // NUEVO: CLIENTE
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 14, 62);
  doc.setFont("helvetica", "normal");
  // Si el objeto clients existe, usamos su nombre, si no, un fallback
  const clientName = invoice.clients?.name || "Cliente General"; 
  doc.text(clientName, 35, 62);

  // Columna Derecha (Totales)
  doc.setFont("helvetica", "bold");
  doc.text("Monto Factura:", 120, 50);
  doc.text(`$${formatNumber(invoice.total_amount)}`, 160, 50);

  doc.setTextColor(16, 185, 129);
  doc.text("Comisión Total:", 120, 56);
  doc.text(`$${formatCurrency(invoice.total_commission)}`, 160, 56);
  doc.setTextColor(0, 0, 0);

  // Tabla de Productos
  const tableBody = (invoice.products || []).map((product) => [
    product.product_name,
    `$${formatNumber(product.amount)}`,
    `${product.percentage}%`,
    `$${formatCurrency(product.commission)}`,
  ]);

  if (invoice.rest_amount > 0) {
    tableBody.push([
      "Resto de Productos",
      `$${formatNumber(invoice.rest_amount)}`,
      `${invoice.rest_percentage}%`,
      `$${formatCurrency(invoice.rest_commission)}`,
    ]);
  }

  autoTable(doc, {
    startY: 70,
    head: [["Producto", "Monto", "% Com.", "Comisión"]],
    body: tableBody,
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Generado por Sistema de Comisiones", 14, finalY);

  doc.save(`Comision_${invoice.ncf}.pdf`);
};

// --- 2. Generar Reporte Mensual ---
export const generateMonthlyPDF = (invoices: Invoice[], monthName: string, year: number) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFillColor(59, 130, 246); // Blue 500
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`Reporte Mensual: ${monthName} ${year}`, 14, 25);

  // Totales del Mes
  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalCommissions = invoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0);

  doc.setFontSize(12);
  doc.text(`Ventas: $${formatNumber(totalSales)}`, 14, 35);
  doc.text(`Comisiones: $${formatCurrency(totalCommissions)}`, 100, 35);

  // Tabla Detallada
  const tableBody = invoices.map((inv) => [
    format(new Date(inv.invoice_date), "dd/MM/yyyy"),
    inv.ncf,
    inv.clients?.name || "-", // Incluimos Cliente aquí también
    `$${formatNumber(inv.total_amount)}`,
    `$${formatCurrency(inv.total_commission)}`,
  ]);

  autoTable(doc, {
    startY: 45,
    head: [["Fecha", "NCF", "Cliente", "Monto", "Comisión"]],
    body: tableBody,
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Reporte_Mensual_${monthName}_${year}.pdf`);
};

// --- 3. Generar Reporte Anual ---
export const generateAnnualPDF = (year: number, monthlyData: { name: string; total: number; commission: number }[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFillColor(99, 102, 241); // Indigo 500
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`Reporte Anual de Comisiones ${year}`, 14, 25);

  // Totales Anuales
  const grandTotalSales = monthlyData.reduce((sum, m) => sum + m.total, 0);
  const grandTotalComm = monthlyData.reduce((sum, m) => sum + m.commission, 0);

  doc.setFontSize(12);
  doc.text(`Total Anual Ventas: $${formatNumber(grandTotalSales)}`, 14, 35);
  doc.text(`Total Anual Comisiones: $${formatCurrency(grandTotalComm)}`, 120, 35);

  // Tabla
  const tableBody = monthlyData.map((m) => [
    m.name,
    `$${formatNumber(m.total)}`,
    `$${formatCurrency(m.commission)}`
  ]);

  autoTable(doc, {
    startY: 45,
    head: [["Mes", "Ventas Totales", "Comisiones Generadas"]],
    body: tableBody,
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Reporte_Anual_${year}.pdf`);
};
