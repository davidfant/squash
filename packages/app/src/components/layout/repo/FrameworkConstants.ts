import type { Framework } from "./types";

export const frameworks: Framework[] = [
  { value: "next.js", icon: "/logos/nextjs.svg", display: "Next.js" },
  { value: "react", icon: "/logos/react.svg", display: "React" },
  { value: "vue", icon: "/logos/vue.svg", display: "Vue" },
  { value: "angular", icon: "/logos/angular.svg", display: "Angular" },
  { value: "nuxt", icon: "/logos/nuxt.svg", display: "Nuxt" },
  { value: "sveltekit", icon: "/logos/svelte.svg", display: "SvelteKit" },
  { value: "remix", icon: "/logos/remix.svg", display: "Remix" },
  { value: "gatsby", icon: "/logos/gatsby.svg", display: "Gatsby" },
  { value: "astro", icon: "/logos/astro.svg", display: "Astro" },
  { value: "vite", icon: "/logos/vite.svg", display: "Vite" },
];

export const getFrameworkIcon = (name: string): string | undefined => {
  const framework = frameworks.find(f => 
    f.value.toLowerCase() === name.toLowerCase() ||
    f.display.toLowerCase() === name.toLowerCase()
  );
  return framework?.icon;
};

export const getFrameworkDisplay = (name: string): string => {
  const framework = frameworks.find(f => 
    f.value.toLowerCase() === name.toLowerCase() ||
    f.display.toLowerCase() === name.toLowerCase()
  );
  return framework?.display || name;
}; 