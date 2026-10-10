import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Skeleton, Alert, Descriptions, Button, Empty } from 'antd';
import { UserOutlined, ShoppingOutlined, HeartOutlined } from '@ant-design/icons';
import { useItems } from '../context/useItems';
import { userService } from '../services/api';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useItems();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    userService
      .getProfile(user.id)
      .then((data) => {
        if (cancelled) return;
        setProfile(data.user || null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.friendlyMessage || 'Could not load your profile.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return (
      <div className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
        <Empty description="Sign in to view your profile">
          <Button type="primary" onClick={() => navigate('/login')}>Go to login</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container" style={{ paddingTop: 32, maxWidth: 720 }}>
        <h1 style={{ marginBottom: 24 }}>My Profile</h1>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {loading ? (
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        ) : (
          <div className="profile-card">
            <div className="profile-header">
              <Avatar size={72} icon={<UserOutlined />} />
              <div>
                <h2 style={{ margin: 0 }}>{profile?.name || user.name}</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{user.email}</p>
              </div>
            </div>
            <Descriptions bordered column={1} style={{ marginTop: 24 }}>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="City">{profile?.city || '—'}</Descriptions.Item>
              <Descriptions.Item label="Member since">
                {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString() : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Active listings">
                {profile?.activeListingsCount ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Total listings">
                {profile?.totalListingsCount ?? '—'}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <Button icon={<ShoppingOutlined />} onClick={() => navigate('/my-listings')}>
                My Listings
              </Button>
              <Button icon={<HeartOutlined />} onClick={() => navigate('/saved')}>
                Saved Items
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
