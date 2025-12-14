import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Trash2, Pencil, PackageSearch, Plus } from 'lucide-react';
import { EditProductDialog } from './EditProductDialog';
import { AddProductDialog } from './AddProductDialog';

interface Product {
  id: string;
  name: string;
  percentage: number;
}

interface ProductCatalogDialogProps {
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean> | void; // Adjusted to match return type
  onAddProduct: (name: string, percentage: number) => Promise<any>;
}

export const ProductCatalogDialog = ({ products, onUpdateProduct, onDeleteProduct, onAddProduct }: ProductCatalogDialogProps) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Administrar Productos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Catálogo de Productos</DialogTitle>
          <AddProductDialog 
            onAdd={onAddProduct} 
            trigger={
              <Button size="sm" className="gap-1.5 h-8">
                <Plus className="h-4 w-4" /> Nuevo
              </Button>
            }
          />
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden mt-4 bg-muted/20 rounded-lg border border-border">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <PackageSearch className="h-10 w-10 mb-2 opacity-50" />
              <p>No hay productos registrados</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full p-4">
              <div className="space-y-3">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/60 hover:border-primary/30 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {product.percentage}%
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Comisión variable</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => setEditingProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('¿Estás seguro de eliminar este producto?')) {
                            onDeleteProduct(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Edit Dialog (Nesting) */}
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onUpdate={onUpdateProduct}
        />
      </DialogContent>
    </Dialog>
  );
};