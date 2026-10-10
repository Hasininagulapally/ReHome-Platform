# ReHome - Hyper-Local Reuse Platform

A full-stack web application for discovering, sharing, and reusing household items in local neighborhoods. This project was developed to help reduce domestic waste and encourage circular reuse within communities.

## Features
- **User Authentication:** Registration and login with JWT and secure password hashing.
- **Item Listings:** Users can post unused items (furniture, appliances, books, etc.) for free or modest prices with image uploads.
- **Search & Filters:** Server-side search by keywords, category, condition, price, and free-only items.
- **Hyper-Local Discovery:** Distance calculation using MySQL spatial queries (`ST_Distance_Sphere`) to find items nearby.
- **Listing Management:** Item owners can track listings, toggle status (`Available` / `Given Away`), and delete items.
- **Saved Items:** Bookmarking items for quick access.

## Tech Stack
- **Frontend:** React 19, Vite, React Router, Ant Design, Axios
- **Backend:** Node.js, Express, MySQL 8.0, Multer
- **Database:** MySQL (InnoDB)
- **Testing:** Vitest, Supertest, Playwright

## Project Structure
```text
ReHome/
├── backend/          # Express API server & MySQL database models
│   ├── src/          # Controllers, routes, middleware, and models
│   ├── tests/        # Backend test suites
│   └── uploads/      # Static image upload directory
├── src/              # React frontend source code
│   ├── components/   # UI components
│   ├── context/      # Items and Auth state context
│   ├── pages/        # Page views (Home, Search, Details, Profile, etc.)
│   └── services/     # API service layer
├── e2e/              # Playwright end-to-end tests
└── public/           # Static frontend assets
```

## Running the Application Locally

### Prerequisites
- Node.js (v18+)
- MySQL Server (v8.0+)

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory (see `.env.example`):
```env
PORT=5000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=rehome
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```
Start the backend server:
```bash
npm run dev
# Server will run on http://localhost:5000
```

### 2. Frontend Setup
From the root directory:
```bash
npm install
```
Create a `.env` file in the root directory (see `.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
```
Start the frontend development server:
```bash
npm run dev
# Frontend will run on http://localhost:5173
```

## Tests
- Backend tests: `cd backend && npm test`
- Frontend tests: `npm test`
- End-to-end tests: `npx playwright test`
