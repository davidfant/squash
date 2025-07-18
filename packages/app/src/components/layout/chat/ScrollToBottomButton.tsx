import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const MotionButton = motion.create(Button);

export function ScrollToBottomButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <MotionButton
          // initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.5 }}
          size="icon"
          variant="outline"
          onClick={onClick}
          className="absolute left-1/2 bottom-12 z-10 flex -translate-x-1/2 shadow-lg backdrop-blur rounded-full"
        >
          <ChevronDown className="h-5 w-5 shrink-0" />
        </MotionButton>
      )}
    </AnimatePresence>
  );
}
