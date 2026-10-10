import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Tag,
  Button,
  Avatar,
  Modal,
  Form,
  Input,
  message,
  Skeleton,
  Alert,
  Popconfirm
} from 'antd';
import {
  EnvironmentOutlined,
  HeartOutlined,
  HeartFilled,
  ShareAltOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useItems } from '../context/useItems';
import ItemCard from '../components/ItemCard';
import { itemsService } from '../services/api';
import './ItemDetails.css';

const { TextArea } = Input;

const formatDate = (dateStr) => {
  if (!dateStr) return 'recently';
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? '' : ''} ago`;
    return d.toLocaleDateString();
  } catch {
    return 'recently';
  }
};

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items: allItems, savedItemIds, toggleSaveItem, user, deleteItem, updateItemStatus } = useItems();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    let cancelled = false;
    window.scrollTo({ top: 0 });

    itemsService
      .getItemById(id)
      .then((data) => {
        if (cancelled) return;
        setItem(data.item || null);
        if (!data.item) setNotFound(true);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(err.friendlyMessage || 'Failed to load this listing.');
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container item-details-loading" style={{ padding: '48px 24px' }} aria-busy="true">
        <Skeleton active avatar paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container item-not-found-container">
        <h2>Item not found</h2>
        <p>The requested household item may have already been rehomed or removed.</p>
        <Link to="/search">
          <Button type="primary" icon={<ArrowLeftOutlined />}>
            Back to Browse Items
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '48px 24px' }}>
        <Alert type="error" showIcon message="Could not load this listing" description={error} />
      </div>
    );
  }

  const itemId = item._id || item.id;
  const isSaved = savedItemIds.some((sId) => String(sId) === String(itemId));
  const isOwner = user && (String(user.id) === String(item.owner?._id || item.owner?.id));
  const isAdmin = user?.role === 'admin';

  const locationText =
    typeof item.location === 'object' && item.location
      ? [item.location.address, item.location.city].filter(Boolean).join(', ') || item.location.city || ''
      : String(item.location || '');

  // Similar items come from the same loaded list (same category)
  const similarItems = allItems
    .filter((it) => it.id !== itemId && it.category === item.category)
    .slice(0, 3);

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        message.success('Item link copied to clipboard!');
      } else {
        message.info('Sharing link: ' + window.location.href);
      }
    } catch {
      message.info('Sharing link: ' + window.location.href);
    }
  };

  // Real status update via PATCH /api/items/:id/status
  const handleStatusChange = async (status) => {
    try {
      await updateItemStatus(itemId, status);
      const fresh = await itemsService.getItemById(itemId);
      setItem(fresh.item);
      message.success(`Listing marked as ${status}.`);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem(itemId);
      message.success('Listing deleted.');
      navigate('/search');
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete this listing.');
    }
  };

  // Pickup request is a client-side contact helper — it does not pretend to
  // notify the owner. It copies a structured message; real delivery requires
  // the messaging backend feature.
  const handleRequestSubmit = (values) => {
    const msg = values.message || '';
    navigator.clipboard?.writeText(msg).catch(() => {});
    setRequestSent(true);
    message.info('Message copied to clipboard — paste it into an email or SMS to the contact provided.');
    setIsRequestModalOpen(false);
    form.resetFields();
  };

  return (
    <div className="rehome-item-details-page">
      <div className="container">
        {/* Breadcrumb Bar */}
        <div className="details-breadcrumb-bar">
          <Breadcrumb
            items={[
              { title: <Link to="/">Home</Link> },
              { title: <Link to="/search">Browse Items</Link> },
              {
                title: (
                  <Link to={`/search?category=${encodeURIComponent(item.category)}`}>
                    {item.category}
                  </Link>
                )
              },
              { title: item.title }
            ]}
          />
        </div>

        {/* Main Details Grid */}
        <div className="details-main-grid">
          {/* Left Column: Photos Gallery */}
          <div className="details-gallery-col">
            <div className="gallery-main-image-wrap">
              <img
                src={item.images?.[activeImageIdx] || item.images?.[0]}
                alt={item.title}
                className="gallery-main-img"
                loading="lazy"
              />
              <div className="gallery-status-badge">
                {item.isFree || item.price === 0 ? (
                  <span className="details-price-badge free">FREE ITEM</span>
                ) : (
                  <span className="details-price-badge paid">${item.price}</span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {item.images && item.images.length > 1 && (
              <div className="gallery-thumbnails-row">
                {item.images.map((imgUrl, index) => (
                  <button
                    type="button"
                    key={index}
                    className={`thumb-btn ${activeImageIdx === index ? 'active' : ''}`}
                    onClick={() => setActiveImageIdx(index)}
                    aria-label={`View image ${index + 1}`}
                    aria-current={activeImageIdx === index}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information & Actions */}
          <div className="details-info-col">
            <div className="details-header-card">
              {/* Tags Row */}
              <div className="details-tags-row">
                <Tag color="green" className="details-category-tag">
                  {item.category}
                </Tag>
                <Tag color="blue" className="details-condition-tag">
                  Condition: {item.condition}
                </Tag>
                <Tag
                  color={
                    item.status === 'Available' ? 'success' : item.status === 'Reserved' ? 'warning' : 'default'
                  }
                >
                  {item.status}
                </Tag>
                <span className="details-time-posted">
                  <ClockCircleOutlined /> Listed {formatDate(item.createdAt)}
                </span>
              </div>

              {/* Title */}
              <h1 className="details-item-title">{item.title}</h1>

              {/* Location & Distance */}
              <div className="details-location-banner">
                <EnvironmentOutlined className="details-loc-icon" aria-hidden="true" />
                <div className="details-loc-info">
                  <span className="details-distance-bold">
                    {item.distanceKm !== undefined ? `${item.distanceKm} km away` : 'Local pickup'}
                  </span>
                  <span className="details-location-name">{locationText && `in ${locationText}`}</span>
                </div>
              </div>

              {/* Price Display */}
              <div className="details-price-display">
                {item.isFree || item.price === 0 ? (
                  <div className="price-tag-big free">
                    <span className="price-amount">Free</span>
                    <span className="price-note">No payment required • Community giveaway</span>
                  </div>
                ) : (
                  <div className="price-tag-big paid">
                    <span className="price-amount">${item.price}</span>
                    <span className="price-note">Fixed neighbor price • Cash or UPI on pickup</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="details-primary-actions">
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<MessageOutlined />}
                  className="request-pickup-btn"
                  onClick={() => setIsRequestModalOpen(true)}
                  disabled={item.status === 'Given Away'}
                >
                  {requestSent
                    ? 'Request message copied'
                    : item.isFree
                      ? 'Claim This Free Item'
                      : 'Message the Owner'}
                </Button>

                <div className="details-secondary-buttons">
                  <Button
                    size="large"
                    icon={isSaved ? <HeartFilled style={{ color: '#ef4444' }} /> : <HeartOutlined />}
                    onClick={() => toggleSaveItem(itemId)}
                    className="save-item-btn"
                    aria-pressed={isSaved}
                  >
                    {isSaved ? 'Saved' : 'Save Item'}
                  </Button>
                  <Button size="large" icon={<ShareAltOutlined />} onClick={handleShare} className="share-item-btn">
                    Share
                  </Button>
                </div>
              </div>

              {/* Owner controls */}
              {(isOwner || isAdmin) && (
                <div className="owner-controls-section" style={{ marginTop: 16, padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>
                    <InboxOutlined /> Manage this listing
                  </span>
                  <Button size="small" style={{ marginRight: 8 }} onClick={() => handleStatusChange('Reserved')} disabled={item.status === 'Reserved'}>
                    Mark Reserved
                  </Button>
                  <Button size="small" style={{ marginRight: 8 }} onClick={() => handleStatusChange('Available')} disabled={item.status === 'Available'}>
                    Re-list
                  </Button>
                  <Button size="small" style={{ marginRight: 8 }} onClick={() => handleStatusChange('Given Away')} disabled={item.status === 'Given Away'}>
                    Mark Given Away
                  </Button>
                  <Popconfirm
                    title="Delete this listing permanently?"
                    onConfirm={handleDelete}
                    okText="Delete"
                    cancelText="Cancel"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </Popconfirm>
                </div>
              )}

              {/* Description */}
              <div className="details-desc-box">
                <h3 className="desc-box-title">About This Item</h3>
                <p className="desc-box-text">{item.description}</p>
              </div>

              {/* Owner Profile Card — only shows real fields from the API */}
              {item.owner && (
                <div className="details-owner-card">
                  <div className="owner-card-top">
                    <Avatar size={54} icon={<EnvironmentOutlined />} />
                    <div className="owner-card-info">
                      <div className="owner-name-row">
                        <span className="owner-name">{item.owner.name}</span>
                      </div>
                      <div className="owner-meta-text">
                        {item.owner.location?.city && <span>{item.owner.location.city} • </span>}
                        {item.owner.createdAt && <span>Member since {formatDate(item.owner.createdAt)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety Pledge Card */}
              <div className="details-safety-card">
                <ShareAltOutlined className="safety-icon" aria-hidden="true" />
                <div>
                  <h4 className="safety-title">Safe ReHome Pickup Tips</h4>
                  <p className="safety-desc">
                    Always arrange pickups during daylight hours in a public or supervised spot. Inspect the item
                    in person before finalizing and loading.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Items Nearby */}
        {similarItems.length > 0 && (
          <div className="similar-items-section section-padding">
            <div className="section-header">
              <div>
                <span className="section-pretitle">DISCOVER MORE</span>
                <h2 className="section-title">Similar Items In Your Area</h2>
              </div>
              <Link to="/search" className="section-view-all">
                Browse all items
              </Link>
            </div>
            <div className="similar-items-grid">
              {similarItems.map((similar) => (
                <ItemCard key={similar._id || similar.id} item={similar} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Claim/Message Owner Modal — drafts a message, no fake send */}
      <Modal
        title={
          <div className="claim-modal-title">
            <span>Contact {item.owner?.name || 'Owner'}</span>
            <span className="claim-item-sub">Regarding: {item.title}</span>
          </div>
        }
        open={isRequestModalOpen}
        onCancel={() => setIsRequestModalOpen(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleRequestSubmit}>
          <Form.Item
            name="message"
            label="Your Message"
            rules={[{ required: true, message: 'Please write a message to the owner' }]}
          >
            <TextArea
              rows={4}
              placeholder={`Hi ${item.owner?.name || 'there'}, I'm interested in your ${item.title}...`}
            />
          </Form.Item>
          <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            ReHome messaging is coming soon. Your message is copied to the clipboard so you can send it through
            any channel you prefer once they've shared contact details.
          </div>
          <div className="claim-modal-actions">
            <Button onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="confirm-request-btn">
              Copy Message
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ItemDetails;
