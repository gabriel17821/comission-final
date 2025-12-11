import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0); // Tiempo restante de bloqueo
  const [attempts, setAttempts] = useState(0); // Intentos fallidos seguidos

  // Configuración de seguridad
  const MAX_ATTEMPTS = 3; // Máximo de intentos antes del bloqueo
  const LOCKOUT_DURATION = 30; // Segundos de bloqueo

  // 1. Al cargar, verificamos si hay un bloqueo pendiente guardado en el navegador
  useEffect(() => {
    const savedLockout = localStorage.getItem("login_lockout_until");
    if (savedLockout) {
      const remainingTime = Math.ceil((parseInt(savedLockout) - Date.now()) / 1000);
      if (remainingTime > 0) {
        setLockoutTime(remainingTime);
      } else {
        // El tiempo ya pasó, limpiamos
        localStorage.removeItem("login_lockout_until");
        setAttempts(0);
      }
    }
  }, []);

  // 2. Temporizador para la cuenta regresiva del bloqueo
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (lockoutTime === 0 && localStorage.getItem("login_lockout_until")) {
      // Desbloquear cuando el contador llega a cero
      localStorage.removeItem("login_lockout_until");
      setAttempts(0);
    }
  }, [lockoutTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime > 0) return;

    setLoading(true);

    // 3. Retraso artificial (Anti-Exploit / Timing Attack)
    // Hacemos que el sistema espere 800ms siempre, para que un robot no pueda probar 1000 claves por segundo.
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Obtenemos la clave real desde el archivo .env
    const realPassword = import.meta.env.VITE_APP_PASSWORD;

    if (password === realPassword) {
      toast.success("Acceso concedido", { icon: <ShieldCheck className="h-4 w-4 text-green-500" /> });
      onLogin();
    } else {
      // Contraseña incorrecta
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        // ACTIVAR BLOQUEO
        const unlockTime = Date.now() + (LOCKOUT_DURATION * 1000);
        localStorage.setItem("login_lockout_until", unlockTime.toString());
        setLockoutTime(LOCKOUT_DURATION);
        toast.error(`Sistema bloqueado por seguridad. Espera ${LOCKOUT_DURATION}s.`);
      } else {
        toast.error(`Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - newAttempts}`);
      }
      
      setPassword(""); // Limpiar campo
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in zoom-in duration-500">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-2 ring-primary/20">
            {lockoutTime > 0 ? (
              <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
            ) : (
              <Lock className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {lockoutTime > 0 ? "Acceso Bloqueado" : "Área Restringida"}
          </CardTitle>
          <CardDescription>
            {lockoutTime > 0 
              ? `Demasiados intentos fallidos. Intenta de nuevo en ${lockoutTime}s` 
              : "Introduce tus credenciales de administrador"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Contraseña..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-center text-lg tracking-widest"
                disabled={loading || lockoutTime > 0}
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold gradient-primary transition-all hover:scale-[1.02]"
              disabled={loading || !password || lockoutTime > 0}
            >
              {loading ? "Verificando..." : lockoutTime > 0 ? `Esperar ${lockoutTime}s` : "Entrar al Sistema"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
