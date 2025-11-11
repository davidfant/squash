import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface BookingDialogProps {
  open: boolean;
  usps: string[];
  onOpenChange: (open: boolean) => void;
}

export const BookingDialog = ({
  open,
  usps,
  onOpenChange,
}: BookingDialogProps) => {
  const [email, setEmail] = useState("");
  const [showCalendly, setShowCalendly] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Reset showCalendly when modal closes
  const handleModalChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setShowCalendly(false);
      setEmail("");
      setEmailError("");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError("");
    }
  };

  const handleContinue = () => {
    if (!email.trim()) {
      setEmailError("Please enter your email address");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setShowCalendly(true);
    posthog.capture("schedule_demo_email_entered", { email });
    posthog.identify(email);
    window.fbq?.("track", "Lead", { em: email });
  };

  useCalendlyEventListener({
    onEventScheduled: (event) => {
      posthog.capture("meeting_scheduled", {
        calendly_event_uri: event.data.payload.event?.uri,
        calendly_invitee_uri: event.data.payload.invitee?.uri,
      });

      if (window.fbq) {
        window.fbq("track", "Schedule", {
          content_name: "Calendly meeting",
          calendly_event_uri: event.data.payload.event?.uri,
          calendly_invitee_uri: event.data.payload.invitee?.uri,
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleModalChange}>
      <DialogContent
        className={
          showCalendly ? "sm:max-w-4xl max-h-[90vh] p-0" : "sm:max-w-md"
        }
        closeButton={true}
      >
        {!showCalendly ? (
          <>
            <DialogHeader>
              <DialogTitle>Let's get you started!</DialogTitle>
              <DialogDescription className="text-left">
                Schedule a 30 minute setup call with our team to customize the
                workflow to your needs. No cost if you don't use the workflow.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <ul className="space-y-2">
                {usps.map((usp) => (
                  <li className="flex items-start gap-2" key={usp}>
                    <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                    <span className="text-sm">{usp}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => {
                    if (email && !isValidEmail(email)) {
                      setEmailError("Please enter a valid email address");
                    }
                  }}
                  className={emailError ? "border-destructive" : ""}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                {emailError && (
                  <p
                    id="email-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {emailError}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleContinue}
                disabled={!email.trim() || !isValidEmail(email)}
              >
                Continue to Booking
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                We respect your privacy. No spam, just course updates.
              </p>
            </div>
          </>
        ) : (
          <div className="h-[800px] w-full overflow-hidden rounded-lg">
            <InlineWidget
              url="https://calendly.com/rahul-squashbuild/squash-setup-meeting"
              pageSettings={{
                backgroundColor: "ffffff",
                hideEventTypeDetails: false,
                hideLandingPageDetails: false,
                primaryColor: "00a2ff",
                textColor: "4d5055",
              }}
              prefill={{ email: email || undefined }}
              styles={{ height: "800px" }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
