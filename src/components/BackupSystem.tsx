import { useState } from 'react';
import { Button } from '@/components/ui/button'; // Usamos tu botón UI si existe, si no, fallará menos aquí
import { Download, Upload, Database, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const BackupSystem = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const { data: inv } = await supabase.from('invoices').select('*');
      const { data: pro } = await supabase.from('products').select('*');
      const { data: det } = await supabase.from('invoice_products').select('*');
      const { data: cli } = await supabase.from('clients').select('*');
      const { data: exp } = await supabase.from('expenses').select('*');

      const blob = new Blob([JSON.stringify({ data: { invoices: inv, products: pro, invoice_products: det, clients: cli, expenses: exp } }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `RESPALDO_DLS_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link); a.click(); document.body.removeChild(link);
      toast.success('Copia descargada');
    } catch (e) { toast.error('Error exportando'); } finally { setIsLoading(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!window.confirm("⚠️ Se fusionarán los datos. ¿Continuar?")) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if(json.data.clients) await supabase.from('clients').upsert(json.data.clients);
        if(json.data.products) await supabase.from('products').upsert(json.data.products);
        if(json.data.invoices) await supabase.from('invoices').upsert(json.data.invoices);
        if(json.data.invoice_products) await supabase.from('invoice_products').upsert(json.data.invoice_products);
        if(json.data.expenses) await supabase.from('expenses').upsert(json.data.expenses);
        toast.success('Datos restaurados'); setTimeout(()=>window.location.reload(), 1500);
      } catch { toast.error('Archivo inválido'); } finally { setIsLoading(false); }
    };
    reader.readAsText(file);
  };

  const handleDelete = async () => {
      if(!window.confirm("🛑 ¿BORRAR TODO EL SISTEMA?")) return;
      setIsLoading(true);
      try {
          await supabase.from('invoice_products').delete().neq('id', '0');
          await supabase.from('invoices').delete().neq('id', '0');
          await supabase.from('products').delete().neq('id', '0');
          await supabase.from('clients').delete().neq('id', '0');
          try { await supabase.from('expenses').delete().neq('id', '0'); } catch {}
          toast.success('Sistema Formateado'); setTimeout(()=>window.location.reload(), 1500);
      } catch { toast.error('Error al borrar'); } finally { setIsLoading(false); }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold transition-colors rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-2 h-9">
          <Database className="w-3.5 h-3.5 text-emerald-600"/> Respaldo
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Gestión de Datos</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
            <button onClick={handleExport} disabled={isLoading} className="flex flex-col items-center justify-center p-4 border-2 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition gap-2 group">
                {isLoading ? <Loader2 className="animate-spin text-emerald-600"/> : <Download className="text-emerald-600 group-hover:scale-110 transition"/>}
                <span className="text-xs font-bold text-slate-700">Descargar</span>
            </button>
            <div className="relative">
                <input type="file" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isLoading}/>
                <button disabled={isLoading} className="w-full h-full flex flex-col items-center justify-center p-4 border-2 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition gap-2 group">
                    {isLoading ? <Loader2 className="animate-spin text-blue-600"/> : <Upload className="text-blue-600 group-hover:scale-110 transition"/>}
                    <span className="text-xs font-bold text-slate-700">Restaurar</span>
                </button>
            </div>
        </div>
        <button onClick={handleDelete} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/> Formatear Todo</button>
      </DialogContent>
    </Dialog>
  );
};