import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { BackupSystem } from "@/components/BackupSystem";
import { LoginScreen } from "@/components/LoginScreen"; // Asegúrate de tener este componente

const queryClient = new QueryClient();

const App = () => {
  // Estado de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar si ya inició sesión antes (persistencia simple)
  useEffect(() => {
    const isLogged = localStorage.getItem("app_authenticated");
    if (isLogged === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Función para manejar el login exitoso
  const handleLoginSuccess = () => {
    localStorage.setItem("app_authenticated", "true");
    setIsAuthenticated(true);
  };

  // Si NO está autenticado, mostramos SOLO el Login
  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </TooltipProvider>
    );
  }

  // Si ESTÁ autenticado, mostramos la App completa
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* Botón de Respaldo Flotante */}
          <div className="fixed bottom-4 right-4 z-50">
            <BackupSystem />
          </div>

          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
