import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, User, Plus, Calendar as CalendarIcon, FileText } from "lucide-react";
import { CalculationBreakdown } from "./CalculationBreakdown";
import { ProductInput } from "./ProductInput";
import { Product } from "@/hooks/useProducts";
import { Seller } from "@/hooks/useSellers";
import { useClients } from "@/hooks/useClients";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CalculatorViewProps {
  products: Product[];
  productAmounts: Record<string, number>;
  totalInvoice: number;
  setTotalInvoice: (val: number) => void;
  calculations: any;
  restPercentage: number;
  isLoading: boolean;
  onProductChange: (id: string, val: number) => void;
  onReset: () => void;
  onAddProduct: (name: string, percentage: number, color: string) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onUpdateRestPercentage: (val: number) => Promise<void>;
  onSaveInvoice: (ncf: string, date: string, clientId?: string) => Promise<any>;
  suggestedNcf: string;
  activeSeller: Seller | null;
}

export const CalculatorView = ({
  products,
  productAmounts,
  totalInvoice,
  setTotalInvoice,
  calculations,
  restPercentage,
  isLoading,
  onProductChange,
  onReset,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateRestPercentage,
  onSaveInvoice,
  suggestedNcf,
  activeSeller,
}: CalculatorViewProps) => {
  const [ncf, setNcf] = useState(suggestedNcf);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- CLIENTES ---
  const { clients, addClient } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!ncf) return;
    setIsSaving(true);
    await onSaveInvoice(ncf, invoiceDate, selectedClientId || undefined);
    setIsSaving(false);
    setNcf(suggestedNcf); 
    setSelectedClientId("");
  };

  const handleQuickAddClient = async () => {
    if(!newClientName.trim()) return;
    const newClient = await addClient(newClientName);
    if(newClient) {
      setSelectedClientId(newClient.id);
      setNewClientName("");
      setIsClientDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECCIÓN 1: CABECERA DE DATOS (DISEÑO CLÁSICO ABIERTO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta de Cliente */}
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Cliente
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon"><Plus className="w-4 h-4"/></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej: Farmacia Central"/>
                                </div>
                                <Button onClick={handleQuickAddClient} className="w-full">Crear</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>

        {/* Tarjeta de NCF */}
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> NCF
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Input
                    id="ncf"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value)}
                    placeholder="B01..."
                    className="font-mono font-bold"
                />
            </CardContent>
        </Card>

        {/* Tarjeta de Fecha */}
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" /> Fecha
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Input
                    id="date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                />
            </CardContent>
        </Card>
      </div>

      {/* SECCIÓN 2: PRODUCTOS Y MONTOS (DISEÑO ORIGINAL) */}
      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle className="text-xl">Calculadora de Comisiones</CardTitle>
             <div className="bg-muted px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-muted-foreground">
               {activeSeller ? `Vendedor: ${activeSeller.name}` : "Sin Vendedor"}
             </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Input Gigante de Monto Total */}
          <div className="space-y-2">
            <Label htmlFor="total" className="text-lg font-semibold">
              Monto Total Factura
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xl">
                $
              </span>
              <Input
                id="total"
                type="number"
                value={totalInvoice || ""}
                onChange={(e) => setTotalInvoice(parseFloat(e.target.value) || 0)}
                className="pl-10 h-14 text-2xl font-bold bg-slate-50 border-slate-200"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium text-muted-foreground">Productos Especiales</Label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductInput
                  key={product.id}
                  product={product}
                  amount={productAmounts[product.id] || 0}
                  onChange={onProductChange}
                  onEdit={onUpdateProduct}
                  onDelete={onDeleteProduct}
                />
              ))}
              <Button
                variant="outline"
                className="h-[100px] border-dashed border-2 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors opacity-70 hover:opacity-100"
                onClick={() => onAddProduct("Nuevo Producto", 15, "#000000")}
              >
                <Plus className="h-6 w-6" />
                <span>Agregar Producto</span>
              </Button>
            </div>
          </div>

          <CalculationBreakdown
            calculations={calculations}
            restPercentage={restPercentage}
            onUpdateRestPercentage={onUpdateRestPercentage}
          />
        </CardContent>
      </Card>

      {/* BOTONES DE ACCIÓN FLOTANTES */}
      <div className="sticky bottom-4 flex gap-4 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-lg z-10">
        <Button
          variant="outline"
          size="lg"
          onClick={onReset}
          className="flex-1"
          disabled={isLoading || isSaving}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
        <Button
          size="lg"
          onClick={handleSave}
          className="flex-[2] text-lg font-bold shadow-md hover:shadow-xl transition-all"
          disabled={isLoading || isSaving || totalInvoice <= 0}
        >
          <Save className="mr-2 h-5 w-5" />
          {isSaving ? "Guardando..." : "Guardar Factura"}
        </Button>
      </div>
    </div>
  );
};
