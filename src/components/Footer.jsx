import React from 'react';
import { Link } from 'react-router-dom';
import {
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  GithubOutlined,
  TwitterOutlined,
  InstagramOutlined,
  LinkedinOutlined
} from '@ant-design/icons';
import { CATEGORIES } from '../data/mockData';
import './Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="rehome-footer">
      <div className="container">
        {/* Top Feature Highlights Bar */}
        <div className="footer-highlights-grid">
          <div className="footer-highlight-item">
            <div className="highlight-icon-box">
              <EnvironmentOutlined />
            </div>
            <div>
              <h4 className="highlight-title">Hyper-Local Discovery</h4>
              <p className="highlight-desc">Find items within 1-5 km from trusted neighbors</p>
            </div>
          </div>
          <div className="footer-highlight-item">
            <div className="highlight-icon-box">
              <SafetyCertificateOutlined />
            </div>
            <div>
              <h4 className="highlight-title">Safe & Verified</h4>
              <p className="highlight-desc">Direct neighbor-to-neighbor pickups with user ratings</p>
            </div>
          </div>
          <div className="footer-highlight-item">
            <div className="highlight-icon-box">
              <ThunderboltOutlined />
            </div>
            <div>
              <h4 className="highlight-title">Circular & Zero Waste</h4>
              <p className="highlight-desc">Extending the life of quality furniture and appliances</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="footer-main-grid">
          {/* Brand Info */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <div className="footer-brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 21V12H15V21" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="footer-brand-name">ReHome</span>
            </div>
            <p className="footer-mission-text">
              ReHome is a local platform designed to give unused household items a second life
              by connecting neighbors to share furniture, appliances, books, and electronics.
            </p>
            <div className="footer-social-links">
              <a href="#twitter" aria-label="Twitter"><TwitterOutlined /></a>
              <a href="#instagram" aria-label="Instagram"><InstagramOutlined /></a>
              <a href="#linkedin" aria-label="LinkedIn"><LinkedinOutlined /></a>
              <a href="#github" aria-label="GitHub"><GithubOutlined /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Explore</h4>
            <ul className="footer-links-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/search">Browse All Items</Link></li>
              <li><Link to="/search?freeOnly=true">Free Giveaways</Link></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><Link to="/register">Join the Community</Link></li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div className="footer-col">
            <h4 className="footer-col-title">Categories</h4>
            <ul className="footer-links-list">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/search?category=${encodeURIComponent(cat.name)}`}>
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Locations */}
          <div className="footer-col">
            <h4 className="footer-col-title">Top Local Hubs</h4>
            <ul className="footer-links-list">
              <li><Link to="/search?location=Indiranagar">Indiranagar</Link></li>
              <li><Link to="/search?location=Koramangala">Koramangala</Link></li>
              <li><Link to="/search?location=HSR%20Layout">HSR Layout</Link></li>
              <li><Link to="/search?location=Whitefield">Whitefield</Link></li>
              <li><Link to="/search?location=Jayanagar">Jayanagar</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="footer-bottom-bar">
          <div className="copyright-text">
            © {CURRENT_YEAR} ReHome Technologies Inc. All rights reserved.
          </div>
          <div className="footer-bottom-links">
            <a href="#privacy">Privacy Policy</a>
            <span>•</span>
            <a href="#terms">Terms of Service</a>
            <span>•</span>
            <a href="#safety">Community Safety Pledge</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
