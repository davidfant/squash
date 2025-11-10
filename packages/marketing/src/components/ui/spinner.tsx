import * as React from "react";

type SpinnerProps = Omit<React.SVGProps<SVGSVGElement>, "children">;

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* counter-clockwise background dots */}
      <g
        className="origin-center animate-[spin_4s_linear_infinite_reverse]"
        fill="currentColor"
        opacity="0.5"
      >
        <circle cx="8" cy="2.75" r="0.75" />
        <circle cx="13.25" cy="8" r="0.75" />
        <circle cx="2.75" cy="8" r="0.75" />
        <circle cx="4.3" cy="4.29" r="0.75" />
        <circle cx="11.7" cy="4.29" r="0.75" />
        <circle cx="4.3" cy="11.72" r="0.75" />
        <circle cx="11.7" cy="11.72" r="0.75" />
        <circle cx="8" cy="13.25" r="0.75" />
      </g>

      {/* clockwise stroke */}
      <circle
        className="origin-center animate-spin animation-duration-[1s]"
        cx="8"
        cy="8"
        r="5.25"
        pathLength={360}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="90 270"
        strokeDashoffset={100}
        strokeWidth={1.5}
      />
    </svg>
  )
);
