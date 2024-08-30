export const cleanContent = (content: string) =>
  content
    ?.replaceAll("\r", "")
    .replaceAll(/^"/g, "")
    .replaceAll(/"$/g, "")
    .replaceAll(/^\n+/gm, "\n")
    .replaceAll(/^\n$/gm, "")
    .replaceAll(/^\s*[\r\n]/gm, "")
    .trim();

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);