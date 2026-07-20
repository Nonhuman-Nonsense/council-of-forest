import { Link } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import { useMobile, usePortrait } from "@/utils";

function AboutContactLink({ children }: { children?: React.ReactNode }) {
  return <Link to={{ hash: "contact" }}>{children}</Link>;
}

/**
 * About Overlay
 *
 * Displays the project description ("What is this?").
 * Contains a link to switching to the "Contact" overlay via URL hash.
 */
function About(): React.ReactElement {
  const isMobile = useMobile();
  const isPortait = usePortrait();
  const { t } = useTranslation();

  const wrapper: React.CSSProperties = {
    width: isPortait ? "80vw" : undefined,
    maxWidth: isMobile ? "600px" : "550px",
  };

  return (
    <div style={wrapper}>
      <p style={{ whiteSpace: "pre-wrap" }}>{t("about.body")}</p>
      <p style={{ whiteSpace: "pre-wrap" }}>
        <Trans
          i18nKey="about.creditLine"
          components={[<AboutContactLink key="contact-link-0" />, <AboutContactLink key="contact-link-1" />]}
        />
      </p>
    </div>
  );
}

export default About;
