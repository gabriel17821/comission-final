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
    const session = localStorage.getItem("dls_admin_session");
    if (session === "active") {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem("dls_admin_session", "active");
    setIsAuthenticated(true);
  };

  if (isChecking) return null;

  if (!isAuthenticated) {
    return (
      <>
        <Toaster />
        {/* FIX: Posición Inferior Izquierda (bottom-left) */}
        <Sonner position="bottom-left" richColors closeButton />
        <LoginScreen onLogin={handleLoginSuccess} />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* FIX: Posición Inferior Izquierda (bottom-left) */}
        <Sonner position="bottom-left" richColors closeButton />
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