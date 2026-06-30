import { Trans, useTranslation } from "react-i18next";
import { useMobile, dvh } from "@/utils";
import { externalLinks } from "@/i18n/externalLinks";
import nonhumanLogo from "@assets/logos/nonhuman_nonsense_logo.png";
import biosphereLogo from "@assets/logos/logo_biosphere.svg?url";
import vinnovaLogo from "@assets/logos/logo_vinnova.webp";

/**
 * Contact Overlay
 *
 * Displays credits, logos, and contact information.
 * Lists the team, partners, and funding sources.
 */
function Contact(): React.ReactElement {
  const isMobile = useMobile();
  const { t } = useTranslation();

  const wrapper: React.CSSProperties = {
    width: "80vw",
    maxWidth: isMobile ? "550px" : "450px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  return (
    <div style={wrapper}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <a href="https://nonhuman-nonsense.com">
          <img
            alt="Nonhuman Nonsense"
            src={nonhumanLogo}
            style={{
              maxWidth: isMobile ? "80px" : "120px",
              height: isMobile ? "10" + dvh : "61px",
              minHeight: "30px",
              marginRight: "20px",
            }}
          />
        </a>
        <a href="https://vindelalvenbiosfar.se/">
          <img
            alt="Biosphere Area Vindelälven-Juhttátahkka"
            src={biosphereLogo}
            style={{
              maxWidth: isMobile ? "80px" : "150px",
              height: isMobile ? "10" + dvh : "100px",
              minHeight: "30px",
            }}
          />
        </a>
      </div>
      <p>
        <Trans i18nKey="contact.credits" components={externalLinks} />
      </p>
      <p>{t("contact.interviews")}</p>
      <p>
        <Trans i18nKey="contact.funding" components={externalLinks} />
      </p>
      <a href="https://www.vinnova.se/en/p/council-of-the-forest">
        <img
          alt={t("contact.fundingImageAlt")}
          src={vinnovaLogo}
          style={{
            width: "95vw",
            marginTop: "10px",
            maxWidth: "200px",
            height: isMobile ? "15vh" : "50px",
            minHeight: "45px",
          }}
        />
      </a>
    </div>
  );
}

export default Contact;
