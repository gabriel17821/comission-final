import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, User } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Invoice } from "@/hooks/useInvoices";
import { Seller } from "@/hooks/useSellers";

interface LastInvoiceNotificationProps {
  invoice: Invoice | null;
  onClose: () => void;
  sellers: Seller[];
}

export const LastInvoiceNotification = ({ invoice, onClose, sellers }: LastInvoiceNotificationProps) => {
  if (!invoice) return null;

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-emerald-500 border-2">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl text-emerald-600">
            ¡Factura Guardada! ✅
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Fecha
              </span>
              <div className="font-medium">
                {invoice.invoice_date 
                  ? format(new Date(invoice.invoice_date), "d MMMM yyyy", { locale: es })
                  : format(new Date(), "d MMMM yyyy", { locale: es })}
              </div>
            </div>
            {invoice.seller_id && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Vendedor
                </span>
                <div className="font-medium truncate">
                  {sellers.find(s => s.id === invoice.seller_id)?.name || "Desconocido"}
                </div>
              </div>
            )}
          </div>

          <div className="bg-muted/30 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monto Total</span>
              <span className="text-lg font-bold">${formatNumber(invoice.total_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-primary">
              <span className="text-sm font-medium">Comisión Generada</span>
              <span className="text-xl font-bold">${formatCurrency(invoice.total_commission)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
