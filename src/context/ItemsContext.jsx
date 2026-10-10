import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ItemsContext } from './itemsContextDef';
import { CATEGORIES } from '../data/mockData';
import { itemsService, authService } from '../services/api';

export const ItemsProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState(null);

  const [user, setUser] = useState(() => authService.getStoredUser());
  const [savedItemIds, setSavedItemIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rehome_saved_items')) || [];
    } catch {
      return [];
    }
  });

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const inFlight = useRef(null);

  const fetchItems = useCallback(async (force = false) => {
    // Avoid duplicate concurrent requests unless forced
    if (inFlight.current && !force) {
      return inFlight.current;
    }
    setItemsLoading(true);
    setItemsError(null);
    const promise = itemsService
      .getItems({ limit: 24, sortBy: 'newest' })
      .then((data) => {
        setItems(data.items || []);
        setItemsLoading(false);
      })
      .catch((err) => {
        setItemsError(err.friendlyMessage || 'Failed to load items.');
        setItemsLoading(false);
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    localStorage.setItem('rehome_saved_items', JSON.stringify(savedItemIds));
  }, [savedItemIds]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('rehome_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rehome_user');
    }
  }, [user]);

  // Re-fetch items when authentication state changes (own listings appear after login)
  const loginUser = (userData) => {
    setUser(userData);
    fetchItems(true);
  };

  const logoutUser = () => {
    authService.logout();
    setUser(null);
    fetchItems(true);
  };

  const addItem = async (newItemData) => {
    // Throws on failure — callers must handle errors and show feedback
    const res = await itemsService.createItem(newItemData);
    if (res?.item) {
      setItems((prev) => [res.item, ...prev.filter((it) => it.id !== res.item.id)]);
    }
    return res?.item;
  };

  const deleteItem = async (itemId) => {
    await itemsService.deleteItem(itemId);
    setItems((prev) => prev.filter((it) => (it._id || it.id) !== itemId));
  };

  const updateItemStatus = async (itemId, status) => {
    const res = await itemsService.updateItemStatus(itemId, status);
    setItems((prev) =>
      prev.map((it) => ((it._id || it.id) === itemId ? { ...it, status: res.item.status } : it))
    );
    return res.item;
  };

  const toggleSaveItem = (itemId) => {
    setSavedItemIds((prev) => {
      const exists = prev.some((id) => String(id) === String(itemId));
      return exists
        ? prev.filter((id) => String(id) !== String(itemId))
        : [...prev, String(itemId)];
    });
  };

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('rehome:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('rehome:unauthorized', handleUnauthorized);
    };
  }, []);

  const openPostModal = () => setIsPostModalOpen(true);
  const closePostModal = () => setIsPostModalOpen(false);

  return (
    <ItemsContext.Provider
      value={{
        items,
        itemsLoading,
        itemsError,
        refreshItems: () => fetchItems(true),
        categories: CATEGORIES,
        savedItemIds,
        toggleSaveItem,
        addItem,
        deleteItem,
        updateItemStatus,
        user,
        loginUser,
        logoutUser,
        isPostModalOpen,
        openPostModal,
        closePostModal
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
};

export default ItemsProvider;
