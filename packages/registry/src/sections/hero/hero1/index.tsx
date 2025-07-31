import { Badge, Button } from "@/components/ui";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export interface I18n {
  badge?: string;
  heading: string;
  description: string;
  buttons?: {
    primary?: { text: string; url: string };
    secondary?: { text: string; url: string };
  };
}

export interface Assets {
  image?: { src: string; alt: string };
}

export const i18n: I18n = {
  badge: "✨ Your Website Builder",
  heading: "Blocks Built With Splash.site",
  description:
    "Finely crafted components built with React, Tailwind and Shadcn UI. Developers can copy and paste these blocks directly into their project.",
  buttons: {
    primary: { text: "Discover all components", url: "" },
    secondary: { text: "View on GitHub", url: "" },
  },
};

export const assets: Assets = {
  image: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
    alt: "Hero section demo image showing interface components",
  },
};

export default () => {
  return (
    <section className="py-32">
      <div className="container px-4 mx-auto">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            {i18n.badge && (
              <Badge variant="outline">
                {i18n.badge}
                <ArrowUpRight className="ml-2 size-4" />
              </Badge>
            )}
            <h1 className="my-6 text-pretty text-4xl font-bold lg:text-6xl font-display">
              {i18n.heading}
            </h1>
            <p className="text-muted-foreground mb-8 max-w-xl lg:text-xl">
              {i18n.description}
            </p>
            <div className="flex w-full flex-col justify-center gap-2 sm:flex-row lg:justify-start">
              {i18n.buttons?.primary && (
                <Button asChild variant="primary" className="w-full sm:w-auto">
                  <a href={i18n.buttons.primary.url}>
                    {i18n.buttons.primary.text}
                  </a>
                </Button>
              )}
              {i18n.buttons?.secondary && (
                <Button asChild className="w-full sm:w-auto">
                  <a href={i18n.buttons.secondary.url}>
                    {i18n.buttons.secondary.text}
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          {assets.image && (
            <img
              src={assets.image.src}
              alt={assets.image.alt}
              className="max-h-96 w-full rounded-md object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
};
