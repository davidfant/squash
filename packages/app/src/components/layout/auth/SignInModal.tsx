import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignInForm } from "./SignInForm";

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackURL?: string;
}

export const SignInModal = ({
  open,
  onOpenChange,
  callbackURL,
}: SignInModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <SignInForm callbackURL={callbackURL} showHeader />
    </DialogContent>
  </Dialog>
);
