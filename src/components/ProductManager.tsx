import { useState, useRef, useEffect } from 'react';
import { formatNumber } from '@/lib/formatters';
import { Trash2, Plus, Search, X, Check, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditProductDialog } from '@/components/EditProductDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Product {
  id: string;
  name: string;
  percentage: number;
  color: string;
  is_default: boolean;
}

interface ProductManagerProps {
  products: Product[];
  productAmounts: Record<string, number>;
  productDisplayValues: Record<string, string>;
  onProductChange: (id: string, value: string) => void;
  onRemoveFromInvoice: (id: string) => void; // Just removes from current invoice
  onDeleteProduct: (id: string) => void; // Permanently deletes from database
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  onAddProduct: (name: string, percentage: number) => Promise<any>;
}

export const ProductManager = ({
  products,
  productAmounts,
  productDisplayValues,
  onProductChange,
  onRemoveFromInvoice,
  onDeleteProduct,
  onUpdateProduct,
  onAddProduct,
}: ProductManagerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPercentage, setNewProductPercentage] = useState(15);
  const [addLoading, setAddLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Track which products are "active" in the current invoice (have amounts or are selected)
  const activeProductIds = new Set([
    ...Object.keys(productAmounts).filter(id => productAmounts[id] > 0),
    ...Array.from(selectedProducts)
  ]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const noResults = searchTerm.length > 0 && filteredProducts.length === 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    
    setAddLoading(true);
    const result = await onAddProduct(newProductName.trim(), newProductPercentage);
    setAddLoading(false);
    
    if (result) {
      // Add the new product to selected products so it appears in invoice
      setSelectedProducts(prev => new Set([...prev, result.id]));
      setNewProductName('');
      setNewProductPercentage(15);
      setShowAddDialog(false);
      setSearchTerm('');
    }
  };

  const handleCreateFromSearch = () => {
    setNewProductName(searchTerm);
    setShowAddDialog(true);
    setShowSuggestions(false);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => new Set([...prev, productId]));
    setSearchTerm('');
    setShowSuggestions(false);
    // Focus the input for that product
    setTimeout(() => {
      const input = document.getElementById(`product-input-${productId}`);
      input?.focus();
    }, 100);
  };

  const handleRemoveFromInvoice = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
    onRemoveFromInvoice(productId);
  };

  // Products to show in the invoice form (active ones)
  const visibleProducts = products.filter(p => 
    activeProductIds.has(p.id) || p.is_default
  );

  // Products available to add (not yet in invoice)
  const availableToAdd = filteredProducts.filter(p => 
    !activeProductIds.has(p.id) && !p.is_default
  );

  return (
    <div className="space-y-3">
      {/* Search Input with integrated actions */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar producto para agregar..."
            className="w-full h-10 pl-10 pr-20 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowSuggestions(false);
                }}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowManageDialog(true)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
              title="Gestionar catálogo de productos"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && (searchTerm || products.length === 0) && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {availableToAdd.length > 0 ? (
              availableToAdd.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-b-0"
                >
                  <span 
                    className="h-7 w-7 rounded flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0"
                    style={{ backgroundColor: product.color }}
                  >
                    {product.percentage}%
                  </span>
                  <span className="text-sm font-medium text-foreground flex-1">{product.name}</span>
                  <Plus className="h-4 w-4 text-primary" />
                </button>
              ))
            ) : searchTerm && filteredProducts.length > 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Todos los productos coincidentes ya están en la factura
              </div>
            ) : null}
            
            {/* Create new product option */}
            {noResults && (
              <button
                onClick={handleCreateFromSearch}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary/10 transition-colors text-left bg-muted/30"
              >
                <div className="h-7 w-7 rounded bg-primary/20 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Crear "{searchTerm}"</span>
                  <span className="text-xs text-muted-foreground ml-2">como nuevo producto</span>
                </div>
              </button>
            )}
            
            {/* Always show add button at bottom */}
            {!noResults && (
              <button
                onClick={() => {
                  setShowAddDialog(true);
                  setShowSuggestions(false);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary/10 transition-colors text-left border-t border-border"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Crear nuevo producto</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Product List - Only shows products active in this invoice */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {visibleProducts.map((product, index) => {
          const amount = productAmounts[product.id] || 0;
          const commission = amount * (product.percentage / 100);
          const isDefault = product.is_default;
          
          return (
            <div 
              key={product.id}
              className="group flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-all duration-200 hover-lift"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div 
                className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                style={{ backgroundColor: product.color }}
              >
                {product.percentage}%
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveFromInvoice(product.id)}
                      title="Quitar de esta factura"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                {amount > 0 && (
                  <span className="text-xs font-medium" style={{ color: product.color }}>
                    +${commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  id={`product-input-${product.id}`}
                  type="text"
                  inputMode="numeric"
                  value={productDisplayValues[product.id] || (amount > 0 ? formatNumber(amount) : '')}
                  onChange={(e) => onProductChange(product.id, e.target.value)}
                  className="w-full h-8 pl-5 pr-2 text-sm text-right font-medium rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="0"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
            <DialogDescription>
              Este producto se guardará permanentemente en tu catálogo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto</Label>
              <Input
                id="name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Ej: Vitamina D"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentage">Porcentaje de Comisión (%)</Label>
              <Input
                id="percentage"
                type="number"
                min={0}
                max={100}
                value={newProductPercentage}
                onChange={(e) => setNewProductPercentage(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddProduct} 
                disabled={addLoading || !newProductName.trim()}
                className="gradient-primary"
              >
                {addLoading ? 'Creando...' : 'Crear Producto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Products Dialog - Full catalog management */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catálogo de Productos</DialogTitle>
            <DialogDescription>
              Gestiona todos tus productos guardados. Estos estarán disponibles en todas las facturas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay productos en el catálogo
              </p>
            ) : (
              products.map((product) => (
                <div 
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div 
                    className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                    style={{ backgroundColor: product.color }}
                  >
                    {product.percentage}%
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{product.name}</span>
                  <div className="flex items-center gap-1">
                    <EditProductDialog 
                      product={product}
                      onUpdate={onUpdateProduct}
                    />
                    {!product.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`¿Eliminar "${product.name}" permanentemente del catálogo?`)) {
                            onDeleteProduct(product.id);
                          }
                        }}
                        title="Eliminar del catálogo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowManageDialog(false);
                setShowAddDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar Producto
            </Button>
            <Button onClick={() => setShowManageDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
