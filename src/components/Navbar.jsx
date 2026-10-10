import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Dropdown, Drawer, Space, Avatar } from 'antd';
import {
  PlusOutlined,
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  HeartOutlined,
  ProfileOutlined
} from '@ant-design/icons';
import { useItems } from '../context/useItems';
import './Navbar.css';

const Navbar = () => {
  const { user, logoutUser, openPostModal } = useItems();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <div style={{ padding: '4px 0' }}>
          <strong>{user?.name || 'Community Member'}</strong>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.email || ''}</div>
        </div>
      )
    },
    { type: 'divider' },
    {
      key: 'my-items',
      label: 'My Listings',
      icon: <ShoppingOutlined />,
      onClick: () => navigate('/my-listings')
    },
    {
      key: 'saved',
      label: 'Saved Items',
      icon: <HeartOutlined />,
      onClick: () => navigate('/saved')
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => {
        logoutUser();
        navigate('/');
      }
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="rehome-navbar-wrapper">
      <div className="container">
        <div className="rehome-navbar">
          {/* Brand Logo */}
          <Link to="/" className="rehome-brand">
            <div className="rehome-brand-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 21V12H15V21" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7.5" r="1.5" fill="#059669" />
              </svg>
            </div>
            <div className="rehome-brand-text">
              <span className="brand-name">ReHome</span>
              <span className="brand-tag">Reuse Locally</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="rehome-nav-links" aria-label="Main navigation">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/search" className={`nav-link ${isActive('/search') ? 'active' : ''}`}>
              Browse Items
            </Link>
            {user && (
              <Link to="/my-listings" className={`nav-link ${isActive('/my-listings') ? 'active' : ''}`}>
                <ProfileOutlined /> My Listings
              </Link>
            )}
          </nav>

          {/* Action Buttons */}
          <div className="rehome-nav-actions">
            {user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                <button className="nav-user-profile" type="button" aria-label={`Account menu for ${user.name}`}>
                  <Avatar style={{ backgroundColor: '#059669' }} icon={<UserOutlined />} />
                  <span className="nav-user-name">{user.name?.split(' ')[0]}</span>
                </button>
              </Dropdown>
            ) : (
              <div className="auth-links-group">
                <Link to="/login" className="login-link">
                  Login
                </Link>
                <Link to="/register" className="register-link">
                  Register
                </Link>
              </div>
            )}

            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="post-item-btn"
              onClick={openPostModal}
            >
              Post an Item
            </Button>

            {/* Mobile Hamburger Button */}
            <button
              className="mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle Navigation"
              aria-expanded={mobileMenuOpen}
            >
              <MenuOutlined />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title={
          <div className="rehome-brand">
            <div className="rehome-brand-logo small">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="#059669" strokeWidth="2.2"/>
              </svg>
            </div>
            <span className="brand-name">ReHome</span>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        className="rehome-mobile-drawer"
      >
        <div className="mobile-drawer-content">
          <div className="mobile-nav-list">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/search" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-item ${isActive('/search') ? 'active' : ''}`}>
              Browse Items
            </Link>
            {user && (
              <Link to="/my-listings" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-item">
                My Listings
              </Link>
            )}
            {user && (
              <Link to="/saved" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-item">
                Saved Items
              </Link>
            )}
            {user && (
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-item">
                Profile
              </Link>
            )}
          </div>

          <div className="mobile-auth-section">
            {user ? (
              <div className="mobile-user-card">
                <div className="mobile-user-header">
                  <Avatar style={{ backgroundColor: '#059669' }} icon={<UserOutlined />} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>
                </div>
                <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                  <Button
                    block
                    onClick={() => {
                      logoutUser();
                      setMobileMenuOpen(false);
                      navigate('/');
                    }}
                  >
                    Logout
                  </Button>
                </Space>
              </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
                  Login
                </Button>
                <Button block type="dashed" onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}>
                  Register
                </Button>
              </Space>
            )}

            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              size="large"
              style={{ marginTop: 16, backgroundColor: 'var(--primary)' }}
              onClick={() => {
                setMobileMenuOpen(false);
                openPostModal();
              }}
            >
              Post an Item
            </Button>
          </div>
        </div>
      </Drawer>
    </header>
  );
};

export default Navbar;
