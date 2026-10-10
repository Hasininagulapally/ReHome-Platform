import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Skeleton, Alert } from 'antd';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useItems } from '../context/useItems';
import { itemsService } from '../services/api';
import ItemCard from '../components/ItemCard';
import './SavedItems.css';

const SavedItems = () => {
  const navigate = useNavigate();
  const { savedItemIds } = useItems();
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const savedKeys = savedItemIds.join(',');

  useEffect(() => {
    let cancelled = false;

    if (savedItemIds.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setSavedItems([]);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    // Fetch each saved item's current data from the real backend
    Promise.all(
      savedItemIds.map((id) =>
        itemsService.getItemById(id).then((d) => d.item).catch(() => null)
      )
    )
      .then((results) => {
        if (cancelled) return;
        setSavedItems(results.filter(Boolean));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load your saved items.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [savedKeys, savedItemIds]);

  return (
    <div className="saved-items-page">
      <div className="container" style={{ paddingTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0 }}>
              <HeartFilled style={{ color: '#ef4444', marginRight: 8 }} /> Saved Items
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {loading ? 'Loading…' : `${savedItems.length} saved item${savedItems.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button onClick={() => navigate('/search')}>Browse listings</Button>
        </div>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {loading ? (
          <Skeleton active />
        ) : savedItems.length === 0 ? (
          <Empty
            image={<HeartOutlined style={{ fontSize: 48, color: 'var(--text-muted)' }} />}
            description="You haven't saved anything yet"
          >
            <Button type="primary" onClick={() => navigate('/search')}>
              Discover items near you
            </Button>
          </Empty>
        ) : (
          <div className="search-items-grid">
            {savedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedItems;
