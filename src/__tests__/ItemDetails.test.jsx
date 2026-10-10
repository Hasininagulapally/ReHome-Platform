import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ItemDetails from '../pages/ItemDetails';
import { ItemsContext } from '../context/itemsContextDef';
import { itemsService } from '../services/api';

vi.mock('../services/api', () => ({
  itemsService: {
    getItemById: vi.fn(),
    updateItemStatus: vi.fn(),
    deleteItem: vi.fn()
  }
}));

const sampleItem = {
  _id: 'item-101',
  id: 'item-101',
  title: 'Solid Teak Study Table',
  description: 'Solid wood table in pristine condition.',
  category: 'Furniture',
  condition: 'Like New',
  price: 0,
  isFree: true,
  status: 'Available',
  location: {
    address: '100 Feet Rd',
    city: 'Bangalore'
  },
  distanceKm: 0.8,
  images: ['https://example.com/table.jpg'],
  owner: {
    _id: 'user-priya',
    name: 'Priya Sharma',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  createdAt: '2026-03-01T00:00:00.000Z'
};

const renderItemDetails = ({ itemId = 'item-101', contextOverrides = {} } = {}) => {
  const defaultContext = {
    items: [sampleItem],
    savedItemIds: [],
    toggleSaveItem: vi.fn(),
    user: null,
    deleteItem: vi.fn(),
    updateItemStatus: vi.fn(),
    ...contextOverrides
  };

  return render(
    <MemoryRouter initialEntries={[`/item/${itemId}`]}>
      <ItemsContext.Provider value={defaultContext}>
        <Routes>
          <Route path="/item/:id" element={<ItemDetails />} />
        </Routes>
      </ItemsContext.Provider>
    </MemoryRouter>
  );
};

describe('ItemDetails Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders item title, description, category, price, and owner details from API', async () => {
    itemsService.getItemById.mockResolvedValueOnce({ item: sampleItem });

    renderItemDetails({ itemId: 'item-101' });

    expect(screen.getByRole('generic', { busy: true })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Solid Teak Study Table').length).toBeGreaterThan(0);
      expect(screen.getByText('Solid wood table in pristine condition.')).toBeInTheDocument();
      expect(screen.getAllByText('Furniture').length).toBeGreaterThan(0);
      expect(screen.getByText('Condition: Like New')).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('0.8 km away')).toBeInTheDocument();
      expect(screen.getAllByText(/Free/i).length).toBeGreaterThan(0);
    });
  });

  it('renders "Item not found" and link to browse items on 404', async () => {
    itemsService.getItemById.mockRejectedValueOnce({
      response: { status: 404 }
    });

    renderItemDetails({ itemId: 'non-existent-id' });

    await waitFor(() => {
      expect(screen.getByText('Item not found')).toBeInTheDocument();
      expect(
        screen.getByText('The requested household item may have already been rehomed or removed.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Browse Items/i })).toBeInTheDocument();
    });
  });

  it('renders error alert when API fails with generic error', async () => {
    itemsService.getItemById.mockRejectedValueOnce({
      friendlyMessage: 'Network error occurred.'
    });

    renderItemDetails({ itemId: 'item-101' });

    await waitFor(() => {
      expect(screen.getByText('Could not load this listing')).toBeInTheDocument();
      expect(screen.getByText('Network error occurred.')).toBeInTheDocument();
    });
  });

  it('opens pickup request modal and allows closing it', async () => {
    itemsService.getItemById.mockResolvedValueOnce({ item: sampleItem });

    renderItemDetails({ itemId: 'item-101' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Claim This Free Item/i })).toBeInTheDocument();
    });

    const claimBtn = screen.getByRole('button', { name: /Claim This Free Item/i });
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(screen.getByText(/Contact Priya Sharma/i)).toBeInTheDocument();
      expect(screen.getByText(/Regarding: Solid Teak Study Table/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
  });

  it('displays owner management controls when logged in user is the owner', async () => {
    itemsService.getItemById.mockResolvedValueOnce({ item: sampleItem });

    renderItemDetails({
      itemId: 'item-101',
      contextOverrides: {
        user: { id: 'user-priya', name: 'Priya Sharma' }
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Manage this listing/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mark Reserved/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mark Given Away/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    });
  });
});
