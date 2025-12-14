import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Trash2, Edit, FileText, User } from "lucide-react"; // Importamos User icon
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
import { Badge } from "@/components/ui/badge";

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
    (invoice.clients?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) // Buscamos también por cliente
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historial de Facturas</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por NCF o Cliente..."
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
            <p className="text-center text-muted-foreground py-8">
              No se encontraron facturas.
            </p>
          ) : (
            filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  {/* AQUÍ ESTÁ EL CAMBIO: Cliente primero, NCF abajo */}
                  <div className="font-bold text-lg flex items-center gap-2">
                     <User className="w-4 h-4 text-blue-500" />
                     {invoice.clients?.name || "Cliente General"}
                  </div>
                  <div className="text-sm font-mono text-muted-foreground bg-slate-100 px-2 py-0.5 rounded w-fit">
                    {invoice.ncf}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {format(new Date(invoice.invoice_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Factura</div>
                    <div className="font-bold">${formatNumber(invoice.total_amount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-emerald-600 font-medium">Comisión</div>
                    <div className="font-bold text-emerald-600">
                      ${formatCurrency(invoice.total_commission)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => generateInvoicePDF(invoice)}
                      title="Descargar PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingInvoice(invoice)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
