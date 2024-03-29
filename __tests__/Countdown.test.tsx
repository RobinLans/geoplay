import { render, screen, waitFor } from "@testing-library/react";

import "@testing-library/jest-dom";
import Countdown from "../components/Countdown";

describe("Countdown", () => {
  const setCountdownStarted = jest.fn();
  const setGameStarted = jest.fn();

  it("renders a '3' in the beginning", () => {
    render(
      <Countdown
        setCountdownStarted={setCountdownStarted}
        setGameStarted={setGameStarted}
      />
    );

    const divElement = screen.getByText("3");

    expect(divElement).toBeInTheDocument();
  });

  test('after 1 second the "3" should become a "2"', async () => {
    render(
      <Countdown
        setCountdownStarted={setCountdownStarted}
        setGameStarted={setGameStarted}
      />
    );

    await new Promise((r) => setTimeout(r, 1000));

    await waitFor(() => {
      const divElement = screen.getByText("2");

      expect(divElement).toBeInTheDocument();
    });
  });
});
