import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { useWaitlist } from "./waitlist-context";

export function MainHeader() {
  const { setContext } = useWaitlist();
  return (
    <header className="mx-auto flex max-w-7xl items-center px-6 h-14 gap-2">
      <Link to="/">
        <Logo />
      </Link>
      <div className="flex-1" />
      {/* <Link to="/login"> */}
      <Button variant="outline" onClick={() => setContext({ type: "log-in" })}>
        Log In
      </Button>
      {/* </Link> */}
      {/* <Link to="/login"> */}
      <Button onClick={() => setContext({ type: "get-started" })}>
        Get Started
      </Button>
      {/* </Link> */}
    </header>
  );
}
