import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Trash2, Edit, FileText, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Invoice } from "@/hooks/useInvoices";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditInvoiceDialog } from "./EditInvoiceDialog";
import { generateInvoicePDF } from "@/lib/pdfGenerator";

interface InvoiceHistoryProps {
  invoices: Invoice[];
  loading: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, ncf: string, date: string, total: number, restAmount: number, restPerc: number, restComm: number, totalComm: number, products: any[]) => Promise<any>;
}

export const InvoiceHistory = ({ invoices, loading, onDelete, onUpdate }: InvoiceHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.ncf.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (invoice.clients?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando historial...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-md border-t-4 border-t-primary">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Historial de Facturas</CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar NCF o Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
              <p className="text-muted-foreground">No se encontraron facturas.</p>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 hover:shadow-sm transition-all bg-white"
              >
                <div className="space-y-2 mb-4 md:mb-0">
                  {/* TÍTULO PRINCIPAL: NCF (RESTAURADO) */}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-bold text-slate-800">
                        {invoice.ncf}
                    </span>
                    {/* FECHA AL LADO */}
                    <span className="text-xs text-muted-foreground capitalize bg-slate-100 px-2 py-1 rounded">
                        {format(new Date(invoice.invoice_date), "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>

                  {/* SUBTÍTULO: CLIENTE (SECUNDARIO) */}
                  <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                     <User className="w-3.5 h-3.5" />
                     {invoice.clients?.name || "Cliente General"}
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
                    <div className="font-bold text-lg text-slate-700">${formatNumber(invoice.total_amount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Comisión</div>
                    <div className="font-bold text-xl text-emerald-600">
                      ${formatCurrency(invoice.total_commission)}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => generateInvoicePDF(invoice)}
                      title="Descargar PDF"
                      className="hover:text-blue-600 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingInvoice(invoice)}
                      className="hover:text-amber-600 hover:bg-amber-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteId(invoice.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la factura permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingInvoice && (
        <EditInvoiceDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onUpdate={onUpdate}
        />
      )}
    </Card>
  );
};
