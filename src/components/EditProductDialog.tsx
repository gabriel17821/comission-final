import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Percent, Package, Save } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  percentage: number;
}

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Product>) => Promise<boolean>;
}

export const EditProductDialog = ({ product, open, onOpenChange, onUpdate }: EditProductDialogProps) => {
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPercentage(product.percentage.toString());
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    const success = await onUpdate(product.id, {
      name,
      percentage: parseFloat(percentage)
    });
    setLoading(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre del Producto</Label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-percentage">Porcentaje de Comisión (%)</Label>
            <div className="relative">
              <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};