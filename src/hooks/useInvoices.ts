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
  products?: InvoiceProduct[];
}

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (invoicesError) {
      toast.error('Error al cargar facturas');
      console.error(invoicesError);
      setLoading(false);
      return;
    }

    // Cargar productos para cada factura
    const invoicesWithProducts = await Promise.all(
      (invoicesData || []).map(async (invoice) => {
        const { data: products } = await supabase
          .from('invoice_products')
          .select('*')
          .eq('invoice_id', invoice.id);
        return { ...invoice, products: products || [] };
      })
    );

    setInvoices(invoicesWithProducts);
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
    sellerId?: string | null
  ) => {
    // 1. Verificar si el NCF ya existe
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('ncf', ncf)
      .maybeSingle();
    
    if (existing) {
      toast.error('Ya existe una factura con este NCF');
      return null;
    }

    // 2. Insertar la factura (Cabecera)
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
      })
      .select()
      .single();
    
    if (invoiceError) {
      toast.error('Error al guardar factura');
      console.error(invoiceError);
      return null;
    }

    // 3. Insertar los productos (Detalle)
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
      const { error: productsError } = await supabase
        .from('invoice_products')
        .insert(productInserts);
      
      if (productsError) {
        console.error('Error al guardar productos:', productsError);
      }
    }

    // 4. Construir el objeto completo para la notificación (CRÍTICO PARA QUE FUNCIONE)
    // Usamos IDs temporales para visualización inmediata sin tener que volver a consultar la BD
    const fullInvoice: Invoice = {
      ...invoice,
      products: products.map((p, index) => ({
        id: `temp-${index}`, 
        product_name: p.name,
        amount: p.amount,
        percentage: p.percentage,
        commission: p.commission
      }))
    };

    toast.success('Factura guardada correctamente');
    fetchInvoices(); // Refrescar la lista en segundo plano
    
    return fullInvoice; // <--- Retornamos la factura CON productos
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar factura');
      return false;
    }
    setInvoices(invoices.filter(i => i.id !== id));
    toast.success('Factura eliminada');
    return true;
  };

  const updateInvoice = async (
    id: string,
    ncf: string,
    invoiceDate: string,
    totalAmount: number,
    restAmount: number,
    restPercentage: number,
    restCommission: number,
    totalCommission: number,
    products: { name: string; amount: number; percentage: number; commission: number }[]
  ) => {
    // Verificar NCF duplicado en update
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('ncf', ncf)
      .neq('id', id)
      .maybeSingle();
    
    if (existing) {
      toast.error('Ya existe una factura con este NCF');
      return null;
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        ncf,
        invoice_date: invoiceDate,
        total_amount: totalAmount,
        rest_amount: restAmount,
        rest_percentage: restPercentage,
        rest_commission: restCommission,
        total_commission: totalCommission,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (invoiceError) {
      toast.error('Error al actualizar');
      return null;
    }

    // Reemplazar productos
    await supabase.from('invoice_products').delete().eq('invoice_id', id);

    const productInserts = products
      .filter(p => p.amount > 0)
      .map(p => ({
        invoice_id: id,
        product_name: p.name,
        amount: p.amount,
        percentage: p.percentage,
        commission: p.commission,
      }));

    if (productInserts.length > 0) {
      await supabase.from('invoice_products').insert(productInserts);
    }

    toast.success('Factura actualizada');
    fetchInvoices();
    return invoice;
  };

  return { invoices, loading, saveInvoice, updateInvoice, deleteInvoice, refetch: fetchInvoices };
};
