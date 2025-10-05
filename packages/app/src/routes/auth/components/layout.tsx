import { Logo } from "@/components/Logo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import WheelGesturesPlugin from "embla-carousel-wheel-gestures";

const PREVIEW_IMAGES = [
  "https://pub-19dc0e7a76ea4e3a9c6b55f9392d1a14.r2.dev/screenshot-api/4892bc26-bbba-48cd-bd43-b2ce439aa9b9.webp",
  "https://pub-19dc0e7a76ea4e3a9c6b55f9392d1a14.r2.dev/screenshot-api/4892bc26-bbba-48cd-bd43-b2ce439aa9b9.webp",
  "https://pub-19dc0e7a76ea4e3a9c6b55f9392d1a14.r2.dev/screenshot-api/4892bc26-bbba-48cd-bd43-b2ce439aa9b9.webp",
  "https://pub-19dc0e7a76ea4e3a9c6b55f9392d1a14.r2.dev/screenshot-api/4892bc26-bbba-48cd-bd43-b2ce439aa9b9.webp",
];

export const AuthLayout = ({
  children,
  previewImages = PREVIEW_IMAGES,
}: {
  children: React.ReactNode;
  previewImages?: string[];
}) => (
  <div className="min-h-svh grid md:grid-cols-2 gap-4 bg-background p-4">
    {/* Left side - Sign in form */}
    <div className="flex flex-col">
      {/* Header with Logo */}
      <Logo />

      {/* Sign in form - centered */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>

    {/* Right side - Static rounded container with carousel inside */}
    <div className="items-center justify-center">
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl"
        style={{
          backgroundImage: "url(/preview/abstract/0.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "600px",
        }}
      >
        {/* Carousel for preview images only */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Carousel
            opts={{
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 4000,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              }),
              WheelGesturesPlugin({
                forceWheelAxis: "x", // horizontal only
                // wheelDragging: true,  // click-dragging continues to work
              }),
            ]}
            className="w-full"
          >
            <CarouselContent>
              {previewImages.map((image, index) => (
                <CarouselItem key={index} className="pl-1 md:basis-3/4">
                  <div className="px-2 py-20">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full rounded-2xl border-4 border-white/20 shadow-2xl"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  </div>
);
