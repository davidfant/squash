import Hero1 from "@/sections/hero/hero1";

export const Hero1Preview = () => (
  <Hero1
    i18n={{
      badge: "✨ Your Website Builder",
      heading: "Blocks Built With Shadcn & Tailwind",
      description:
        "Finely crafted components built with React, Tailwind and Shadcn UI. Developers can copy and paste these blocks directly into their project.",
      buttons: {
        primary: { text: "Discover all components", url: "" },
        secondary: { text: "View on GitHub", url: "" },
      },
    }}
    assets={{
      image: {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
        alt: "Hero section demo image showing interface components",
      },
    }}
  />
);
