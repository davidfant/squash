import { LoginForm } from "@/components/layout/auth/login-form" 
import { authClient } from "@/auth"
import { Navigate } from "react-router"
import { ThemeToggle } from "@/components/layout/sidebar/theme-toggle"

export function LoginPage() {
  const session = authClient.useSession();

  // If already authenticated, redirect to landing page
  if (!session.isPending && session.data?.user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-svh bg-background">
      {/* Header with theme toggle */}
      <header className="absolute top-0 right-0 p-4">
        <ThemeToggle />
      </header>
      
      {/* Login form centered */}
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
} 