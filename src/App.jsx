import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { ItemsProvider } from './context/ItemsContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PostItemModal from './components/PostItemModal';
import './App.css';

// Route-level code splitting — keeps antd + icons out of the initial chunk
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const ItemDetails = lazy(() => import('./pages/ItemDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MyListings = lazy(() => import('./pages/MyListings'));
const SavedItems = lazy(() => import('./pages/SavedItems'));
const Profile = lazy(() => import('./pages/Profile'));

// Ant Design Theme Token Customization
const antdTheme = {
  token: {
    colorPrimary: '#059669',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#0284c7',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    borderRadius: 8,
    colorTextHeading: '#0f172a',
    colorText: '#1e293b'
  }
};

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }} role="status" aria-label="Loading page">
    <Spin size="large" />
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Surface to telemetry/console but never leak internals to users
    console.error('Unhandled UI error:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <h1>Something went wrong</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            We hit an unexpected error while rendering this page.
          </p>
          <a href="/" className="button-link">
            <button className="retry-button" type="button">
              Back to Home
            </button>
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <ErrorBoundary>
        <ItemsProvider>
          <BrowserRouter>
            <div className="rehome-app-layout">
              <Navbar />
              <main className="rehome-main-content" id="main-content">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/item/:id" element={<ItemDetails />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/my-listings" element={<MyListings />} />
                    <Route path="/saved" element={<SavedItems />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
              <PostItemModal />
            </div>
          </BrowserRouter>
        </ItemsProvider>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;
