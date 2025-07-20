import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

type ToneSettings = {
  professional: number; // 0 = casual, 100 = professional
  detailed: number; // 0 = concise, 100 = detailed
};

const CONTENT_VARIANTS = {
  casual: {
    concise: {
      title: "Hey there! 👋",
      description:
        "I'm Alex, a freelance designer who loves creating awesome digital experiences. Let's build something cool together!",
      points: [
        "Creative problem solver",
        "Always learning new tech",
        "Coffee enthusiast ☕",
      ],
    },
    detailed: {
      title: "Hi! I'm Alex 👋",
      description:
        "Welcome to my little corner of the internet! I'm a passionate freelance designer and developer who's been crafting digital experiences for the past 5 years. I absolutely love what I do - there's something magical about turning ideas into beautiful, functional designs that people actually want to use.",
      points: [
        "🎨 Creative problem solver who thinks outside the box",
        "🚀 Always experimenting with the latest design trends and tech",
        "☕ Powered by an unhealthy amount of coffee and good vibes",
        "🌱 Believer in continuous learning and growth",
      ],
    },
  },
  professional: {
    concise: {
      title: "About Our Company",
      description:
        "We are a leading digital agency specializing in innovative design solutions and strategic brand development for modern enterprises.",
      points: [
        "Award-winning design team",
        "10+ years industry experience",
        "Global client portfolio",
      ],
    },
    detailed: {
      title: "About Our Organization",
      description:
        "Our company stands at the forefront of digital innovation, delivering comprehensive design solutions and strategic consulting services to enterprise clients worldwide. With over a decade of proven expertise, we have established ourselves as a trusted partner for organizations seeking to enhance their digital presence and market positioning.",
      points: [
        "Industry-leading design expertise with award-winning portfolio",
        "Comprehensive strategic consulting and brand development services",
        "Extensive experience serving Fortune 500 companies globally",
        "Commitment to excellence and measurable business outcomes",
      ],
    },
  },
};

export function OnboardingToneStep() {
  const [toneSettings, setToneSettings] = useState<ToneSettings>({
    professional: 50,
    detailed: 50,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [displayContent, setDisplayContent] = useState(() => {
    const isProfessional = toneSettings.professional >= 50;
    const isDetailed = toneSettings.detailed >= 50;
    const variant = isProfessional ? "professional" : "casual";
    const detail = isDetailed ? "detailed" : "concise";
    return CONTENT_VARIANTS[variant][detail];
  });

  const updateContent = useCallback(() => {
    const isProfessional = toneSettings.professional >= 50;
    const isDetailed = toneSettings.detailed >= 50;
    const variant = isProfessional ? "professional" : "casual";
    const detail = isDetailed ? "detailed" : "concise";
    setDisplayContent(CONTENT_VARIANTS[variant][detail]);
  }, [toneSettings]);

  const handleSliderChange = useCallback(
    (type: keyof ToneSettings, value: number[]) => {
      setToneSettings((prev) => ({ ...prev, [type]: value[0]! }));
      setIsLoading(true);
    },
    []
  );

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        updateContent();
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, updateContent]);

  const professionalValue = toneSettings.professional;
  const detailedValue = toneSettings.detailed;

  return (
    <div className="space-y-6">
      {/* Preview Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border-2 aspect-3/4 min-h-0">
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-4 bg-white/60 rounded w-20"></div>
            <div className="flex space-x-2">
              <div className="h-4 bg-white/60 rounded w-16"></div>
              <div className="h-4 bg-white/60 rounded w-16"></div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white/80 rounded-lg p-6 space-y-4">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    {Array.from(
                      { length: Math.ceil(displayContent.points.length) },
                      (_, i) => (
                        <div
                          key={i}
                          className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"
                        ></div>
                      )
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <h2 className="text-xl font-semibold text-gray-900">
                    {displayContent.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {displayContent.description}
                  </p>
                  <ul className="space-y-2">
                    {displayContent.points.map((point, index) => (
                      <li
                        key={index}
                        className="text-gray-600 flex items-start"
                      >
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>

      {/* Tone Controls */}
      <div className="space-y-6">
        {/* Professional / Casual Slider */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-center">
            Communication Style
          </h3>
          <div className="space-y-2">
            <Slider
              value={[professionalValue]}
              onValueChange={(value) =>
                handleSliderChange("professional", value)
              }
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Casual</span>
              <span>Professional</span>
            </div>
          </div>
        </div>

        {/* Concise / Detailed Slider */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-center">Detail Level</h3>
          <div className="space-y-2">
            <Slider
              value={[detailedValue]}
              onValueChange={(value) => handleSliderChange("detailed", value)}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Concise</span>
              <span>Detailed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
