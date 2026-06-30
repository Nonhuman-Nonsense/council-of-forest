import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import "@testing-library/jest-dom";
import About from "@main/overlay/About";

vi.mock("@/utils", () => ({
  useMobile: () => false,
  usePortrait: () => false,
}));

describe("About", () => {
  it("renders body copy and credit line with contact links", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    );

    expect(screen.getByText(/ancient pine say about deforestation/)).toBeInTheDocument();
    expect(screen.getByText(/a project by/)).toBeInTheDocument();
    expect(screen.getByText(/in collaboration with/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Nonhuman Nonsense" })[0]).toHaveAttribute(
      "href",
      "/#contact",
    );
    expect(screen.getByRole("link", { name: /Biosphere Area Vindelälven-Juhttátahkka/ })).toHaveAttribute(
      "href",
      "/#contact",
    );
  });
});
