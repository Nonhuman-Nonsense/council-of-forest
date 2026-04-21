import forestBg from "./forest.avif";
import forestBgSmall from "./forest-small.avif";

/** Vite-resolved forest stage backgrounds (content-hashed in production → `/assets/`). */
export const forestBackgroundUrls = {
    default: forestBg,
    small: forestBgSmall,
} as const;
