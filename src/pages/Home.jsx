import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Skeleton, Alert, Empty } from 'antd';
import {
  CompassOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  CheckCircleFilled
} from '@ant-design/icons';
import { useItems } from '../context/useItems';
import SearchBar from '../components/SearchBar';
import CategoryCard from '../components/CategoryCard';
import ItemCard from '../components/ItemCard';
import { HOW_IT_WORKS_STEPS } from '../data/mockData';
import './Home.css';

const QUICK_SEARCH_TAGS = [
  'Sofa',
  'Study Table',
  'Office Chair',
  'Refrigerator',
  'Bookshelf',
  'Washing Machine'
];

const Home = () => {
  const navigate = useNavigate();
  const { items, itemsLoading, itemsError, categories, openPostModal, refreshItems } = useItems();
  const [activeFilter, setActiveFilter] = useState('all');

  // Filter nearby items
  const filteredNearbyItems = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.filter((item) => {
      if (!item) return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'free') return Boolean(item.isFree || item.price === 0);
      if (activeFilter === 'furniture') return item.category?.toLowerCase() === 'furniture';
      if (activeFilter === 'appliances') return item.category?.toLowerCase() === 'appliances';
      if (activeFilter === 'available') return item.status === 'Available';
      return true;
    });
  }, [items, activeFilter]);

  return (
    <div className="rehome-home-page">
      {/* 1. HERO SECTION */}
      <section className="home-hero-section">
        <div className="container">
          <div className="hero-content-wrapper">
            {/* Pill Badge */}
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              <span>Hyper-Local Reuse Marketplace</span>
            </div>

            {/* Main Headings */}
            <h1 className="hero-heading">
              Give Unused Things a <span className="highlight-text">Second Life</span>
            </h1>
            <p className="hero-subtitle">
              Discover useful household items available near you.
            </p>

            {/* Large Search Bar */}
            <div className="hero-search-wrapper">
              <SearchBar size="large" />
            </div>

            {/* Quick Keyword Chips */}
            <div className="hero-quick-tags">
              <span className="tags-label">Popular nearby:</span>
              <div className="tags-list">
                {QUICK_SEARCH_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="quick-tag-chip"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics */}            <div className="hero-metrics-bar">
              <div className="metric-item">
                <span className="metric-number">Free</span>
                <span className="metric-label">to join &amp; list</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <span className="metric-number">1–15 km</span>
                <span className="metric-label">neighborhood pickup</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <span className="metric-number">Zero</span>
                <span className="metric-label">commission or fees</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES SECTION */}
      <section id="categories" className="home-categories-section section-padding">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-pretitle">BROWSE BY CATEGORY</span>
              <h2 className="section-title">Household Essentials In Your Area</h2>
            </div>
            <Link to="/search" className="section-view-all">
              View all items <ArrowRightOutlined />
            </Link>
          </div>

          <div className="categories-grid">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. NEARBY ITEMS SECTION */}
      <section className="home-nearby-section section-padding">
        <div className="container">            <div className="section-header">
            <div>
              <span className="section-pretitle">CURRENTLY AVAILABLE</span>
              <h2 className="section-title">Fresh Listings from Your Neighbors</h2>
            </div>          {/* Filter Pills */}
          <div className="nearby-filter-pills" role="group" aria-label="Filter nearby items">
              <button
                className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All Nearby
              </button>
              <button
                className={`filter-pill ${activeFilter === 'free' ? 'active' : ''}`}
                onClick={() => setActiveFilter('free')}
              >
                Free Only
              </button>
              <button
                className={`filter-pill ${activeFilter === 'furniture' ? 'active' : ''}`}
                onClick={() => setActiveFilter('furniture')}
              >
                Furniture
              </button>
              <button
                className={`filter-pill ${activeFilter === 'appliances' ? 'active' : ''}`}
                onClick={() => setActiveFilter('appliances')}
              >
                Appliances
              </button>
              <button
                className={`filter-pill ${activeFilter === 'available' ? 'active' : ''}`}
                onClick={() => setActiveFilter('available')}
              >
                Available Now
              </button>
            </div>
          </div>

          {/* Loading / Error / Empty / Items Grid */}
          {itemsLoading && items.length === 0 ? (
            <div className="nearby-items-grid" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div className="rehome-item-card skeleton-card" key={i}>
                  <Skeleton.Image style={{ width: '100%', height: 180 }} active />
                </div>
              ))}
            </div>
          ) : itemsError && items.length === 0 ? (
            <Alert
              type="error"
              showIcon
              message="Could not load items"
              description={itemsError}
              action={<Button size="small" onClick={refreshItems}>Retry</Button>}
            />
          ) : filteredNearbyItems.length === 0 ? (
            <Empty description="No items to show yet — be the first to post something!">
              <Button type="primary" onClick={openPostModal}>Post an Item</Button>
            </Empty>
          ) : (
            <div className="nearby-items-grid">
              {filteredNearbyItems.slice(0, 6).map((item) => (
                <ItemCard key={item.id || item._id} item={item} />
              ))}
            </div>
          )}

          {/* Browse More CTA */}
          <div className="nearby-more-cta">
            <Button
              type="primary"
              size="large"
              className="explore-more-btn"
              onClick={() => navigate('/search')}
              icon={<CompassOutlined />}
            >
              Explore All Items Near You
            </Button>
          </div>
        </div>
      </section>

      {/* 4. HOW REHOME WORKS SECTION */}
      <section id="how-it-works" className="home-how-it-works-section section-padding">
        <div className="container">
          <div className="how-it-works-header">
            <span className="section-pretitle">SIMPLE & LOCAL</span>
            <h2 className="section-title">How ReHome Works</h2>
            <p className="how-it-works-sub">
              Giving and claiming quality household goods in 4 straightforward steps.
            </p>
          </div>

          <div className="how-steps-grid">
            {HOW_IT_WORKS_STEPS.map((stepItem, index) => (
              <div key={stepItem.step} className="how-step-card">
                <div className="step-number-badge">{stepItem.step}</div>
                <div className="step-card-content">
                  <h3 className="step-title">{stepItem.title}</h3>
                  <h4 className="step-subtitle">{stepItem.subtitle}</h4>
                  <p className="step-description">{stepItem.description}</p>
                </div>
                {index < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="step-connector-arrow">
                    <ArrowRightOutlined />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. COMMUNITY POST BANNER (STARTUP CTA) */}
      <section className="home-cta-banner">
        <div className="container">
          <div className="cta-banner-card">
            <div className="cta-content">
              <span className="cta-pill">Zero Commission • 100% Free to List</span>
              <h2 className="cta-heading">
                Decluttering your living room or moving soon?
              </h2>
              <p className="cta-text">
                Pass on your pre-loved furniture, appliances, or books to neighbors who need them.
                List an item in under 60 seconds with simple doorstep pickup.
              </p>
              <div className="cta-actions">
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  className="cta-post-btn"
                  onClick={openPostModal}
                >
                  Post an Item Now
                </Button>
                <Link to="/search?freeOnly=true">
                  <Button size="large" className="cta-secondary-btn">
                    Browse Free Giveaways
                  </Button>
                </Link>
              </div>
            </div>
            <div className="cta-stats-box">
              <div className="stat-row">
                <CheckCircleFilled className="stat-check" />
                <span>Coordinate pickup directly with real neighbors</span>
              </div>
              <div className="stat-row">
                <CheckCircleFilled className="stat-check" />
                <span>AI auto-categorization and neighborhood distance</span>
              </div>
              <div className="stat-row">
                <CheckCircleFilled className="stat-check" />
                <span>Reduce city landfill waste with circular reuse</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
