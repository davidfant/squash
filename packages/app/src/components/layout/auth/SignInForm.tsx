import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="text-center">
          <h2 className="text-xl">{t(`form.${mode}.title`)}</h2>
          <p className="text-muted-foreground">
            {t(`form.${mode}.description`)}
          </p>
        </div>
      )}
      <Button
        onClick={() =>
          authClient.signIn.social({ provider: "google", callbackURL })
        }
        className="w-full"
        size="lg"
        variant="outline"
      >
        <img src="/logos/google.svg" className="w-5 h-5 mr-2" />
        {t(`form.${mode}.buttonText`)}
      </Button>
      <div className="text-center text-sm">
        By signing up for Squash, you agree to our{" "}
        {/* {t(`form.${mode}.switch.text`)}{" "} */}
        {/* <span
          className="underline underline-offset-4 cursor-pointer"
          onClick={() =>
            setMode((prev) => (prev === "signIn" ? "signUp" : "signIn"))
          }
        >
          {t(`form.${mode}.switch.cta`)}
        </span> */}
        <a
          href="https://docs.google.com/document/d/1T1jA-2f3CUBWI1WAh79zVf_zSv-r8hVplbDoopekqeU/edit?tab=t.0"
          target="_blank"
          className="underline underline-offset-4 cursor-pointer"
        >
          Terms of Service
        </a>
      </div>
      {/* <Separator />
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By signing in, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-4">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </a>
            .
          </p>
        </div> */}
    </div>
  );
}
