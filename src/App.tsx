import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { LoginScreen } from "./components/LoginScreen";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Verificar persistencia de sesión
    const session = localStorage.getItem("dls_admin_session");
    // "Comprobación básica": verificamos si existe la marca en el navegador
    if (session === "active") {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLoginSuccess = () => {
    // Guardar sesión persistente
    localStorage.setItem("dls_admin_session", "active");
    setIsAuthenticated(true);
  };

  // Mientras verificamos, mostramos pantalla en blanco (evita parpadeos)
  if (isChecking) return null;

  // Si NO está autenticado, mostramos el Login
  if (!isAuthenticated) {
    return (
      <>
        <Toaster />
        <Sonner />
        <LoginScreen onLogin={handleLoginSuccess} />
      </>
    );
  }

  // Si SÍ está autenticado, mostramos la App completa
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
