import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Button } from 'antd';
import {
  EnvironmentOutlined,
  HeartOutlined,
  HeartFilled,
  EyeOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useItems } from '../context/useItems';
import './ItemCard.css';

const getConditionColor = (condition) => {
  switch (condition?.toLowerCase()) {
    case 'like new':
      return 'success';
    case 'gently used':
      return 'processing';
    case 'good':
      return 'warning';
    default:
      return 'default';
  }
};

const ItemCard = ({ item }) => {
  const navigate = useNavigate();
  const { savedItemIds, toggleSaveItem } = useItems();
  const itemId = item._id || item.id;
  const isSaved = savedItemIds.some((sId) => String(sId) === String(itemId));

  const handleCardClick = () => {
    navigate(`/item/${itemId}`);
  };

  const handleSaveClick = (e) => {
    e.stopPropagation();
    toggleSaveItem(itemId);
  };

  return (
    <div className="rehome-item-card" onClick={handleCardClick} role="button" tabIndex={0}>
      {/* Top Image Box */}
      <div className="item-image-container">
        <img
          src={item.images?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80'}
          alt={item.title}
          className="item-card-image"
          loading="lazy"
        />

        {/* Favorite Button */}
        <button
          type="button"
          className={`favorite-action-btn ${isSaved ? 'saved' : ''}`}
          onClick={handleSaveClick}
          aria-label={isSaved ? 'Remove from saved' : 'Save item'}
        >
          {isSaved ? <HeartFilled style={{ color: '#ef4444' }} /> : <HeartOutlined />}
        </button>

        {/* Price / Free Badge overlay */}
        <div className="item-price-badge-wrap">
          {item.isFree || item.price === 0 ? (
            <span className="price-pill free">FREE</span>
          ) : (
            <span className="price-pill paid">${item.price}</span>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="item-card-body">
        {/* Meta Row: Category & Condition */}
        <div className="item-meta-row">
          <span className="item-category-tag">{item.category}</span>
          <Tag color={getConditionColor(item.condition)} className="item-condition-tag">
            {item.condition}
          </Tag>
        </div>

        {/* Title */}
        <h3 className="item-card-title" title={item.title}>
          {item.title}
        </h3>

        {/* Distance & Location */}
        <div className="item-location-row">
          <EnvironmentOutlined className="location-pin-icon" />
          <span className="item-distance-text">
            {item.distance || (item.distanceKm !== undefined ? `${item.distanceKm} km away` : 'Nearby')}
          </span>
          <span className="location-dot">•</span>
          <span className="item-locality-text">
            {typeof item.location === 'object'
              ? (item.location.address && item.location.city ? `${item.location.address}, ${item.location.city}` : item.location.address || item.location.city || '')
              : String(item.location || '')}
          </span>
        </div>

        {/* Owner Info Snippet */}
        {item.owner && (
          <div className="item-owner-snippet">
            <span className="owner-by-text">Listed by {item.owner.name}</span>
            {item.owner.verified && (
              <span className="verified-badge" title="Verified neighbor">
                <CheckCircleOutlined />
              </span>
            )}
          </div>
        )}

        {/* Bottom Action */}
        <div className="item-card-action">
          <Button
            type="default"
            block
            icon={<EyeOutlined />}
            className="view-details-btn"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/item/${itemId}`);
            }}
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
