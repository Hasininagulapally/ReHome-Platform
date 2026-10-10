import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Select,
  Radio,
  Slider,
  Button,
  Empty,
  Drawer,
  Tag,
  Skeleton,
  Alert,
  Pagination,
  Checkbox
} from 'antd';
import { FilterOutlined, ClearOutlined, ReloadOutlined } from '@ant-design/icons';
import { itemsService } from '../services/api';
import { CATEGORIES } from '../data/mockData';
import SearchBar from '../components/SearchBar';
import ItemCard from '../components/ItemCard';
import './Search.css';

const CONDITIONS_OPTIONS = [
  { value: 'all', label: 'Any Condition' },
  { value: 'New', label: 'New' },
  { value: 'Like New', label: 'Like New' },
  { value: 'Gently Used', label: 'Gently Used' },
  { value: 'Good', label: 'Good' },
  { value: 'Fair', label: 'Fair' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' }
];

const PRICE_PRESETS = [
  { value: 'all', label: 'Any Price (Free & Paid)' },
  { value: 'free', label: 'Free Items Only' },
  { value: 'under30', label: 'Under $30' },
  { value: 'under100', label: 'Under $100' }
];

const FilterPanel = ({
  selectedCategory,
  setSelectedCategory,
  priceFilter,
  setPriceFilter,
  selectedCondition,
  setSelectedCondition,
  maxDistance,
  setMaxDistance,
  freeOnlyChecked,
  setFreeOnlyChecked,
  onReset,
  activeFiltersCount
}) => {
  return (
    <div className="filter-panel-inner">
      {/* Category Filter */}
      <div className="filter-group">
        <label className="filter-label" id="category-filter-label">Category</label>
        <div className="category-pill-list" role="group" aria-labelledby="category-filter-label">
          <button
            type="button"
            className={`category-pill-btn ${selectedCategory.toLowerCase() === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            All Items
          </button>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`category-pill-btn ${selectedCategory.toLowerCase() === c.name.toLowerCase() ? 'active' : ''}`}
              onClick={() => setSelectedCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Option */}
      <div className="filter-group">
        <label className="filter-label">Price</label>
        <Radio.Group
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value)}
          className="filter-radio-list"
        >
          {PRICE_PRESETS.map((p) => (
            <Radio key={p.value} value={p.value}>
              {p.label}
            </Radio>
          ))}
        </Radio.Group>
      </div>

      {/* Condition */}
      <div className="filter-group">
        <label className="filter-label" htmlFor="condition-select">Item Condition</label>
        <Select
          id="condition-select"
          value={selectedCondition}
          onChange={(val) => setSelectedCondition(val)}
          style={{ width: '100%' }}
          options={CONDITIONS_OPTIONS}
        />
      </div>

      {/* Free Only */
      }
      <div className="filter-group">
        <Checkbox
          checked={freeOnlyChecked}
          onChange={(e) => setFreeOnlyChecked(e.target.checked)}
        >
          Free giveaways only
        </Checkbox>
      </div>

      {/* Max price slider — visual helper bound to under-30/under-100 presets */}
      <div className="filter-group">
        <div className="filter-slider-header">
          <label className="filter-label" htmlFor="distance-slider">Max Distance</label>
          <span className="slider-value-badge">{maxDistance} km radius</span>
        </div>
        <Slider
          id="distance-slider"
          min={1}
          max={15}
          value={maxDistance}
          onChange={(val) => setMaxDistance(val)}
        />
        <div className="slider-ticks" aria-hidden="true">
          <span>1 km</span>
          <span>5 km</span>
          <span>15 km</span>
        </div>
      </div>

      {/* Reset Button */}
      <Button
        block
        icon={<ClearOutlined />}
        onClick={onReset}
        className="reset-filters-btn"
        disabled={activeFiltersCount === 0}
      >
        Reset All Filters
      </Button>
    </div>
  );
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL-driven search state — the single source of truth
  const queryParam = searchParams.get('q') || '';
  const cityParam = searchParams.get('city') || '';
  const categoryParam = searchParams.get('category') || 'All';
  const conditionParam = searchParams.get('condition') || 'all';
  const priceParam = searchParams.get('price');
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Derived filter values
  const effectiveCategory = categoryParam && categoryParam !== 'All' ? categoryParam : 'All';
  const priceFilter = priceParam ? PRICE_PRESETS.find((p) => p.value === priceParam)?.value || 'all' : 'all';
  const freeOnlyChecked = searchParams.get('freeOnly') === 'true';
  const maxDistanceParam = parseInt(searchParams.get('distance') || '15', 10);

  // Server data state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const requestId = useRef(0);

  // Active category/condition selection derived
  const selectedCondition = conditionParam;
  const effectivePrice = freeOnlyChecked ? 'free' : priceFilter;

  // Build server query params — server-side filtering, requested each change
  const serverParams = useMemo(() => {
    const params = { page: pageParam, limit: 12, sortBy: 'newest' };
    if (queryParam) params.q = queryParam;
    if (cityParam) params.city = cityParam;
    if (effectiveCategory && effectiveCategory !== 'All') params.category = effectiveCategory;
    if (selectedCondition && selectedCondition !== 'all') params.condition = selectedCondition;
    if (freeOnlyChecked) params.freeOnly = 'true';
    if (priceFilter === 'free') params.freeOnly = 'true';
    if (priceFilter === 'under30') {
      params.minPrice = 1;
      params.maxPrice = 30;
    } else if (priceFilter === 'under100') {
      params.minPrice = 1;
      params.maxPrice = 100;
    }
    return params;
  }, [queryParam, cityParam, effectiveCategory, selectedCondition, freeOnlyChecked, priceFilter, pageParam]);

  // Debounced re-fetch when URL params change
  useEffect(() => {
    const currentRequest = ++requestId.current;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await itemsService.getItems(serverParams);
        if (requestId.current !== currentRequest) return; // stale — discard
        setItems(data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      } catch (err) {
        if (requestId.current !== currentRequest) return;
        setError(err.friendlyMessage || err.response?.data?.message || 'Failed to load listings.');
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [serverParams]);

  const updateParams = (updater, resetPage = true) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        updater(next);
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: false }
    );
  };

  const setParam = (key, value, defaultValue) => {
    updateParams((params) => {
      if (!value || value === defaultValue) params.delete(key);
      else params.set(key, value);
    });
  };

  const handleCategory = (value) => setParam('category', value, 'all');
  const handlePriceFilter = (value) => {
    updateParams((params) => {
      params.delete('freeOnly');
      if (value === 'all') params.delete('price');
      else params.set('price', value);
    });
  };
  const handleFreeOnlyChange = (checked) =>
    updateParams((params) => {
      if (checked) params.set('freeOnly', 'true');
      else params.delete('freeOnly');
    });
  const handleCondition = (value) => setParam('condition', value, 'all');
  const handleDistance = (val) => updateParams((params) => params.set('distance', String(val)), false);
  const handlePage = (page) => {
    updateParams((params) => {
      if (page > 1) params.set('page', String(page));
      else params.delete('page');
    }, false);
  };

  const activeFilters = [
    queryParam && { label: `"${queryParam}"`, clear: () => setParam('q', '') },
    cityParam && { label: `Near: ${cityParam}`, clear: () => setParam('city', '') },
    effectiveCategory !== 'All' && { label: effectiveCategory, clear: () => handleCategory('All') },
    priceFilter !== 'all' && {
      label: PRICE_PRESETS.find((p) => p.value === (freeOnlyChecked ? 'free' : priceFilter))?.label,
      clear: () => {
        updateParams((params) => {
          params.delete('freeOnly');
          params.delete('price');
        });
      }
    },
    selectedCondition !== 'all' && {
      label: CONDITIONS_OPTIONS.find((c) => c.value === selectedCondition)?.label,
      clear: () => handleCondition('all')
    }
  ].filter(Boolean);

  const activeFiltersCount = activeFilters.length + (freeOnlyChecked && priceFilter !== 'free' ? 1 : 0);

  const handleResetFilters = () => {
    navigate('/search', { replace: true });
  };

  const totalPages = Math.ceil(total / 12) || 1;

  return (
    <div className="rehome-search-page">
      {/* Top Search Banner */}
      <div className="search-page-header">
        <div className="container">
          <div className="search-banner-inner">
            <h1 className="search-header-title">Browse Household Items</h1>
            <p className="search-header-sub">
              Explore nearby pre-loved furniture, appliances, electronics &amp; more
            </p>
            <div className="search-bar-wrap">
              <SearchBar initialQuery={queryParam} initialLocation={cityParam} size="large" />
            </div>
          </div>
        </div>
      </div>

      <div className="container search-body-container">
        {/* Active Filter Chips & Bar */}
        <div className="search-controls-bar">
          <div className="search-count-box" aria-live="polite">
            <span className="count-number">{loading ? '—' : total}</span>
            <span className="count-text">
              {loading ? 'Searching…' : `${total === 1 ? 'item' : 'items'} found`}
              {queryParam ? ` for "${queryParam}"` : ''}
              {cityParam ? ` in ${cityParam}` : ''}
            </span>
          </div>

          <div className="search-sort-and-mobile-filter">
            <button
              type="button"
              className="mobile-filter-toggle-btn"
              onClick={() => setMobileFilterOpen(true)}
              aria-expanded={mobileFilterOpen}
            >
              <FilterOutlined /> Filters ({activeFiltersCount})
            </button>

            <div className="sort-box">
              <label className="sort-label" htmlFor="sort-select">Sort by:</label>
              <Select
                id="sort-select"
                value="newest"
                style={{ width: 170 }}
                options={SORT_OPTIONS}
                onChange={(val) => setParam('sortBy', val, 'newest')}
              />
            </div>
          </div>
        </div>

        {/* Applied filter chips */}
        {activeFiltersCount > 0 && (
          <div className="active-filters-row" aria-label="Applied filters">
            {activeFilters.map(
              (f, i) =>
                f && (
                  <Tag
                    key={i}
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      f.clear();
                    }}
                    className="active-filter-chip"
                  >
                    {f.label}
                  </Tag>
                )
            )}
            {freeOnlyChecked && priceFilter !== 'free' && (
              <Tag closable onClose={() => handleFreeOnlyChange(false)} className="active-filter-chip">
                Free Only
              </Tag>
            )}
            <Button size="small" type="link" onClick={handleResetFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="search-layout">
          {/* Desktop Left Sidebar Filters */}
          <aside className="search-sidebar-desktop" aria-label="Search filters">
            <div className="sidebar-sticky-wrapper">
              <div className="sidebar-header">
                <span className="sidebar-title">Filter Results</span>
              </div>
              <FilterPanel
                selectedCategory={effectiveCategory}
                setSelectedCategory={handleCategory}
                priceFilter={effectivePrice}
                setPriceFilter={handlePriceFilter}
                selectedCondition={selectedCondition}
                setSelectedCondition={handleCondition}
                maxDistance={maxDistanceParam}
                setMaxDistance={handleDistance}
                freeOnlyChecked={freeOnlyChecked}
                setFreeOnlyChecked={handleFreeOnlyChange}
                onReset={handleResetFilters}
                activeFiltersCount={activeFiltersCount}
              />
            </div>
          </aside>

          {/* Results Grid */}
          <main className="search-results-main">
            {error && (
              <Alert
                type="error"
                showIcon
                message="Could not load listings"
                description={error}
                action={
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => updateParams(() => {}, false)}>
                    Retry
                  </Button>
                }
              />
            )}

            {!error && loading && (
              <div className="search-items-grid" aria-busy="true" aria-label="Loading listings">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div className="rehome-item-card skeleton-card" key={i}>
                    <Skeleton.Image style={{ width: '100%', height: 180 }} active />
                    <div style={{ padding: 14 }}>
                      <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!error && !loading && items.length === 0 && (
              <div className="search-empty-state">
                <Empty
                  description={
                    <div>
                      <h3>No items matched your search</h3>
                      <p>Try widening your distance radius or clearing some filters.</p>
                    </div>
                  }
                >
                  <Button type="primary" onClick={handleResetFilters}>
                    Reset Search &amp; Filters
                  </Button>
                </Empty>
              </div>
            )}

            {!error && !loading && items.length > 0 && (
              <>
                <div className="search-items-grid">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="search-pagination" style={{ marginTop: 32, textAlign: 'center' }}>
                    <Pagination
                      current={pageParam}
                      total={total}
                      pageSize={12}
                      onChange={handlePage}
                      showSizeChanger={false}
                      hideOnSinglePage
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        title="Filter Items"
        placement="left"
        onClose={() => setMobileFilterOpen(false)}
        open={mobileFilterOpen}
        size={320}
      >
        <FilterPanel
          selectedCategory={effectiveCategory}
          setSelectedCategory={handleCategory}
          priceFilter={effectivePrice}
          setPriceFilter={handlePriceFilter}
          selectedCondition={selectedCondition}
          setSelectedCondition={handleCondition}
          maxDistance={maxDistanceParam}
          setMaxDistance={handleDistance}
          freeOnlyChecked={freeOnlyChecked}
          setFreeOnlyChecked={handleFreeOnlyChange}
          onReset={handleResetFilters}
          activeFiltersCount={activeFiltersCount}
        />
        <Button
          type="primary"
          block
          style={{ marginTop: 20 }}
          onClick={() => setMobileFilterOpen(false)}
        >
          Apply Filters ({total} {total === 1 ? 'item' : 'items'})
        </Button>
      </Drawer>
    </div>
  );
};

export default Search;
