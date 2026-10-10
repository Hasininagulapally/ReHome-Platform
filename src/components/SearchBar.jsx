import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import './SearchBar.css';

/**
 * Global search entry point. Submits to /search with URL params;
 * the Search page performs server-side filtering via the API.
 */
const SearchBar = ({ initialQuery = '', initialLocation = '', size = 'large', onSearchSubmit }) => {
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQuery);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  const handleSearch = (e) => {
    if (e) e.preventDefault();

    if (onSearchSubmit) {
      onSearchSubmit({ query: query.trim(), location: selectedLocation.trim() });
      return;
    }

    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedLocation.trim()) params.set('city', selectedLocation.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className={`rehome-search-container ${size}`}>
      <form className="rehome-search-bar" onSubmit={handleSearch} role="search">
        {/* Item Search Input */}
        <div className="search-field query-field">
          <SearchOutlined className="search-field-icon" aria-hidden="true" />
          <label htmlFor="rehome-search-input" className="sr-only">Search listings</label>
          <input
            id="rehome-search-input"
            type="search"
            className="search-input-box"
            placeholder="What are you looking for? (e.g. Sofa, Study Table, Fridge)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search listings by keyword"
          />
        </div>

        <div className="search-divider" aria-hidden="true" />

        {/* Location Selector — free text city, sent to server as a filter */}
        <div className="search-field location-field">
          <EnvironmentOutlined className="search-field-icon" aria-hidden="true" />
          <label htmlFor="rehome-location-input" className="sr-only">Location</label>
          <input
            id="rehome-location-input"
            type="text"
            className="search-input-box"
            placeholder="Your city or area (optional)"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            aria-label="Filter by city or area"
          />
        </div>

        {/* Search Submit Button */}
        <Button
          type="primary"
          icon={<SearchOutlined />}
          className="search-submit-btn"
          htmlType="submit"
          size={size === 'large' ? 'large' : 'middle'}
        >
          Search
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;
