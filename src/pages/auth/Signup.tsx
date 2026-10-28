import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/shared/BrandMark";

export default function Signup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <BrandMark variant="auth" size="md" subtitle="" />
        </Link>

        <Card className="space-y-4 p-8 text-center shadow-elegant">
          <h1 className="text-2xl font-semibold">Workspace access is invitation-only</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ask your company administrator to invite your work email. If you already have an
            invitation, open the link in that email to set up your account and accept it.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth/login">Go to sign in</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
