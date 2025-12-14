import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Client {
  id: string;
  name: string;
  doc_number?: string;
  email?: string;
  phone?: string;
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const addClient = async (name: string, docNumber?: string) => {
    const { data, error } = await supabase
      .from("clients")
      .insert({ name, doc_number: docNumber })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear cliente");
      return null;
    }

    setClients((prev) => [...prev, data]);
    toast.success("Cliente creado");
    return data;
  };

  return { clients, loading, addClient, refetch: fetchClients };
};
