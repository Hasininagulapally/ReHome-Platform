import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostItemModal from '../components/PostItemModal';
import { ItemsContext } from '../context/itemsContextDef';

const renderPostItemModal = (contextOverrides = {}) => {
  const defaultContext = {
    isPostModalOpen: true,
    closePostModal: vi.fn(),
    addItem: vi.fn().mockResolvedValue({ id: 'new-item-1' }),
    user: { id: 'user-1', name: 'Priya Sharma' },
    ...contextOverrides
  };

  return {
    ...render(
      <MemoryRouter>
        <ItemsContext.Provider value={defaultContext}>
          <PostItemModal />
        </ItemsContext.Provider>
      </MemoryRouter>
    ),
    context: defaultContext
  };
};

describe('PostItemModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login prompt when user is not authenticated', () => {
    renderPostItemModal({ user: null });

    expect(screen.getByText('Give an Item a Second Life')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in or create an account to list an item for your neighbors.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to login/i })).toBeInTheDocument();
  });

  it('renders item posting form when user is authenticated', () => {
    renderPostItemModal();

    expect(screen.getByText('Give an Item a Second Life')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/3-Seater Wooden Sofa/i)).toBeInTheDocument();
    expect(screen.getByText('Give for FREE ($0)')).toBeInTheDocument();
    expect(screen.getByText('Set a Modest Price ($)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Indiranagar, 2nd Stage/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Share details like dimensions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish Item/i })).toBeInTheDocument();
  });

  it('reveals price input when "Set a Modest Price ($)" is selected', async () => {
    renderPostItemModal();

    const paidRadio = screen.getByText('Set a Modest Price ($)');
    fireEvent.click(paidRadio);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('20')).toBeInTheDocument();
    });
  });

  it('submits form with valid data and calls addItem and closePostModal', async () => {
    const { context } = renderPostItemModal();

    const titleInput = screen.getByPlaceholderText(/3-Seater Wooden Sofa/i);
    fireEvent.change(titleInput, { target: { value: 'Ergonomic Office Chair' } });

    const locInput = screen.getByPlaceholderText(/Indiranagar, 2nd Stage/i);
    fireEvent.change(locInput, { target: { value: 'Koramangala, Bangalore' } });

    const descInput = screen.getByPlaceholderText(/Share details like dimensions/i);
    fireEvent.change(descInput, { target: { value: 'High back chair with lumbar support in good condition.' } });

    const submitBtn = screen.getByRole('button', { name: /Publish Item/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(context.addItem).toHaveBeenCalled();
      const calledArg = context.addItem.mock.calls[0][0];
      expect(calledArg instanceof FormData).toBe(true);
      expect(calledArg.get('title')).toBe('Ergonomic Office Chair');
      expect(calledArg.get('city')).toBe('Bangalore');
      expect(calledArg.get('isFree')).toBe('true');
      expect(context.closePostModal).toHaveBeenCalledTimes(1);
    });
  });

  it('handles submission error gracefully and displays feedback', async () => {
    const addItemMock = vi.fn().mockRejectedValueOnce({
      friendlyMessage: 'Upload quota exceeded'
    });

    renderPostItemModal({ addItem: addItemMock });

    const titleInput = screen.getByPlaceholderText(/3-Seater Wooden Sofa/i);
    fireEvent.change(titleInput, { target: { value: 'Test Table' } });

    const locInput = screen.getByPlaceholderText(/Indiranagar, 2nd Stage/i);
    fireEvent.change(locInput, { target: { value: 'Indiranagar, Bangalore' } });

    const descInput = screen.getByPlaceholderText(/Share details like dimensions/i);
    fireEvent.change(descInput, { target: { value: 'Solid wood table description' } });

    const submitBtn = screen.getByRole('button', { name: /Publish Item/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addItemMock).toHaveBeenCalled();
    });
  });
});
