import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ItemsContext } from '../context/itemsContextDef';

const renderNavbarWithContext = (contextOverrides = {}) => {
  const defaultContext = {
    currentLocation: 'Indiranagar, Bangalore',
    setCurrentLocation: vi.fn(),
    locations: ['Indiranagar, Bangalore', 'Koramangala, Bangalore'],
    user: null,
    logoutUser: vi.fn(),
    openPostModal: vi.fn(),
    ...contextOverrides
  };

  return {
    ...render(
      <MemoryRouter>
        <ItemsContext.Provider value={defaultContext}>
          <Navbar />
        </ItemsContext.Provider>
      </MemoryRouter>
    ),
    context: defaultContext
  };
};

describe('Navbar Component', () => {
  it('renders logo, brand name, and navigation links correctly', () => {
    renderNavbarWithContext();

    expect(screen.getByText('ReHome')).toBeInTheDocument();
    expect(screen.getByText('Reuse Locally')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText(/Browse Items/i)).toBeInTheDocument();
  });

  it('renders Login and Register links when user is logged out', () => {
    renderNavbarWithContext({ user: null });

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Priya')).not.toBeInTheDocument();
  });

  it('renders user greeting and avatar when user is logged in', () => {
    renderNavbarWithContext({
      user: { name: 'Priya Sharma', email: 'priya@rehome.org' }
    });

    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('calls openPostModal when Post an Item button is clicked', () => {
    const { context } = renderNavbarWithContext();

    const postBtn = screen.getByRole('button', { name: /Post an Item/i });
    fireEvent.click(postBtn);

    expect(context.openPostModal).toHaveBeenCalledTimes(1);
  });
});
