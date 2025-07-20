import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
// import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const STYLE_OPTIONS = [
  {
    title: "Professional",
    subtitle: "Clean and corporate design",
    bgColor: "bg-blue-100",
    accentColor: "bg-blue-500",
  },
  {
    title: "Creative",
    subtitle: "Bold and artistic approach",
    bgColor: "bg-purple-100",
    accentColor: "bg-purple-500",
  },
  {
    title: "Minimal",
    subtitle: "Simple and focused layout",
    bgColor: "bg-gray-100",
    accentColor: "bg-gray-500",
  },
  {
    title: "Modern",
    subtitle: "Contemporary and sleek",
    bgColor: "bg-green-100",
    accentColor: "bg-green-500",
  },
  {
    title: "Elegant",
    subtitle: "Sophisticated and refined",
    bgColor: "bg-rose-100",
    accentColor: "bg-rose-500",
  },
];

export function OnboardingStyleStep() {
  const [direction, setDirection] = useState(0);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Sync carousel with selected style
  useEffect(() => {
    if (carouselApi) {
      carouselApi.scrollTo(selectedStyleIndex);
    }
  }, [selectedStyleIndex, carouselApi]);

  // Listen to carousel changes to sync with style selection
  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      const newIndex = carouselApi.selectedScrollSnap();
      if (newIndex !== selectedStyleIndex) {
        setDirection(newIndex > selectedStyleIndex ? 1 : -1);
        setSelectedStyleIndex(newIndex);
      }
    };

    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, selectedStyleIndex]);

  const handlePreviousStyle = () => {
    setDirection(-1);
    setSelectedStyleIndex((prev) =>
      prev > 0 ? prev - 1 : STYLE_OPTIONS.length - 1
    );
  };

  const handleNextStyle = () => {
    setDirection(1);
    setSelectedStyleIndex((prev) =>
      prev < STYLE_OPTIONS.length - 1 ? prev + 1 : 0
    );
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction < 0 ? 30 : -30,
      opacity: 0,
    }),
  };

  const currentStyle = STYLE_OPTIONS[selectedStyleIndex]!;

  return (
    <>
      <Carousel
        setApi={setCarouselApi}
        opts={{ loop: true }}
        // plugins={[WheelGesturesPlugin()]}
        className="w-full"
      >
        <CarouselContent>
          {STYLE_OPTIONS.map((style, index) => (
            <CarouselItem key={index}>
              <Card
                className={cn(
                  "p-6 transition-colors duration-300 aspect-3/4 min-h-0",
                  style.bgColor
                )}
              >
                <div className="space-y-3">
                  {/* Navigation skeleton */}
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-white/60 rounded w-16"></div>
                    <div className="flex space-x-2">
                      <div className="h-4 bg-white/60 rounded w-12"></div>
                      <div className="h-4 bg-white/60 rounded w-12"></div>
                      <div className="h-4 bg-white/60 rounded w-12"></div>
                    </div>
                  </div>

                  {/* Hero content skeleton */}
                  <div className="pt-8 space-y-4">
                    <div className="h-8 bg-white/60 rounded w-3/4"></div>
                    <div className="h-4 bg-white/60 rounded w-full"></div>
                    <div className="h-4 bg-white/60 rounded w-2/3"></div>
                    <div className="pt-4">
                      <div
                        className={cn("h-10 rounded w-32", style.accentColor)}
                      ></div>
                    </div>
                  </div>

                  {/* Image placeholder */}
                  <div className="h-32 bg-white/40 rounded-lg"></div>
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Style Pagination */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="outline"
            onClick={handlePreviousStyle}
            className="rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1 text-center mx-4 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={selectedStyleIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="space-y-1"
              >
                <h3 className="text-lg font-semibold">{currentStyle.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentStyle.subtitle}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={handleNextStyle}
            className="rounded-full"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Style indicators */}
        <div className="flex justify-center space-x-2 mt-3">
          {STYLE_OPTIONS.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors cursor-pointer",
                index === selectedStyleIndex ? "bg-primary" : "bg-muted"
              )}
              onClick={() => {
                setDirection(index > selectedStyleIndex ? 1 : -1);
                setSelectedStyleIndex(index);
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
