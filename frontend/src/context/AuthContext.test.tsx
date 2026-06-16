import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const { authStateCallbacks, mockSignOut } = vi.hoisted(() => ({
  authStateCallbacks: [] as Array<(user: unknown) => void>,
  mockSignOut: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
    authStateCallbacks.push(cb);
    return vi.fn();
  }),
  signOut: mockSignOut,
}));

function Consumer() {
  const { user, loading, logout } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p>{user ? `signed in as ${(user as { email: string }).email}` : "signed out"}</p>
      <button onClick={() => logout()}>Log Out</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    authStateCallbacks.length = 0;
    mockSignOut.mockClear();
  });

  it("shows a loading state until onAuthStateChanged fires", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("reports signed-out once onAuthStateChanged resolves to null", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    act(() => authStateCallbacks[0](null));
    expect(screen.getByText("signed out")).toBeInTheDocument();
  });

  it("reports the signed-in user once onAuthStateChanged resolves", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    act(() => authStateCallbacks[0]({ email: "a@b.com" }));
    expect(screen.getByText("signed in as a@b.com")).toBeInTheDocument();
  });

  it("logout calls firebase signOut", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    act(() => authStateCallbacks[0]({ email: "a@b.com" }));
    screen.getByRole("button", { name: /log out/i }).click();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
