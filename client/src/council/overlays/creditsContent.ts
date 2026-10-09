import nonhumanLogo from "@assets/logos/nonhuman_nonsense_logo.png";
import biosphereLogo from "@assets/logos/logo_biosphere.svg?url";
import vinnovaLogo from "@assets/logos/logo_vinnova.webp";
import type { CreditGroup, CreditLogo } from "./creditsTypes";

/**
 * Who made Council of Forest, as its credits roll (Credits.tsx). This file differs between Council
 * of Foods and Council of Forest; the intro and funding lines are `credits.*` in the locales.
 */
export const CREDIT_GROUPS: CreditGroup[] = [
  {
    credits: [
      { role: { name: "Nonhuman Nonsense" }, names: ["Leo Fidjeland", "Linnea Våglund", "Filips Staņislavskis"] },
      { role: { key: "credits.biosphereCollaborator" }, names: ["Daniela Nedelcheva"] },
    ],
  },
  {
    headingKey: "credits.interviews",
    credits: [
      { role: { name: "Gran Sameby" }, names: ["Marja Skum"] },
      { role: { name: "Ran Sameby" }, names: ["Göran Jonsson", "Maidi Eira-Andersson"] },
      { role: { name: "Rewilding Sweden" }, names: ["Anders Granér"] },
      { role: { key: "credits.fisheriesConsultant" }, names: ["Daniel Holmqvist"] },
      { role: { key: "credits.forestryConsultant" }, names: ["Erik Alnersson"] },
      { role: { key: "credits.forester" }, names: ["Isak Landström"] },
      { role: { name: "Kullar & Klang" }, names: ["Tommy Sandström", "Lisa Jonsson"] },
      { role: { name: "Gold of Lapland" }, names: ["Cecilia Wallinder"] },
      { role: { name: "Naturskyddsföreningen" }, names: ["Angelika Schindler-Egl"] },
      { role: { name: "Green Industries" }, names: ["Bertil Nygren"] },
    ],
  },
  {
    headingKey: "credits.support",
    credits: [
      { role: { key: "credits.filmProduction" }, names: ["Johannes Rydinger"] },
      { role: { key: "credits.animationProduction" }, names: ["Gundega Strauberga"] },
      { role: { key: "credits.programming" }, names: ["Albin Karlsson"] },
      { role: { key: "credits.soundDesign" }, names: ["Jonas Thunberg"] },
      { role: { key: "credits.catalogueTranslation" }, names: ["Mats Svensson"] },
    ],
  },
];

/** The logos at the end of the roll, row by row. */
export const CREDIT_LOGOS: CreditLogo[][] = [
  [
    { src: nonhumanLogo, alt: { name: "Nonhuman Nonsense" }, maxWidth: 120, height: 61 },
    { src: biosphereLogo, alt: { name: "Biosphere Area Vindelälven-Juhttátahkka" }, maxWidth: 150, height: 100 },
  ],
  [{ src: vinnovaLogo, alt: { key: "contact.fundingImageAlt" }, maxWidth: 200, height: 50 }],
];
