import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Empty, Tag, Alert } from 'antd';
import {
  PlusOutlined,
  HeartOutlined,
  InboxOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useItems } from '../context/useItems';
import { itemsService } from '../services/api';
import './MyListings.css';

const STATUS_COLORS = {
  Available: 'success',
  Reserved: 'warning',
  'Given Away': 'default'
};

const MyListings = () => {
  const navigate = useNavigate();
  const { user, updateItemStatus } = useItems();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    itemsService
      .getMyListings({ limit: 50 })
      .then((data) => {
        if (cancelled) return;
        setListings(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.friendlyMessage || 'Could not load your listings.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, updateItemStatus, listings.length]);

  if (!user) {
    return (
      <div className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
        <Empty description="Sign in to see your listings">
          <Button type="primary" onClick={() => navigate('/login')}>Go to login</Button>
        </Empty>
      </div>
    );
  }

  const handleStatus = async (item) => {
    const next = item.status === 'Given Away' ? 'Available' : 'Given Away';
    await updateItemStatus(item.id, next);
    setListings((prev) => prev.map((l) => (l.id === item.id ? { ...l, status: next } : l)));
  };

  const handleDelete = async (item) => {
    try {
      await itemsService.deleteItem(item.id);
      setListings((prev) => prev.filter((l) => l.id !== item.id));
    } catch (err) {
      setError(err.friendlyMessage || 'Could not delete that listing.');
    }
  };

  return (
    <div className="my-listings-page">
      <div className="container" style={{ paddingTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0 }}>My Listings</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {loading ? 'Loading…' : `${listings.length} total listing${listings.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link to="/search">
            <Button>Browse all listings</Button>
          </Link>
        </div>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
        )}

        {!loading && listings.length === 0 && !error ? (
          <Empty
            image={<InboxOutlined style={{ fontSize: 48, color: 'var(--text-muted)' }} />}
            description="You haven't listed any items yet"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/')}>Post your first item</Button>
          </Empty>
        ) : (
          <div className="my-listings-grid">
            {listings.map((item) => (
              <div className="my-listing-card" key={item.id}>
                <div className="my-listing-thumb">
                  <img src={item.images?.[0]} alt={item.title} loading="lazy" />
                  <Tag color={STATUS_COLORS[item.status] || 'default'} className="my-listing-status">
                    {item.status}
                  </Tag>
                </div>
                <div className="my-listing-body">
                  <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>{item.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                    {item.price ? `$${item.price}` : 'Free'} • {item.location?.city || 'Location not set'}
                  </p>
                  <div className="my-listing-actions">
                    <Button size="small" onClick={() => navigate(`/item/${item.id}`)}>View</Button>
                    <Button size="small" icon={<HeartOutlined />} onClick={() => handleStatus(item)}>
                      {item.status === 'Given Away' ? 'Re-list' : 'Mark Given Away'}
                    </Button>
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;
