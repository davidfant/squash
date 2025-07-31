import { Button } from "@/components/ui";
import { ArrowRight, Star } from "lucide-react";

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

// Simple Avatar component since it's not available in the UI library
const Avatar = ({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) => <img src={src} alt={alt} className={`rounded-full ${className}`} />;

export default () => {
  return (
    <section>
      <div className="container p-4 mx-auto grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className="mx-auto flex flex-col items-center text-center md:ml-auto lg:max-w-3xl lg:items-start lg:text-left">
          <h1 className="my-6 text-pretty text-4xl font-bold lg:text-6xl xl:text-7xl font-display">
            {i18n.heading}
          </h1>
          <p className="text-muted-foreground mb-8 max-w-xl lg:text-xl">
            {i18n.description}
          </p>

          {i18n.reviews && assets.reviewAvatars && (
            <div className="mb-12 flex w-fit flex-col items-center gap-4 sm:flex-row">
              <span className="inline-flex items-center -space-x-4">
                {assets.reviewAvatars.map((avatar, index) => (
                  <Avatar
                    key={index}
                    src={avatar.src}
                    alt={avatar.alt}
                    className="size-12 border"
                  />
                ))}
              </span>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, index) => (
                    <Star
                      key={index}
                      className="size-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                  <span className="mr-1 font-semibold">
                    {i18n.reviews.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-muted-foreground text-left font-medium">
                  {i18n.reviews.reviewText}
                </p>
              </div>
            </div>
          )}

          <div className="flex w-full flex-col justify-center gap-2 sm:flex-row lg:justify-start">
            {i18n.buttons?.primary && (
              <Button asChild className="w-full sm:w-auto" variant="primary">
                <a href={i18n.buttons.primary.url}>
                  {i18n.buttons.primary.text}
                </a>
              </Button>
            )}
            {i18n.buttons?.secondary && (
              <Button asChild>
                <a href={i18n.buttons.secondary.url}>
                  {i18n.buttons.secondary.text}
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {assets.image && (
          <div className="flex">
            <img
              src={assets.image.src}
              alt={assets.image.alt}
              className="max-h-[600px] w-full rounded-md object-cover lg:max-h-[800px]"
            />
          </div>
        )}
      </div>
    </section>
  );
};
