const getTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const getToolkitLogo = (toolkit: string) =>
  `https://static.squash.build/logos/${getTheme()}/${toolkit}`;
