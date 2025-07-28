import Hero3 from "@/sections/hero/hero3";

export const Hero3Preview = () => (
  <Hero3
    i18n={{
      heading: "Blocks built with Shadcn & Tailwind",
      description:
        "Finely crafted components built with React, Tailwind and Shadcn UI. Developers can copy and paste these blocks directly into their project.",
      buttons: {
        primary: {
          text: "Sign Up",
          url: "https://www.shadcnblocks.com",
        },
        secondary: {
          text: "Get Started",
          url: "https://www.shadcnblocks.com",
        },
      },
      reviews: {
        count: 200,
        rating: 5.0,
        reviewText: "from 200+ reviews",
      },
    }}
    assets={{
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
    }}
  />
);
