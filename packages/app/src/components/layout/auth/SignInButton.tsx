import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import { SignInModal } from "./SignInModal";

interface SignInButtonProps {
  children?: ReactNode;
  callbackURL?: string;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
  disabled?: boolean;
}

export function SignInButton({
  children = "Start Automating",
  callbackURL,
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled = false,
}: SignInButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        className={className}
        variant={variant}
        size={size}
        loading={loading}
        disabled={disabled}
        onClick={() => setShowModal(true)}
      >
        {children}
      </Button>
      <SignInModal
        open={showModal}
        onOpenChange={setShowModal}
        callbackURL={callbackURL}
      />
    </>
  );
}
