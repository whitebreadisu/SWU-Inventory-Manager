import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: mockUseAuth,
}));

vi.mock('./screens/auth/AuthScreen', () => ({
  AuthScreen: () => <p>auth-screen</p>,
}));

vi.mock('./components/CatalogPage', () => ({
  CatalogPage: () => <p>catalog-page</p>,
}));

vi.mock('./screens/inventory/InventoryPage', () => ({
  InventoryPage: () => <p>inventory-page</p>,
}));

describe('App auth gate', () => {
  it('shows a loading state while auth resolves', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, logout: vi.fn() });
    render(<App />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows the auth screen when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    render(<App />);
    expect(screen.getByText('auth-screen')).toBeInTheDocument();
  });

  it('shows the app when signed in', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'a@b.com' }, loading: false, logout: vi.fn() });
    render(<App />);
    expect(screen.getByText('catalog-page')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });
});
