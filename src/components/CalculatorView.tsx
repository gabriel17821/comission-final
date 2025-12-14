import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Save, RotateCcw, User, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { CalculationBreakdown } from "./CalculationBreakdown";
import { ProductInput } from "./ProductInput";
import { Product } from "@/hooks/useProducts";
import { Seller } from "@/hooks/useSellers";
import { useClients, Client } from "@/hooks/useClients"; // Importamos Clientes
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
  onSaveInvoice: (ncf: string, date: string, clientId?: string) => Promise<any>; // Update firma
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
  const [isDataOpen, setIsDataOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- CLIENTES ---
  const { clients, addClient } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleSave = async () => {
    if (!ncf) return;
    setIsSaving(true);
    // Pasamos el ID del cliente al guardar
    await onSaveInvoice(ncf, invoiceDate, selectedClientId || undefined);
    setIsSaving(false);
    // Resetear local
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
      {/* SECCIÓN 1: DATOS DE LA FACTURA */}
      <Card className="border-l-4 border-l-blue-500 shadow-md">
        <Collapsible open={isDataOpen} onOpenChange={setIsDataOpen}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                <User className="h-5 w-5" />
                Datos de la Factura
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isDataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            {/* Vista Colapsada: Muestra NCF y CLIENTE */}
            {!isDataOpen && (
              <div className="flex flex-col text-sm mt-1 text-slate-600 font-medium">
                 {selectedClient && <span className="text-blue-600">{selectedClient.name}</span>}
                 <span>NCF: {ncf}</span>
              </div>
            )}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selector de Cliente */}
                <div className="space-y-2">
                   <Label>Cliente</Label>
                   <div className="flex gap-2">
                     <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                       <SelectTrigger className="flex-1">
                         <SelectValue placeholder="Seleccionar Cliente..." />
                       </SelectTrigger>
                       <SelectContent>
                         {clients.map(c => (
                           <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     
                     {/* Botón rápido para agregar cliente */}
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ncf">Número de Comprobante (NCF)</Label>
                  <Input
                    id="ncf"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value)}
                    placeholder="B01..."
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* SECCIÓN 2: CALCULADORA (Productos) */}
      <Card className="border-l-4 border-l-emerald-500 shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle className="text-lg text-emerald-700">Detalle de Productos</CardTitle>
             <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
               {activeSeller ? `Vendedor: ${activeSeller.name}` : "Sin Vendedor Asignado"}
             </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="total" className="text-base font-semibold">
              Monto Total de la Factura
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                $
              </span>
              <Input
                id="total"
                type="number"
                value={totalInvoice || ""}
                onChange={(e) => setTotalInvoice(parseFloat(e.target.value) || 0)}
                className="pl-7 text-lg font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Productos Especiales</Label>
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
                className="h-[100px] border-dashed flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors"
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

      {/* BOTONES DE ACCIÓN */}
      <div className="sticky bottom-4 flex gap-4 bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-lg">
        <Button
          variant="outline"
          size="lg"
          onClick={onReset}
          className="flex-1"
          disabled={isLoading || isSaving}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reiniciar
        </Button>
        <Button
          size="lg"
          onClick={handleSave}
          className="flex-[2] gradient-primary shadow-lg hover:shadow-xl transition-all"
          disabled={isLoading || isSaving || totalInvoice <= 0}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Factura"}
        </Button>
      </div>
    </div>
  );
};
