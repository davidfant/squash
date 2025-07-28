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
