import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import { ItemsContext } from '../context/itemsContextDef';

const sampleItem = {
  _id: 'item-101',
  id: 'item-101',
  title: 'Solid Teak Study Table',
  description: 'Study table in great shape',
  category: 'Furniture',
  condition: 'Like New',
  price: 35,
  isFree: false,
  location: 'Indiranagar, Bangalore',
  distance: '0.8 km away',
  images: ['https://example.com/table.jpg'],
  owner: { name: 'Priya Sharma', verified: true }
};

const renderItemCard = (item = sampleItem, contextOverrides = {}) => {
  const defaultContext = {
    savedItemIds: [],
    toggleSaveItem: vi.fn(),
    ...contextOverrides
  };

  return {
    ...render(
      <MemoryRouter>
        <ItemsContext.Provider value={defaultContext}>
          <ItemCard item={item} />
        </ItemsContext.Provider>
      </MemoryRouter>
    ),
    context: defaultContext
  };
};

describe('ItemCard Component', () => {
  it('renders item details correctly including title, category, and price', () => {
    renderItemCard();

    expect(screen.getByText('Solid Teak Study Table')).toBeInTheDocument();
    expect(screen.getByText('Furniture')).toBeInTheDocument();
    expect(screen.getByText('Like New')).toBeInTheDocument();
    expect(screen.getByText('$35')).toBeInTheDocument();
    expect(screen.getByText(/Listed by Priya Sharma/i)).toBeInTheDocument();
  });

  it('renders FREE badge when item is free', () => {
    const freeItem = {
      ...sampleItem,
      _id: 'free-item-1',
      price: 0,
      isFree: true
    };
    renderItemCard(freeItem);

    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });

  it('toggles saved status when favorite button is clicked', () => {
    const { context } = renderItemCard();

    const saveBtn = screen.getByLabelText('Save item');
    fireEvent.click(saveBtn);

    expect(context.toggleSaveItem).toHaveBeenCalledWith('item-101');
  });

  it('displays filled heart when item is saved', () => {
    renderItemCard(sampleItem, { savedItemIds: ['item-101'] });

    expect(screen.getByLabelText('Remove from saved')).toBeInTheDocument();
  });
});
