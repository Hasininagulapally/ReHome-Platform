import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ItemsProvider } from '../context/ItemsContext';
import { useItems } from '../context/useItems';
import { itemsService, authService } from '../services/api';

vi.mock('../services/api', () => ({
  itemsService: {
    getItems: vi.fn(),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
    updateItemStatus: vi.fn()
  },
  authService: {
    logout: vi.fn(),
    getStoredUser: vi.fn(() => null)
  }
}));

// Test consumer component
const TestConsumer = () => {
  const {
    items,
    itemsLoading,
    itemsError,
    user,
    loginUser,
    logoutUser,
    addItem,
    deleteItem,
    updateItemStatus,
    savedItemIds,
    toggleSaveItem
  } = useItems();

  return (
    <div>
      <span data-testid="items-count">{items.length}</span>
      <span data-testid="loading-state">{itemsLoading ? 'loading' : 'idle'}</span>
      <span data-testid="error-message">{itemsError || ''}</span>
      <span data-testid="user-name">{user?.name || 'anonymous'}</span>
      <span data-testid="saved-count">{savedItemIds.length}</span>
      <button onClick={() => loginUser({ id: 'u1', name: 'Tester' })}>Login</button>
      <button onClick={() => logoutUser()}>Logout</button>
      <button onClick={() => addItem({ title: 'New Test Sofa', price: 0, isFree: true })}>Add</button>
      <button onClick={() => deleteItem('api-1')}>Delete</button>
      <button onClick={() => updateItemStatus('api-1', 'Reserved')}>UpdateStatus</button>
      <button onClick={() => toggleSaveItem('item-999')}>ToggleSave</button>
    </div>
  );
};

describe('ItemsContext Provider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authService.getStoredUser.mockReturnValue(null);
  });

  it('populates items from itemsService.getItems on mount when API succeeds', async () => {
    const mockApiItems = [
      { _id: 'api-1', id: 'api-1', title: 'API Item 1', category: 'Furniture' },
      { _id: 'api-2', id: 'api-2', title: 'API Item 2', category: 'Books' }
    ];
    itemsService.getItems.mockResolvedValueOnce({ items: mockApiItems });

    render(
      <ItemsProvider>
        <TestConsumer />
      </ItemsProvider>
    );

    expect(screen.getByTestId('loading-state').textContent).toBe('loading');

    await waitFor(() => {
      expect(screen.getByTestId('items-count').textContent).toBe('2');
      expect(screen.getByTestId('loading-state').textContent).toBe('idle');
    });
  });

  it('handles API failure gracefully and sets itemsError', async () => {
    itemsService.getItems.mockRejectedValueOnce({ friendlyMessage: 'Failed to load items.' });

    render(
      <ItemsProvider>
        <TestConsumer />
      </ItemsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('items-count').textContent).toBe('0');
      expect(screen.getByTestId('error-message').textContent).toBe('Failed to load items.');
      expect(screen.getByTestId('loading-state').textContent).toBe('idle');
    });
  });

  it('manages user auth login and logout state correctly', async () => {
    itemsService.getItems.mockResolvedValue({ items: [] });

    render(
      <ItemsProvider>
        <TestConsumer />
      </ItemsProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('anonymous');

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('user-name').textContent).toBe('Tester');
    expect(localStorage.getItem('rehome_user')).toContain('Tester');

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('user-name').textContent).toBe('anonymous');
    expect(authService.logout).toHaveBeenCalled();
  });

  it('adds item via addItem and prepends to items list', async () => {
    const initialItems = [{ _id: 'api-1', id: 'api-1', title: 'Existing Item' }];
    itemsService.getItems.mockResolvedValueOnce({ items: initialItems });
    itemsService.createItem.mockResolvedValueOnce({
      item: { id: 'api-new', _id: 'api-new', title: 'New Test Sofa', price: 0, isFree: true }
    });

    render(
      <ItemsProvider>
        <TestConsumer />
      </ItemsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('items-count').textContent).toBe('1');
    });

    await act(async () => {
      screen.getByText('Add').click();
    });

    expect(itemsService.createItem).toHaveBeenCalledWith({
      title: 'New Test Sofa',
      price: 0,
      isFree: true
    });
    expect(screen.getByTestId('items-count').textContent).toBe('2');
  });

  it('manages saving and un-saving items', async () => {
    itemsService.getItems.mockResolvedValueOnce({ items: [] });

    render(
      <ItemsProvider>
        <TestConsumer />
      </ItemsProvider>
    );

    const initialSaved = Number(screen.getByTestId('saved-count').textContent);

    await act(async () => {
      screen.getByText('ToggleSave').click();
    });

    expect(Number(screen.getByTestId('saved-count').textContent)).toBe(initialSaved + 1);
    expect(localStorage.getItem('rehome_saved_items')).toContain('item-999');

    await act(async () => {
      screen.getByText('ToggleSave').click();
    });

    expect(Number(screen.getByTestId('saved-count').textContent)).toBe(initialSaved);
    expect(localStorage.getItem('rehome_saved_items')).not.toContain('item-999');
  });
});
