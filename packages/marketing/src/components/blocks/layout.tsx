import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdContent } from "@/content/types";
import { ArrowRight, Palette } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import "reactflow/dist/style.css";
import { getToolkitLogo } from "../util/get-toolkit-logo";
import { BookingDialog } from "./booking-dialog";
import { CallToAction } from "./call-to-action";
import { FlowDiagram } from "./diagram";
import { StepByStep } from "./step-by-step";
import { Testimonials } from "./testimonials";

const contentBySlug = Object.fromEntries(
  Object.values(
    import.meta.glob<AdContent>("../../content/*.json", { eager: true })
  ).map((content) => [content.slug, content])
);

export const Layout = () => {
  const { slug } = useParams();
  const content = useMemo(() => contentBySlug[slug as string], [slug]);
  if (!content) return <Navigate to="/" />;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHeaderInView, setIsHeaderInView] = useState(true);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const heroElement = heroRef.current;
    if (!heroElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsHeaderInView(entry.isIntersecting);
        }
      },
      {
        threshold: 0,
        rootMargin: "-100px 0px 0px 0px", // Trigger when hero is 100px above viewport
      }
    );

    observer.observe(heroElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  const openModal = () => {
    posthog.capture("schedule_demo_button_clicked");
    window.fbq?.("trackCustom", "BookMeetingClick");
    setIsModalOpen(true);
  };

  return (
    <>
      <BookingDialog
        open={isModalOpen}
        usps={content.usps}
        onOpenChange={setIsModalOpen}
      />

      {/* Sticky header for desktop - only show when hero is out of view */}
      {!isHeaderInView && (
        <header className="sticky top-0 z-50 hidden border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 md:block">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
            {/* <Logo /> */}
            <p>{content.hero.badge}</p>
            <Button className="gap-2" onClick={openModal}>
              Book a setup call
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </header>
      )}

      {/* Sticky bottom button for mobile - only show when hero is out of view */}
      {!isHeaderInView && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:hidden space-y-2">
          <Button size="lg" className="w-full gap-2" onClick={openModal}>
            Book a setup call
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            30 minute call, no cost if you don't use the workflow
          </p>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-32 pb-32 md:px-6">
        <section
          ref={heroRef}
          className="space-y-8 text-center max-w-2xl mx-auto"
        >
          <div className="flex justify-center">
            <Badge variant="blue">{content.hero.badge}</Badge>
          </div>

          <div className="space-y-6">
            <h1 className="text-balance text-4xl tracking-tight sm:text-5xl">
              {content.hero.heading}
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
              {content.hero.description}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              Works with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {content.hero.integrations.map((partner, index) => (
                <Badge key={partner.name} variant="outline" className="py-1">
                  <img
                    src={getToolkitLogo(partner.toolkitSlug)}
                    alt={partner.name}
                    className="size-4"
                  />
                  {partner.name}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="mx-auto w-full max-w-sm text-base flex"
            onClick={openModal}
          >
            Book a setup call
            <ArrowRight className="size-4" />
          </Button>
        </section>

        <section className="space-y-5 mx-auto max-w-2xl mt-24">
          <h2 className="text-3xl leading-tight text-center">How it works</h2>
          <p className="text-base text-muted-foreground text-center">
            {content.workflow.description}
          </p>
          <FlowDiagram nodes={content.workflow.nodes} />
          <Alert>
            <Palette />
            <AlertTitle>
              Work with our team to adapt it to your workflow and apps
            </AlertTitle>
          </Alert>
        </section>

        <StepByStep steps={content.workflow.steps} />

        <Testimonials
          description={content.testimonials.description}
          testimonials={content.testimonials.testimonials}
        />

        <CallToAction
          items={content.usps}
          title={content.callToAction.title}
          description={content.callToAction.description}
          buttonText="Book a setup call"
          onClick={openModal}
        />
      </div>

      {/* Privacy Policy Footer */}
      <footer className="border-t bg-muted/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
          <div className="text-sm text-muted-foreground">
            <p className="mb-4 text-center">
              <a
                href="https://docs.google.com/document/d/1T1jA-2f3CUBWI1WAh79zVf_zSv-r8hVplbDoopekqeU/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Terms of Service
              </a>
              {"   |   "}
              <a
                href="https://docs.google.com/document/d/1js8GW_7AQG6HkSJ_78499iCjmeer1NPU2AIWWiJK4Bw/edit?tab=t.0#heading=h.ej3nc4gkvxnt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};
