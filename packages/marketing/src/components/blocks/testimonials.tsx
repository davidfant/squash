"use client";

import AutoScroll from "embla-carousel-auto-scroll";
import { Star } from "lucide-react";
import { useRef } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { Testimonial } from "@/content/types";

const people = [
  {
    name: "Alice Johnson",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
  },
  {
    name: "David Lee",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
  },
  {
    name: "Emily Carter",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
  },
  {
    name: "Mark Thompson",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-4.webp",
  },
  {
    name: "Sophia Turner",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
  },
  {
    name: "James Wilson",
    avatar:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-6.webp",
  },
];

export const Testimonials = ({
  description,
  testimonials,
}: {
  description: string;
  testimonials: Testimonial[];
}) => {
  const plugin = useRef(AutoScroll({ startDelay: 500, speed: 0.7 }));

  return (
    <section>
      <div className="mx-auto max-w-2xl flex flex-col items-center gap-4">
        <Badge variant="blue">Rated 5 stars by 100+ teams</Badge>
        <h2 className="text-center text-3xl">Meet our happy customers</h2>
        <p className="text-muted-foreground text-center lg:text-lg">
          {description}
        </p>
      </div>
      <div className="lg:container">
        <div className="mt-16 space-y-4">
          <Carousel
            opts={{
              loop: true,
            }}
            plugins={[plugin.current]}
            onMouseLeave={() => plugin.current.play()}
            className="before:bg-linear-to-r before:from-background after:bg-linear-to-l after:from-background relative before:absolute before:bottom-0 before:left-0 before:top-0 before:z-10 before:w-4 before:to-transparent after:absolute after:bottom-0 after:right-0 after:top-0 after:z-10 after:w-4 after:to-transparent"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="basis-auto">
                  <Card className="max-w-72 select-none p-6 h-full shadow-none">
                    <div className="mb-4 flex gap-4">
                      <Avatar
                        name={people[index % people.length]!.name}
                        className="ring-input size-14 rounded-full ring-1"
                        image={people[index % people.length]!.avatar}
                      ></Avatar>
                      <div>
                        <p className="font-medium">
                          {people[index % people.length]!.name}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {testimonial.role}
                        </p>
                        <div className="flex gap-1 mt-1">
                          <Star className="size-5 fill-amber-500 text-amber-500" />
                          <Star className="size-5 fill-amber-500 text-amber-500" />
                          <Star className="size-5 fill-amber-500 text-amber-500" />
                          <Star className="size-5 fill-amber-500 text-amber-500" />
                          <Star className="size-5 fill-amber-500 text-amber-500" />
                        </div>
                      </div>
                    </div>
                    <q className="text-muted-foreground leading-7">
                      {testimonial.content}
                    </q>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
};
