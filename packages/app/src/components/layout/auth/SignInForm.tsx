import { authClient } from "@/auth/client";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SignInForm({
  showHeader,
  callbackURL = window.location.href,
}: {
  showHeader?: boolean;
  callbackURL?: string;
}) {
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    try {
      const signUp = await authClient.signUp.email({
        name: email,
        email,
        password,
        callbackURL,
      });
      if (!signUp.error) return;

      if (signUp.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
        const signIn = await authClient.signIn.email({
          email,
          password,
          callbackURL,
        });
        if (!signIn.error) return;
      } else {
        throw signUp.error;
      }
    } catch (error) {
      setError((error as Error).message ?? "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="text-center space-y-2">
          <h2 className="text-xl">{t(`form.${mode}.title`)}</h2>
          <p className="text-muted-foreground">
            {t(`form.${mode}.description`)}
          </p>
        </div>
      )}

      <form onSubmit={handleEmail} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading || !email || !password}
        >
          {t(`form.${mode}.buttonText`)}
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
      </form>

      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <Separator className="flex-1" />
      </div>

      <Button
        onClick={() =>
          authClient.signIn.social({ provider: "google", callbackURL })
        }
        className="w-full"
        variant="outline"
        disabled={loading}
      >
        <img src="/logos/google.svg" className="size-4" alt="Google" />
        Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By clicking continue, you agree to our{" "}
        <a
          href="https://docs.google.com/document/d/1T1jA-2f3CUBWI1WAh79zVf_zSv-r8hVplbDoopekqeU/edit?tab=t.0"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-primary"
        >
          Terms of Service
        </a>
      </p>
    </div>
  );
}
