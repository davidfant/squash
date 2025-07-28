import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export interface I18n {
  heading: { main: string; highlight: string };
  description: string;
  buttons?: {
    primary?: { text: string; url: string };
    secondary?: { text: string; url: string };
  };
  technologiesText?: string;
}

export interface Assets {
  backgroundPattern?: { src: string; alt: string };
  logo?: { src: string; alt: string };
  technologyLogos?: { src: string; alt: string; url: string }[];
}

export default ({ i18n, assets }: { i18n: I18n; assets: Assets }) => {
  return (
    <section className="relative overflow-hidden py-32">
      {assets.backgroundPattern && (
        <div className="absolute inset-x-0 top-0 flex h-full w-full items-center justify-center opacity-100">
          <img
            alt={assets.backgroundPattern.alt}
            src={assets.backgroundPattern.src}
            className="[mask-image:radial-gradient(75%_75%_at_center,white,transparent)] opacity-90"
          />
        </div>
      )}
      <div className="relative z-10 container">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <div className="flex flex-col items-center gap-6 text-center">
            {assets.logo && (
              <div className="rounded-xl bg-background/30 p-4 shadow-sm backdrop-blur-sm">
                <img
                  src={assets.logo.src}
                  alt={assets.logo.alt}
                  className="h-16"
                />
              </div>
            )}
            <div>
              <h1 className="mb-6 text-2xl font-bold tracking-tight text-pretty lg:text-5xl">
                {i18n.heading.main}{" "}
                <span className="text-primary">{i18n.heading.highlight}</span>
              </h1>
              <p className="mx-auto max-w-3xl text-muted-foreground lg:text-xl">
                {i18n.description}
              </p>
            </div>
            {i18n.buttons && (
              <div className="mt-6 flex justify-center gap-3">
                {i18n.buttons.primary && (
                  <Button
                    asChild
                    variant="primary"
                    className="shadow-sm transition-shadow hover:shadow"
                  >
                    <a href={i18n.buttons.primary.url}>
                      {i18n.buttons.primary.text}
                    </a>
                  </Button>
                )}
                {i18n.buttons.secondary && (
                  <Button asChild>
                    <a href={i18n.buttons.secondary.url}>
                      {i18n.buttons.secondary.text} <ExternalLink />
                    </a>
                  </Button>
                )}
              </div>
            )}
            {i18n.technologiesText && assets.technologyLogos && (
              <div className="mt-20 flex flex-col items-center gap-5">
                <p className="font-medium text-muted-foreground lg:text-left">
                  {i18n.technologiesText}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {assets.technologyLogos.map((logo, index) => (
                    <a
                      key={index}
                      href={logo.url}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                        "group flex aspect-square h-12 items-center justify-center p-0"
                      )}
                    >
                      <img
                        src={logo.src}
                        alt={logo.alt}
                        className="h-6 saturate-0 transition-all group-hover:saturate-100"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
