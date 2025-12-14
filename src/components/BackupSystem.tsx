import { useState } from 'react';
import { Download, Upload, Database, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

export const BackupSystem = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      // 1. Descargamos TODAS las tablas, incluyendo sellers (vendedores)
      const { data: inv } = await supabase.from('invoices').select('*');
      const { data: pro } = await supabase.from('products').select('*');
      const { data: det } = await supabase.from('invoice_products').select('*');
      const { data: cli } = await supabase.from('clients').select('*');
      const { data: exp } = await supabase.from('expenses').select('*');
      const { data: sel } = await supabase.from('sellers').select('*'); // <--- Nuevo

      const fullData = { 
        data: { 
          sellers: sel, // Importante: Vendedores primero
          clients: cli, 
          products: pro, 
          invoices: inv, 
          invoice_products: det, 
          expenses: exp 
        } 
      };

      const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RESPALDO_DLS_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Copia de seguridad descargada correctamente');
    } catch (e) {
      console.error(e);
      toast.error('Error al generar la exportación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("⚠️ ¿Estás seguro? Se fusionarán los datos con los actuales.")) {
      e.target.value = ''; // Limpiar input
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const { data } = json;

        // Función auxiliar para importar verificando errores
        const importTable = async (table: string, rows: any[]) => {
          if (!rows || rows.length === 0) return;
          // Usamos upsert y VERIFICAMOS si hubo error
          const { error } = await supabase.from(table).upsert(rows);
          if (error) {
            console.error(`Error importando ${table}:`, error);
            throw new Error(`Error en tabla ${table}: ${error.message}`);
          }
        };

        // El ORDEN es vital para evitar errores de llaves foráneas
        await importTable('sellers', data.sellers); // 1. Vendedores
        await importTable('clients', data.clients); // 2. Clientes
        await importTable('products', data.products); // 3. Productos
        await importTable('invoices', data.invoices); // 4. Facturas (necesitan sellers y clients)
        await importTable('invoice_products', data.invoice_products); // 5. Detalles (necesitan invoices y products)
        await importTable('expenses', data.expenses); // 6. Gastos

        toast.success('¡Datos restaurados con éxito!');
        setTimeout(() => window.location.reload(), 1500);

      } catch (error: any) {
        console.error(error);
        toast.error(`Falló la restauración: ${error.message || 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
        e.target.value = ''; // Limpiar input para permitir subir el mismo archivo de nuevo
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async () => {
      if(!window.confirm("🛑 ¿ESTÁS SEGURO? ESTO BORRARÁ TODA LA BASE DE DATOS.")) return;
      
      setIsLoading(true);
      try {
          // Borrar en orden inverso para respetar restricciones
          await supabase.from('invoice_products').delete().neq('id', '0');
          await supabase.from('invoices').delete().neq('id', '0');
          await supabase.from('products').delete().neq('id', '0');
          await supabase.from('clients').delete().neq('id', '0');
          await supabase.from('expenses').delete().neq('id', '0');
          // No borramos sellers por seguridad, o puedes agregarlo si quieres
          
          toast.success('Sistema formateado correctamente');
          setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        console.error(e);
        toast.error('Error al formatear');
      } finally { 
        setIsLoading(false); 
      }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold transition-colors rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-2 h-9 shadow-sm">
          <Database className="w-3.5 h-3.5 text-emerald-600"/> Base de Datos
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestión de Base de Datos</DialogTitle>
          <DialogDescription>
            Exporta tu información para guardarla o restaura una copia anterior.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
            <button 
                onClick={handleExport} 
                disabled={isLoading} 
                className="flex flex-col items-center justify-center p-4 border-2 border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all gap-2 group disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="animate-spin text-emerald-600"/> : <Download className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform"/>}
                <div className="text-center">
                    <span className="block text-sm font-bold text-slate-700">Descargar Copia</span>
                    <span className="text-[10px] text-slate-500">Guardar JSON</span>
                </div>
            </button>
            
            <div className="relative group">
                <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImport} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
                    disabled={isLoading}
                />
                <button 
                    disabled={isLoading} 
                    className="w-full h-full flex flex-col items-center justify-center p-4 border-2 border-slate-100 rounded-xl group-hover:bg-blue-50 group-hover:border-blue-200 transition-all gap-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin text-blue-600"/> : <Upload className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform"/>}
                    <div className="text-center">
                        <span className="block text-sm font-bold text-slate-700">Restaurar Copia</span>
                        <span className="text-[10px] text-slate-500">Subir JSON</span>
                    </div>
                </button>
            </div>
        </div>

        <div className="pt-2 border-t mt-2">
            <button 
                onClick={handleDelete} 
                className="w-full py-2 px-4 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
            >
                <Trash2 className="w-3.5 h-3.5"/> Formatear Base de Datos
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
