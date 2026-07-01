import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Contact from "@main/overlay/Contact";

vi.mock("@/utils", () => ({
  useMobile: () => false,
  dvh: "vh",
}));

describe("Contact", () => {
  it("renders credits and funding with external links", () => {
    render(<Contact />);

    const creditsParagraph = screen.getByText(/developed in collaboration with/).closest("p");
    expect(creditsParagraph).not.toBeNull();
    expect(
      creditsParagraph!.querySelector('a[href="https://nonhuman-nonsense.com"]'),
    ).toHaveTextContent("Nonhuman Nonsense");

    const biosphereLinks = screen.getAllByRole("link", { name: /Biosphere Area Vindelälven-Juhttátahkka/ });
    expect(biosphereLinks.some((link) => link.getAttribute("href") === "https://vindelalvenbiosfar.se/")).toBe(true);

    expect(
      screen.getByRole("link", { name: "Gundega Strauberga" }),
    ).toHaveAttribute("href", "https://www.gundegastrauberga.com/");

    expect(
      screen.getByRole("link", { name: "Vinnova (ref. nr. 2025-00344)" }),
    ).toHaveAttribute("href", "https://www.vinnova.se/en/p/council-of-the-forest");

    expect(
      screen.getByRole("link", { name: "Council of Foods" }),
    ).toHaveAttribute("href", "https://council-of-foods.com/");

    expect(
      screen.getByRole("link", {
        name: /Horizon Europe research and innovation programme under grant agreement 101069990/,
      }),
    ).toHaveAttribute("href", "https://cordis.europa.eu/project/id/101069990");
  });

  it("renders interview credits", () => {
    render(<Contact />);

    expect(screen.getByText(/Based on interviews with Marja Skum/)).toBeInTheDocument();
  });

  it("renders Vinnova funding image alt text from i18n", () => {
    render(<Contact />);

    expect(
      screen.getByRole("img", { name: "Funded by Vinnova" }),
    ).toBeInTheDocument();
  });
});
