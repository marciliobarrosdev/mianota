import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { brandedRouteHead } from "@/config/brand";
import { completeForcedPasswordChange } from "@/lib/security.functions";

export const Route = createFileRoute("/trocar-senha")({
  ssr: false,
  head: brandedRouteHead("Trocar senha"),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const completePasswordChange = useServerFn(completeForcedPasswordChange);
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/entrar", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Senha precisa ter pelo menos 8 caracteres.");
    setLoading(true);
    try {
      await completePasswordChange({ data: { password: pwd } });
    } catch (error: any) {
      setLoading(false);
      return toast.error(error?.message ?? "Não foi possível atualizar a senha.");
    }
    setLoading(false);
    toast.success("Senha atualizada!");
    navigate({ to: "/app/inicio", replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold mb-1">Trocar senha</h1>
        <p className="text-sm text-muted-foreground mb-4">Defina uma nova senha para continuar.</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando…" : "Atualizar senha"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
