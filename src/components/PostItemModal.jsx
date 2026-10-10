import React, { useState } from 'react';
import { Modal, Form, Input, Select, Radio, InputNumber, Button, Upload, message } from 'antd';
import { PlusOutlined, InboxOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../context/useItems';
import './PostItemModal.css';

const { TextArea } = Input;
const MAX_IMAGES = 5;
const MAX_FILE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const PostItemModal = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { isPostModalOpen, closePostModal, addItem, user } = useItems();
  const [priceType, setPriceType] = useState('free');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const isFree = priceType === 'free';
      const price = isFree ? 0 : Number(values.price || 0);
      const locText = values.location || '';
      const locParts = locText.split(',');
      const address = locParts[0]?.trim() || locText;
      const city = locParts[1]?.trim() || (locParts[0]?.trim() || '');

      // Build multipart payload for the real backend (Multer expects field 'images')
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('category', values.category);
      formData.append('condition', values.condition);
      formData.append('isFree', String(isFree));
      formData.append('price', String(price));
      formData.append('address', address);
      formData.append('city', city);

      if (values.customImageUrl?.trim()) {
        formData.append('imageUrls', values.customImageUrl.trim());
      }
      (values.images || []).forEach((file) => {
        formData.append('images', file.originFileObj || file);
      });

      const created = await addItem(formData);
      message.success('Item listed successfully! Neighbors nearby can now discover it.');
      form.resetFields();
      setPriceType('free');
      closePostModal();
      if (created?.id) navigate(`/item/${created.id}`);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.friendlyMessage || 'Could not publish your listing.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const beforeUpload = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error(`Unsupported file type: ${file.type || 'unknown'}. Use JPG, PNG, or WEBP.`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      message.error(`File exceeds ${MAX_FILE_MB}MB limit.`);
      return Upload.LIST_IGNORE;
    }
    return false; // prevent auto-upload; collect files locally for the submit payload
  };

  return (
    <Modal
      title={
        <div className="post-modal-title">
          <span className="modal-title-main">Give an Item a Second Life</span>
          <span className="modal-title-sub">List your unused item for neighbors to reuse</span>
        </div>
      }
      open={isPostModalOpen}
      onCancel={() => closePostModal()}
      footer={null}
      width={640}
      className="rehome-post-modal"
      destroyOnHidden
    >
      {!user ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <EnvironmentOutlined style={{ fontSize: 42, color: 'var(--primary)', marginBottom: 16 }} />
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
            Sign in or create an account to list an item for your neighbors.
          </p>
          <Button type="primary" onClick={() => { closePostModal(); navigate('/login'); }}>
            Go to login
          </Button>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ category: 'Furniture', condition: 'Gently Used' }}
          className="post-item-form"
        >
          <Form.Item
            label="Item Title"
            name="title"
            rules={[{ required: true, message: 'Please enter the item name (e.g. 3-Seater Sofa)' }]}
          >
            <Input placeholder="e.g. 3-Seater Wooden Sofa, Study Desk with Drawers" size="large" maxLength={120} />
          </Form.Item>

          <div className="form-two-cols">
            <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Select a category' }]}>
              <Select size="large">
                <Select.Option value="Furniture">Furniture</Select.Option>
                <Select.Option value="Electronics">Electronics</Select.Option>
                <Select.Option value="Appliances">Appliances</Select.Option>
                <Select.Option value="Books">Books</Select.Option>
                <Select.Option value="Kitchen">Kitchen</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="Condition" name="condition" rules={[{ required: true, message: 'Select condition' }]}>
              <Select size="large">
              <Select.Option value="New">New</Select.Option>
                <Select.Option value="Like New">Like New</Select.Option>
                <Select.Option value="Gently Used">Gently Used</Select.Option>
                <Select.Option value="Good">Good</Select.Option>
                <Select.Option value="Fair">Fair</Select.Option>
              </Select>
            </Form.Item>
          </div>

          {/* Pricing Options */}
          <div className="pricing-selector-section">
            <label className="section-label">Pricing Type</label>
            <Radio.Group
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
              className="price-radio-group"
            >
              <Radio.Button value="free" className="price-radio-btn free">
                Give for FREE ($0)
              </Radio.Button>
              <Radio.Button value="paid" className="price-radio-btn paid">
                Set a Modest Price ($)
              </Radio.Button>
            </Radio.Group>

            {priceType === 'paid' && (
              <Form.Item
                name="price"
                label="Price ($)"
                rules={[{ required: true, message: 'Please set a price' }]}
                style={{ marginTop: 12, marginBottom: 0 }}
              >
                <InputNumber min={1} prefix="$" placeholder="20" style={{ width: '100%' }} size="large" />
              </Form.Item>
            )}
          </div>

          {/* Location */}
          <Form.Item
            label="Your Neighborhood / Location"
            name="location"
            rules={[{ required: true, message: 'Please provide location, e.g. "Indiranagar, Bangalore"' }]}
          >
            <Input
              placeholder="e.g. Indiranagar, 2nd Stage"
              size="large"
              prefix={<EnvironmentOutlined style={{ color: 'var(--text-muted)' }} />}
            />
          </Form.Item>

          {/* Real Image Upload */}
          <div className="photo-picker-section">
            <label className="section-label">Item Photos (up to 5)</label>
            <Form.Item
              name="images"
              valuePropName="fileList"
              getValueFromEvent={({ fileList }) => fileList}
              rules={[
                {
                  validator: (_, value) =>
                    value && value.length > MAX_IMAGES
                      ? Promise.reject(new Error(`Maximum of ${MAX_IMAGES} images allowed.`))
                      : Promise.resolve()
                }
              ]}
              style={{ marginTop: 8 }}
            >
              <Upload.Dragger
                accept=".jpg,.jpeg,.png,.webp"
                listType="picture-card"
                beforeUpload={beforeUpload}
                maxCount={MAX_IMAGES}
                multiple
              >
                <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                  <InboxOutlined style={{ fontSize: 32, color: 'var(--primary)' }} />
                </p>
                <p style={{ marginBottom: 4 }}>Click or drag images here</p>
                <p style={{ marginBottom: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  JPG, PNG, WEBP · up to {MAX_FILE_MB}MB each · max {MAX_IMAGES} images
                </p>
              </Upload.Dragger>
            </Form.Item>

            <Form.Item name="customImageUrl" label="Or paste an image URL instead" style={{ marginTop: 10 }}>
              <Input placeholder="https://example.com/image.jpg" />
            </Form.Item>
          </div>

          <Form.Item
            label="Description & Pickup Notes"
            name="description"
            rules={[{ required: true, message: 'Please write a short description' }]}
          >
            <TextArea
              rows={3}
              maxLength={2000}
              placeholder="Share details like dimensions, why you're giving it away, and pickup availability..."
            />
          </Form.Item>

          <div className="post-modal-actions">
            <Button onClick={() => closePostModal()} size="large" disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<PlusOutlined />}
              className="post-submit-btn"
              loading={submitting}
            >
              Publish Item
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
};

export default PostItemModal;
