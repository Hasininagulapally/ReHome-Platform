# ReHome - Backend API

REST API backend for the ReHome local item reuse application. Handles user authentication, listing management, image uploads, search filtering, and MySQL database operations.

## Tech Stack
- **Runtime:** Node.js, Express
- **Database:** MySQL 8.0 with `mysql2/promise` connection pool
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **File Uploads:** Multer (with MIME type and file extension verification)
- **Security:** Helmet, CORS allowlist, parameterized SQL queries

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```env
PORT=5000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=rehome
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Start the Server
```bash
npm run dev
# Server runs at http://localhost:5000
```

## Main API Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & return JWT token
- `GET /api/auth/me` - Get profile for logged-in user
- `GET /api/items` - List items with keyword search, categories, and filters
- `POST /api/items` - Create a listing (supports multipart image uploads)
- `GET /api/items/:id` - Fetch item details
- `PATCH /api/items/:id/status` - Update status (`Available`, `Reserved`, `Given Away`)
- `DELETE /api/items/:id` - Delete an item and remove uploaded images
- `GET /api/items/my/listings` - Fetch listings created by the logged-in user
- `GET /api/items/nearby` - Spatial search using MySQL `ST_Distance_Sphere`

## Tests
```bash
npm test
```
Runs unit and integration tests using Vitest and Supertest against `rehome_test`.
