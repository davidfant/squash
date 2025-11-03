import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link } from "react-router";

export function MainHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center px-6 h-14 gap-2">
      <Link to="/">
        <Logo />
      </Link>
      <div className="flex-1" />
      <SignInButton mode="modal">
        <Button variant="outline">Log In</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button>Get Started</Button>
      </SignUpButton>
    </header>
  );
}
