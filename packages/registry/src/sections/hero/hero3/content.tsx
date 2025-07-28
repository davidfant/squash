export interface I18n {
  heading: string;
  description: string;
  buttons?: {
    primary?: {
      text: string;
      url: string;
    };
    secondary?: {
      text: string;
      url: string;
    };
  };
  reviews?: {
    count: number;
    rating: number;
    reviewText: string;
  };
}

export interface Assets {
  image?: {
    src: string;
    alt: string;
  };
  reviewAvatars?: {
    src: string;
    alt: string;
  }[];
}

export const i18n: I18n = {
  heading: "Blocks Built With Splash.site",
  description:
    "Finely crafted components built with React, Tailwind and Shadcn UI. Developers can copy and paste these blocks directly into their project.",
  buttons: {
    primary: { text: "Discover all components", url: "" },
    secondary: { text: "View on GitHub", url: "" },
  },
  reviews: {
    count: 100,
    rating: 4.9,
    reviewText: "from 200+ reviews",
  },
};

export const assets: Assets = {
  image: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
    alt: "placeholder hero",
  },
  reviewAvatars: [
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
      alt: "Avatar 1",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
      alt: "Avatar 2",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
      alt: "Avatar 3",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-4.webp",
      alt: "Avatar 4",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
      alt: "Avatar 5",
    },
  ],
};
