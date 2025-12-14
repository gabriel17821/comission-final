import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, User } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Pequeño delay para simular seguridad
    setTimeout(() => {
      // DATOS DE ACCESO (Puedes cambiarlos en tu .env o dejarlos aquí por ahora)
      const correctPassword = import.meta.env.VITE_APP_PASSWORD || "Gabriel17";
      const correctUsername = "DLS"; // Usuario fijo por ahora

      if (password === correctPassword && username.toLowerCase().trim() === correctUsername) {
        toast.success("¡Acceso Concedido!");
        onLoginSuccess(); // <--- ESTO ES LO QUE FALTABA PARA QUE ENTRE
      } else {
        toast.error("Usuario o contraseña incorrectos");
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Sistema de Comisiones</CardTitle>
          <CardDescription>Inicia sesión para gestionar tus ventas</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  placeholder="Tu Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold" disabled={isLoading}>
              {isLoading ? "Verificando..." : "Entrar al Sistema"}
            </Button>
          </CardFooter>
        </form>
        <div className="text-center pb-4 text-xs text-slate-400">
          Versión 2.0 • Acceso Seguro
        </div>
      </Card>
    </div>
  );
};
