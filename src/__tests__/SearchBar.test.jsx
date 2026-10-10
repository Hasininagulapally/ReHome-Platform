import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { ItemsContext } from '../context/itemsContextDef';

const renderSearchBar = (props = {}, contextOverrides = {}) => {
  const defaultContext = {
    locations: ['Indiranagar, Bangalore', 'Koramangala, Bangalore'],
    currentLocation: 'Indiranagar, Bangalore',
    setCurrentLocation: vi.fn(),
    ...contextOverrides
  };

  return {
    ...render(
      <MemoryRouter>
        <ItemsContext.Provider value={defaultContext}>
          <SearchBar {...props} />
        </ItemsContext.Provider>
      </MemoryRouter>
    ),
    context: defaultContext
  };
};

describe('SearchBar Component', () => {
  it('renders search input with placeholder and search button', () => {
    renderSearchBar();

    const input = screen.getByPlaceholderText(/What are you looking for/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('updates input value on typing', () => {
    renderSearchBar();

    const input = screen.getByPlaceholderText(/What are you looking for/i);
    fireEvent.change(input, { target: { value: 'Wooden Table' } });

    expect(input.value).toBe('Wooden Table');
  });

  it('calls onSearchSubmit callback with query and location on form submission', () => {
    const onSearchSubmit = vi.fn();
    renderSearchBar({ onSearchSubmit, initialQuery: 'Sofa' });

    const submitBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(submitBtn);

    expect(onSearchSubmit).toHaveBeenCalledTimes(1);
    expect(onSearchSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Sofa'
      })
    );
  });
});
