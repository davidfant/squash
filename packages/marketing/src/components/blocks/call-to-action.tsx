import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

interface CallToActionProps {
  title?: string;
  description?: string;
  buttonText?: string;
  items: string[];
  onClick?: () => void;
}

export const CallToAction = ({
  title = "Call to Action",
  description = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Architecto illo praesentium nisi, accusantium quae.",
  buttonText = "Get Started",
  items,
  onClick,
}: CallToActionProps) => {
  return (
    <section>
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-center">
          <div className="max-w-5xl">
            <div className="bg-muted flex flex-col justify-between gap-8 rounded-lg p-6 md:flex-row md:p-12 md:items-center">
              <div className="md:w-1/2">
                <h4 className="mb-1 text-2xl md:text-3xl">{title}</h4>
                <p className="text-muted-foreground">{description}</p>
                <Button className="mt-6 hidden md:flex" onClick={onClick}>
                  {buttonText} <ArrowRight className="size-4" />
                </Button>
              </div>
              <div className="md:w-1/3">
                <ul className="flex flex-col space-y-2 text-sm font-medium">
                  {items.map((item, idx) => (
                    <li className="flex items-center" key={idx}>
                      <Check className="mr-4 size-4 shrink-0 text-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
