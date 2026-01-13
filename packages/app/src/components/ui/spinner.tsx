import { cn } from "@/lib/utils";
import React from "react";
import { LogoIcon } from "../Logo";

export const Spinner: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <LogoIcon className={cn(props.className, "spinner")} />
);
