import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InboxOutlined,
  LaptopOutlined,
  ThunderboltOutlined,
  ReadOutlined,
  CoffeeOutlined,
  AppstoreOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import './CategoryCard.css';

const ICON_MAP = {
  InboxOutlined: <InboxOutlined />,
  LaptopOutlined: <LaptopOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  ReadOutlined: <ReadOutlined />,
  CoffeeOutlined: <CoffeeOutlined />,
  AppstoreOutlined: <AppstoreOutlined />
};

const CategoryCard = ({ category }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/search?category=${encodeURIComponent(category.name)}`);
  };

  return (
    <div className="rehome-category-card" onClick={handleClick} role="button" tabIndex={0}>
      <div className="category-image-wrap">
        <img src={category.image} alt={category.name} className="category-img" loading="lazy" />
        <div className="category-overlay" />
        <div className="category-icon-badge">
          {ICON_MAP[category.icon] || <AppstoreOutlined />}
        </div>
      </div>
      <div className="category-content">
        <div className="category-header">
          <h3 className="category-title">{category.name}</h3>
          <span className="category-count">{category.itemCount}+ items</span>
        </div>
        <p className="category-desc">{category.description}</p>
        <div className="category-footer">
          <span className="category-explore-link">
            Explore nearby <ArrowRightOutlined className="explore-arrow" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;
