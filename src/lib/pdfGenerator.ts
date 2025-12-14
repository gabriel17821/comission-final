import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "@/hooks/useInvoices";
import { formatCurrency, formatNumber } from "./formatters";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- Header ---
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Comisión", 14, 25);

  // --- Invoice Info ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  const dateStr = format(new Date(invoice.invoice_date), "d 'de' MMMM, yyyy", { locale: es });
  
  // Columna Izquierda (Datos Factura)
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
  // Obtenemos el nombre del objeto clients (si existe)
  const clientName = invoice.clients?.name || "Cliente General";
  doc.text(clientName, 35, 62);

  // Columna Derecha (Totales)
  doc.setFont("helvetica", "bold");
  doc.text("Monto Factura:", 120, 50);
  doc.text(`$${formatNumber(invoice.total_amount)}`, 160, 50);

  doc.setTextColor(16, 185, 129); // Green for commission
  doc.text("Comisión Total:", 120, 56);
  doc.text(`$${formatCurrency(invoice.total_commission)}`, 160, 56);
  doc.setTextColor(0, 0, 0);

  // --- Products Table ---
  const tableBody = (invoice.products || []).map((product) => [
    product.product_name,
    `$${formatNumber(product.amount)}`,
    `${product.percentage}%`,
    `$${formatCurrency(product.commission)}`,
  ]);

  // Add "Resto" row if applicable
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

  // --- Footer ---
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Generado por Sistema de Comisiones", 14, finalY);

  doc.save(`Comision_${invoice.ncf}.pdf`);
};
