import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-elegant-md">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Vexa</span>
        </Link>

        <Card className="p-8 shadow-elegant">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.ng" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Vexa?{" "}
            <Link to="/auth/signup" className="font-medium text-primary hover:underline">
              Create a workspace
            </Link>
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Enterprise e-invoicing for Nigerian businesses
        </p>
      </div>
    </div>
  );
}