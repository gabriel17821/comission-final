import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "@/hooks/useInvoices";
import { formatCurrency, formatNumber } from "./formatters";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// --- 1. Generar PDF de Factura Individual (Para Historial y Calculadora) ---
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

  // Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const dateStr = format(new Date(invoice.invoice_date || invoice.created_at), "d 'de' MMMM, yyyy", { locale: es });
  
  doc.setFont("helvetica", "bold"); doc.text("NCF:", 14, 50);
  doc.setFont("helvetica", "normal"); doc.text(invoice.ncf, 35, 50);

  doc.setFont("helvetica", "bold"); doc.text("Fecha:", 14, 56);
  doc.setFont("helvetica", "normal"); doc.text(dateStr, 35, 56);

  doc.setFont("helvetica", "bold"); doc.text("Cliente:", 14, 62);
  doc.setFont("helvetica", "normal");
  const clientName = invoice.clients?.name || "Cliente General"; 
  doc.text(clientName, 35, 62);

  doc.setFont("helvetica", "bold"); doc.text("Monto Factura:", 120, 50);
  doc.text(`$${formatNumber(invoice.total_amount)}`, 160, 50);

  doc.setTextColor(16, 185, 129);
  doc.text("Comisión Total:", 120, 56);
  doc.text(`$${formatCurrency(invoice.total_commission)}`, 160, 56);
  doc.setTextColor(0, 0, 0);

  // Tabla
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
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } },
  });

  doc.save(`Comision_${invoice.ncf}.pdf`);
};

// --- 2. Generar Reporte Mensual General (Para Estadísticas) ---
export const generateMonthlyPDF = (invoices: Invoice[], monthName: string, year: number) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(59, 130, 246); // Blue 500
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`Reporte Mensual: ${monthName} ${year}`, 14, 25);

  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalCommissions = invoices.reduce((sum, inv) => sum + Number(inv.total_commission), 0);

  doc.setFontSize(12);
  doc.text(`Ventas: $${formatNumber(totalSales)}`, 14, 35);
  doc.text(`Comisiones: $${formatCurrency(totalCommissions)}`, 100, 35);

  const tableBody = invoices.map((inv) => [
    format(new Date(inv.invoice_date), "dd/MM/yyyy"),
    inv.ncf,
    inv.clients?.name || "-",
    `$${formatNumber(inv.total_amount)}`,
    `$${formatCurrency(inv.total_commission)}`,
  ]);

  autoTable(doc, {
    startY: 45,
    head: [["Fecha", "NCF", "Cliente", "Monto", "Comisión"]],
    body: tableBody,
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
  });

  doc.save(`Reporte_Mensual_${monthName}_${year}.pdf`);
};

// --- 3. Generar Reporte Anual (Para Estadísticas) ---
export const generateAnnualPDF = (year: number, monthlyData: { name: string; total: number; commission: number }[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(99, 102, 241); // Indigo 500
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`Reporte Anual ${year}`, 14, 25);

  const grandTotalSales = monthlyData.reduce((sum, m) => sum + m.total, 0);
  const grandTotalComm = monthlyData.reduce((sum, m) => sum + m.commission, 0);

  doc.setFontSize(12);
  doc.text(`Total Ventas: $${formatNumber(grandTotalSales)}`, 14, 35);
  doc.text(`Total Comisiones: $${formatCurrency(grandTotalComm)}`, 120, 35);

  const tableBody = monthlyData.map((m) => [
    m.name,
    `$${formatNumber(m.total)}`,
    `$${formatCurrency(m.commission)}`
  ]);

  autoTable(doc, {
    startY: 45,
    head: [["Mes", "Ventas", "Comisiones"]],
    body: tableBody,
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
  });

  doc.save(`Reporte_Anual_${year}.pdf`);
};

// --- 4. Generar Desglose Detallado por Producto (Para "Desglose Mensual") ---
export const generateBreakdownPdf = (
  data: { month: string; products: any[]; rest: any; grandTotal: number },
  dateKey: string,
  sellerName?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFillColor(236, 72, 153); // Pink 500
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`Desglose Detallado: ${data.month}`, 14, 20);
  
  doc.setFontSize(12);
  if (sellerName) doc.text(`Vendedor: ${sellerName}`, 14, 32);

  let currentY = 45;

  // Iterar Productos
  data.products.forEach((prod) => {
    // Título Producto
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${prod.name} (${prod.percentage}%)`, 14, currentY);
    
    // Tabla del Producto
    const rows = prod.entries.map((e: any) => [
        format(new Date(e.date), "dd/MM/yyyy"), 
        e.ncf, 
        `$${formatNumber(e.amount)}`
    ]);

    autoTable(doc, {
      startY: currentY + 2,
      head: [["Fecha", "NCF", "Monto"]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    // Subtotales
    currentY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text(`Subtotal: $${formatNumber(prod.totalAmount)}`, 14, currentY);
    doc.setTextColor(16, 185, 129);
    doc.text(`Comisión: $${formatCurrency(prod.totalCommission)}`, 80, currentY);
    currentY += 15; // Espacio para el siguiente bloque
  });

  // Resto de productos
  if (data.rest.totalAmount > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Resto de Productos (25%)`, 14, currentY);

    const rows = data.rest.entries.map((e: any) => [
        format(new Date(e.date), "dd/MM/yyyy"), 
        e.ncf, 
        `$${formatNumber(e.amount)}`
    ]);

    autoTable(doc, {
      startY: currentY + 2,
      head: [["Fecha", "NCF", "Monto"]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text(`Subtotal: $${formatNumber(data.rest.totalAmount)}`, 14, currentY);
    doc.setTextColor(16, 185, 129);
    doc.text(`Comisión: $${formatCurrency(data.rest.totalCommission)}`, 80, currentY);
    currentY += 15;
  }

  // Gran Total
  doc.setDrawColor(0);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 10;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Comisiones Mes:`, 14, currentY);
  doc.setTextColor(16, 185, 129);
  doc.setFont("helvetica", "bold");
  doc.text(`$${formatCurrency(data.grandTotal)}`, 100, currentY);

  doc.save(`Desglose_${dateKey}.pdf`);
};
