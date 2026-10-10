import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Select, message } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useItems } from '../context/useItems';
import { authService } from '../services/api';
import './Register.css';

const Register = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { loginUser, locations = [], setCurrentLocation } = useItems();
  const [loading, setLoading] = useState(false);
  const locationsList = locations && locations.length > 0 
    ? locations 
    : ['Indiranagar, Bangalore', 'Koramangala, Bangalore', 'Whitefield, Bangalore', 'HSR Layout, Bangalore'];

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await authService.register({
        name: values.fullName,
        email: values.email,
        password: values.password,
        city: values.location
      });
      loginUser(res.user);
      if (values.location && setCurrentLocation) {
        setCurrentLocation(values.location);
      }
      message.success(`Welcome to ReHome, ${values.fullName.split(' ')[0]}! You can now list or claim items.`);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rehome-auth-page">
      <div className="auth-card-container register-card">
        {/* Brand Icon & Heading */}
        <div className="auth-header">
          <div className="auth-brand-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21V12H15V21" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="auth-title">Join ReHome</h1>
          <p className="auth-subtitle">Discover and rehome quality items within your local neighborhood</p>
        </div>

        {/* Community Trust Notice */}
        <div className="register-trust-banner">
          <SafetyCertificateOutlined className="trust-icon" />
          <span>Hyper-local community network • Free to join & list</span>
        </div>

        {/* Register Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            location: locationsList[0],
            agreement: true
          }}
          className="auth-form"
        >
          <Form.Item
            name="fullName"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter your full name' }]}
          >
            <Input
              prefix={<UserOutlined className="field-icon" />}
              placeholder="e.g. Priya Sharma"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email address"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input
              prefix={<MailOutlined className="field-icon" />}
              placeholder="priya@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="location"
            label="Your Neighborhood / City"
            rules={[{ required: true, message: 'Please select your area' }]}
          >
            <Select
              size="large"
              placeholder="Select your neighborhood"
              options={locationsList.map((loc) => ({ label: loc, value: loc }))}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Create Password"
            rules={[
              { required: true, message: 'Please create a password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="field-icon" />}
              placeholder="At least 6 characters"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The passwords do not match!'));
                }
              })
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="field-icon" />}
              placeholder="Re-type your password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="agreement"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject(new Error('Please accept the community guidelines'))
              }
            ]}
          >
            <Checkbox className="guidelines-checkbox">
              I agree to the <a href="#guidelines" onClick={(e) => { e.preventDefault(); message.info('ReHome fosters honest item grading and safe neighbor pickups.'); }}>Community Reuse Guidelines</a> and zero-waste pledge.
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginTop: 20, marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<UserAddOutlined />}
              className="auth-submit-btn"
            >
              Create Free Account
            </Button>
          </Form.Item>
        </Form>

        {/* Switch Link */}
        <div className="auth-footer-prompt">
          <span>Already have an account?</span>
          <Link to="/login" className="auth-switch-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
