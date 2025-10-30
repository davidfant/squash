import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: unknown;
}

export function WaitlistDialog({
  open,
  onOpenChange,
  context,
}: WaitlistDialogProps) {
  const posthog = usePostHog();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setIsSubmitting(true);

    try {
      // Log PostHog event
      posthog?.capture("waitlist_signup", {
        email: email.trim(),
        context,
      });

      setIsSubmitted(true);
      setEmail("");
    } catch (error) {
      console.error("Failed to submit waitlist:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSubmitted ? "You're on the list!" : "Join the waitlist"}
          </DialogTitle>
          <DialogDescription>
            {isSubmitted
              ? "We've added you to the waitlist and will reach out to you shortly."
              : "Enter your email address to join the waitlist."}
          </DialogDescription>
        </DialogHeader>

        {!isSubmitted && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                Submit
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
