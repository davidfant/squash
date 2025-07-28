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

export const i18n: I18n = {
  heading: {
    main: "Build your next project with",
    highlight: "Blocks",
  },
  description:
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Elig doloremque mollitia fugiat omnis! Porro facilis quo animi consequatur. Explicabo.",
  buttons: {
    primary: {
      text: "Get Started",
      url: "#",
    },
    secondary: {
      text: "Learn more",
      url: "#",
    },
  },
  technologiesText: "Built with open-source technologies",
};

export const assets: Assets = {
  backgroundPattern: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/patterns/square-alt-grid.svg",
    alt: "background pattern",
  },
  logo: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-1.svg",
    alt: "logo",
  },
  technologyLogos: [
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcn-ui-icon.svg",
      alt: "shadcn/ui logo",
      url: "#",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/typescript-icon.svg",
      alt: "TypeScript logo",
      url: "#",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/react-icon.svg",
      alt: "React logo",
      url: "#",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/tailwind-icon.svg",
      alt: "Tailwind CSS logo",
      url: "#",
    },
  ],
};
