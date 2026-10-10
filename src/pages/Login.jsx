import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  LoginOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useItems } from '../context/useItems';
import { authService } from '../services/api';
import './Login.css';

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { loginUser } = useItems();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await authService.login({
        email: values.email,
        password: values.password
      });
      loginUser(res.user);
      message.success(`Welcome back, ${res.user.name}!`);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    form.setFieldsValue({
      email: 'priya@rehome.org',
      password: 'password123',
      remember: true
    });
  };

  return (
    <div className="rehome-auth-page">
      <div className="auth-card-container">
        {/* Brand Icon & Heading */}
        <div className="auth-header">
          <div className="auth-brand-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21V12H15V21" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Log in to discover and reuse household items nearby</p>
        </div>

        {/* Demo Auto-fill Pill */}
        <div className="auth-demo-hint">
          <div className="demo-hint-text">
            <ThunderboltOutlined style={{ color: '#059669' }} />
            <span>Testing the app?</span>
          </div>
          <button type="button" className="fill-demo-btn" onClick={handleFillDemo}>
            Fill demo credentials
          </button>
        </div>

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ remember: true }}
          className="auth-form"
        >
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
              placeholder="you@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="field-icon" />}
              placeholder="••••••••"
              size="large"
            />
          </Form.Item>

          <div className="auth-options-row">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
            <a href="#forgot" className="forgot-password-link" onClick={(e) => { e.preventDefault(); message.info('Password reset instructions will be sent to your email.'); }}>
              Forgot password?
            </a>
          </div>

          <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<LoginOutlined />}
              className="auth-submit-btn"
            >
              Sign In to ReHome
            </Button>
          </Form.Item>
        </Form>

        {/* Switch Link */}
        <div className="auth-footer-prompt">
          <span>Don't have an account yet?</span>
          <Link to="/register" className="auth-switch-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
