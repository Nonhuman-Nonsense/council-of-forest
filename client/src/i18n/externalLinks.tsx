import type { ReactElement } from "react";

const CORDIS_GRANT_URL = "https://cordis.europa.eu/project/id/101069990";
const VINNOVA_FOREST_URL = "https://www.vinnova.se/en/p/council-of-the-forest";

/** External anchors for <Trans components={externalLinks} /> — hrefs stay in code. */
export const externalLinks = {
  nhn: <a href="https://nonhuman-nonsense.com" />,
  biosphere: <a href="https://vindelalvenbiosfar.se/" />,
  gundega: <a href="https://www.gundegastrauberga.com/" />,
  albin: <a href="https://www.polymorf.se/" />,
  vinnova: <a href={VINNOVA_FOREST_URL} />,
  cof: <a href="https://council-of-foods.com/" />,
  horizon: <a href={CORDIS_GRANT_URL} />,
  grant: <a href={CORDIS_GRANT_URL} />,
  sos: <a href="https://studiootherspaces.net/" />,
  in4art: <a href="https://www.in4art.eu/" />,
  elliot: <a href="https://elliott.computer/" />,
  hec: <a href="https://starts.eu/hungryecocities/" />,
  starts: <a href="https://starts.eu/" />,
} as const satisfies Record<string, ReactElement>;
