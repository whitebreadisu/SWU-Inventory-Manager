import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthScreen } from "./AuthScreen";

const { mockSignIn, mockSignUp } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
  signInWithEmailAndPassword: mockSignIn,
  createUserWithEmailAndPassword: mockSignUp,
}));

describe("AuthScreen", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignUp.mockReset();
  });

  it("defaults to the login form", () => {
    render(<AuthScreen />);
    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^log in$/i })).toBeInTheDocument();
  });

  it("switches to the signup form", () => {
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole("button", { name: /need an account/i }));
    expect(screen.getByRole("heading", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign up$/i })).toBeInTheDocument();
  });

  it("submits login credentials to signInWithEmailAndPassword", async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<AuthScreen />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret1" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^log in$/i }));
    });
    expect(mockSignIn).toHaveBeenCalledWith({}, "a@b.com", "secret1");
  });

  it("submits signup credentials to createUserWithEmailAndPassword", async () => {
    mockSignUp.mockResolvedValue(undefined);
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole("button", { name: /need an account/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "new@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret1" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    });
    expect(mockSignUp).toHaveBeenCalledWith({}, "new@b.com", "secret1");
  });

  it("shows a friendly message for a known error code", async () => {
    mockSignIn.mockRejectedValue(Object.assign(new Error("bad"), { code: "auth/wrong-password" }));
    render(<AuthScreen />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpass" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^log in$/i }));
    });
    expect(screen.getByText("Incorrect password.")).toBeInTheDocument();
  });
});
