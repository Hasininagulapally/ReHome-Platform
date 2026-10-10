import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Search from '../pages/Search';
import { ItemsContext } from '../context/itemsContextDef';
import { itemsService } from '../services/api';

vi.mock('../services/api', () => ({
  itemsService: {
    getItems: vi.fn()
  }
}));

const sampleSearchItems = [
  {
    _id: 'item-1',
    id: 'item-1',
    title: 'Fabric 3-Seater Sofa',
    description: 'Charcoal sofa in good condition',
    category: 'Furniture',
    condition: 'Gently Used',
    price: 0,
    isFree: true,
    location: { city: 'Bangalore', address: 'Indiranagar' },
    distanceKm: 0.5,
    images: ['https://example.com/sofa.jpg'],
    owner: { name: 'Priya' }
  },
  {
    _id: 'item-2',
    id: 'item-2',
    title: 'Solid Teak Study Table',
    description: 'Study table with drawers',
    category: 'Furniture',
    condition: 'Like New',
    price: 35,
    isFree: false,
    location: { city: 'Bangalore', address: 'Koramangala' },
    distanceKm: 2.5,
    images: ['https://example.com/table.jpg'],
    owner: { name: 'Rahul' }
  }
];

const mockSearchContext = {
  items: sampleSearchItems,
  savedItemIds: [],
  toggleSaveItem: vi.fn(),
  user: null
};

const renderSearchPage = (initialEntries = ['/search']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ItemsContext.Provider value={mockSearchContext}>
        <Search />
      </ItemsContext.Provider>
    </MemoryRouter>
  );
};

describe('Search Page & Server-side Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search header and populates items from API', async () => {
    itemsService.getItems.mockResolvedValueOnce({
      items: sampleSearchItems,
      total: 2,
      page: 1
    });

    renderSearchPage();

    expect(screen.getByText('Browse Household Items')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Fabric 3-Seater Sofa').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Solid Teak Study Table').length).toBeGreaterThan(0);
    });
  });

  it('triggers category filter request when a category pill is selected', async () => {
    itemsService.getItems.mockResolvedValue({
      items: [sampleSearchItems[0]],
      total: 1,
      page: 1
    });

    renderSearchPage();

    const furniturePill = screen.getByRole('button', { name: 'Furniture' });
    fireEvent.click(furniturePill);

    await waitFor(() => {
      expect(furniturePill).toHaveClass('active');
      expect(itemsService.getItems).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Furniture' })
      );
    });
  });

  it('filters to free items when "Free Items Only" radio is selected', async () => {
    itemsService.getItems.mockResolvedValue({
      items: [sampleSearchItems[0]],
      total: 1,
      page: 1
    });

    renderSearchPage();

    const freeRadio = screen.getByLabelText(/Free Items Only/i);
    fireEvent.click(freeRadio);

    await waitFor(() => {
      expect(itemsService.getItems).toHaveBeenCalledWith(
        expect.objectContaining({ freeOnly: 'true' })
      );
    });
  });

  it('displays empty state when zero results match filter criteria', async () => {
    itemsService.getItems.mockResolvedValue({
      items: [],
      total: 0,
      page: 1
    });

    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByText(/No items matched your search/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reset Search & Filters/i })).toBeInTheDocument();
    });
  });

  it('displays error alert when API call fails', async () => {
    itemsService.getItems.mockRejectedValueOnce({
      friendlyMessage: 'Server unreachable.'
    });

    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByText('Could not load listings')).toBeInTheDocument();
      expect(screen.getByText('Server unreachable.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });
});
