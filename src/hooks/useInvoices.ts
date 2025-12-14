import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvoiceProduct {
  id: string;
  product_name: string;
  amount: number;
  percentage: number;
  commission: number;
}

export interface Invoice {
  id: string;
  ncf: string;
  total_amount: number;
  rest_amount: number;
  rest_percentage: number;
  rest_commission: number;
  total_commission: number;
  created_at: string;
  invoice_date: string;
  seller_id?: string | null;
  client_id?: string | null;
  // Relaciones (Joins)
  clients?: { name: string } | null;
  products?: InvoiceProduct[];
}

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    // AQUÍ ESTÁ LA MAGIA: Traemos invoice_products Y el nombre del cliente (clients(name))
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_products(*), clients(name)') 
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Error al cargar facturas');
      console.error(error);
      setLoading(false);
      return;
    }
    setInvoices(data as unknown as Invoice[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const saveInvoice = async (
    ncf: string,
    invoiceDate: string,
    totalAmount: number,
    restAmount: number,
    restPercentage: number,
    restCommission: number,
    totalCommission: number,
    products: { name: string; amount: number; percentage: number; commission: number }[],
    sellerId?: string | null,
    clientId?: string | null // <--- NUEVO PARÁMETRO
  ) => {
    // 1. Verificar NCF
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('ncf', ncf)
      .maybeSingle();
    
    if (existing) {
      toast.error('Ya existe una factura con este NCF');
      return null;
    }

    // 2. Guardar Factura (Incluyendo client_id)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ncf,
        invoice_date: invoiceDate,
        total_amount: totalAmount,
        rest_amount: restAmount,
        rest_percentage: restPercentage,
        rest_commission: restCommission,
        total_commission: totalCommission,
        seller_id: sellerId || null,
        client_id: clientId || null, // <--- GUARDAMOS EL CLIENTE
      })
      .select('*, clients(name)') // Intentamos traer el nombre de una vez
      .single();
    
    if (invoiceError) {
      toast.error('Error al guardar factura');
      console.error(invoiceError);
      return null;
    }

    // 3. Guardar Productos
    const productInserts = products
      .filter(p => p.amount > 0)
      .map(p => ({
        invoice_id: invoice.id,
        product_name: p.name,
        amount: p.amount,
        percentage: p.percentage,
        commission: p.commission,
      }));

    if (productInserts.length > 0) {
      await supabase.from('invoice_products').insert(productInserts);
    }

    // 4. CONSTRUIR OBJETO PARA NOTIFICACIÓN (ARREGLO DEFINITIVO)
    // Si la DB no devolvió el cliente (a veces pasa en insert), lo buscamos o ponemos placeholder
    let clientName = "Cliente General";
    if (clientId) {
       // Opcional: Podríamos buscar el nombre en la lista de clientes local, 
       // pero por ahora dejaremos que el fetch global lo actualice luego.
       // Si el insert devolvió 'clients', usamos ese.
       if (invoice.clients) clientName = invoice.clients.name;
    }

    const fullInvoice: Invoice = {
      ...invoice,
      clients: invoice.clients || { name: clientName }, // Aseguramos que tenga nombre
      products: products.map((p, index) => ({
        id: `temp-${index}`, 
        product_name: p.name,
        amount: p.amount,
        percentage: p.percentage,
        commission: p.commission
      }))
    };

    toast.success('Factura guardada correctamente');
    fetchInvoices(); // Refrescar lista
    
    return fullInvoice; // <--- ESTO ARREGLA LA NOTIFICACIÓN
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
      return false;
    }
    setInvoices(invoices.filter(i => i.id !== id));
    toast.success('Factura eliminada');
    return true;
  };

  const updateInvoice = async (
    id: string, ncf: string, invoiceDate: string, totalAmount: number,
    restAmount: number, restPercentage: number, restCommission: number,
    totalCommission: number,
    products: { name: string; amount: number; percentage: number; commission: number }[]
  ) => {
    const { data: invoice, error } = await supabase.from('invoices').update({
        ncf, invoice_date: invoiceDate, total_amount: totalAmount,
        rest_amount: restAmount, rest_percentage: restPercentage,
        rest_commission: restCommission, total_commission: totalCommission,
      }).eq('id', id).select().single();

    if (error) { toast.error('Error al actualizar'); return null; }
    await supabase.from('invoice_products').delete().eq('invoice_id', id);
    
    const productInserts = products.filter(p => p.amount > 0).map(p => ({
        invoice_id: id, product_name: p.name, amount: p.amount,
        percentage: p.percentage, commission: p.commission,
      }));
    if (productInserts.length > 0) await supabase.from('invoice_products').insert(productInserts);

    toast.success('Actualizada');
    fetchInvoices();
    return invoice;
  };

  return { invoices, loading, saveInvoice, updateInvoice, deleteInvoice, refetch: fetchInvoices };
};
