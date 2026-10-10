import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import { ItemsContext } from '../context/itemsContextDef';
import { authService } from '../services/api';

vi.mock('../services/api', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

const mockContext = {
  loginUser: vi.fn(),
  locations: ['Indiranagar, Bangalore', 'Koramangala, Bangalore'],
  setCurrentLocation: vi.fn()
};

const renderComponent = (ui) => {
  return render(
    <MemoryRouter>
      <ItemsContext.Provider value={mockContext}>
        {ui}
      </ItemsContext.Provider>
    </MemoryRouter>
  );
};

describe('Login & Register Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Page', () => {
    it('renders login form and demo fill button', () => {
      renderComponent(<Login />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      expect(screen.getByText('Fill demo credentials')).toBeInTheDocument();
    });

    it('populates demo credentials when Fill demo button is clicked', () => {
      renderComponent(<Login />);

      const demoBtn = screen.getByText('Fill demo credentials');
      fireEvent.click(demoBtn);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      expect(emailInput.value).toBe('priya@rehome.org');
    });

    it('submits credentials and calls loginUser on successful authentication', async () => {
      authService.login.mockResolvedValueOnce({
        token: 'mock-jwt-token',
        user: { id: 'u1', name: 'Priya Sharma', email: 'priya@rehome.org' }
      });

      renderComponent(<Login />);

      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'priya@rehome.org' }
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'password123' }
      });

      const submitBtn = screen.getByRole('button', { name: /Sign In to ReHome/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'priya@rehome.org',
          password: 'password123'
        });
        expect(mockContext.loginUser).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Priya Sharma' })
        );
      });
    });
  });

  describe('Register Page', () => {
    it('renders register form inputs including name, email, password, and agreement', () => {
      renderComponent(<Register />);

      expect(screen.getByText('Join ReHome')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Priya Sharma/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('priya@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('At least 6 characters')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Re-type your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Free Account/i })).toBeInTheDocument();
    });

    it('submits registration form with matching passwords', async () => {
      authService.register.mockResolvedValueOnce({
        token: 'new-user-jwt',
        user: { id: 'u2', name: 'Rohan Verma', email: 'rohan@example.com' }
      });

      renderComponent(<Register />);

      fireEvent.change(screen.getByPlaceholderText(/Priya Sharma/i), {
        target: { value: 'Rohan Verma' }
      });
      fireEvent.change(screen.getByPlaceholderText('priya@example.com'), {
        target: { value: 'rohan@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), {
        target: { value: 'secretPass123' }
      });
      fireEvent.change(screen.getByPlaceholderText('Re-type your password'), {
        target: { value: 'secretPass123' }
      });

      const submitBtn = screen.getByRole('button', { name: /Create Free Account/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          name: 'Rohan Verma',
          email: 'rohan@example.com',
          password: 'secretPass123',
          city: 'Indiranagar, Bangalore'
        });
        expect(mockContext.loginUser).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Rohan Verma' })
        );
      });
    });
  });
});
