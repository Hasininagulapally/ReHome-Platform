import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import pool from '../config/mysql.js';

export const toUser = (row) => {
  if (!row) return null;

  const user = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    address: row.address || '',
    location: {
      type: 'Point',
      coordinates: [
        Number(row.longitude ?? 0),
        Number(row.latitude ?? 0)
      ],
      city: row.city || ''
    },
    role: row.role || 'user',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
  };

  user.save = async function () {
    return User.update(this._id, this);
  };

  return user;
};

class UserQuery {
  constructor(id) {
    this.id = id;
    this.selectedFields = null;
  }

  select(fields) {
    this.selectedFields = fields;
    return this;
  }

  async exec() {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [String(this.id)]);
    if (!rows.length) return null;
    return toUser(rows[0]);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

const User = {
  async findOne({ email } = {}) {
    const normalized = String(email ?? '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [normalized]);

    if (!rows.length) return null;

    const row = rows[0];
    const user = toUser(row);
    user.password = row.password;
    user.matchPassword = async (enteredPassword) => {
      return bcrypt.compare(enteredPassword, row.password);
    };

    return user;
  },

  findById(id) {
    return new UserQuery(id);
  },

  async create(data) {
    // Support array or single object
    if (Array.isArray(data)) {
      const results = [];
      for (const item of data) {
        results.push(await User.create(item));
      }
      return results;
    }

    const id = data._id || data.id || randomUUID();
    const email = String(data.email).trim().toLowerCase();
    const hashedPassword = data.password.startsWith('$2')
      ? data.password
      : await bcrypt.hash(data.password, 10);

    const location = data.location || {};
    const coordinates = location.coordinates || [0, 0];
    const lng = Number(coordinates[0] ?? data.longitude ?? 0);
    const lat = Number(coordinates[1] ?? data.latitude ?? 0);
    const city = location.city || data.city || '';

    try {
      await pool.query(
        `INSERT INTO users (id, name, email, password, phone, address, city, latitude, longitude, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          String(data.name || '').trim(),
          email,
          hashedPassword,
          data.phone || '',
          data.address || '',
          city,
          lat,
          lng,
          data.role || 'user'
        ]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const error = new Error(`A user with this email address already exists`);
        error.code = 11000;
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return toUser(rows[0]);
  },

  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(String(data.name).trim());
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      fields.push('address = ?');
      values.push(data.address);
    }

    if (data.location) {
      if (data.location.city !== undefined) {
        fields.push('city = ?');
        values.push(data.location.city);
      }
      if (data.location.coordinates && Array.isArray(data.location.coordinates)) {
        fields.push('longitude = ?', 'latitude = ?');
        values.push(Number(data.location.coordinates[0]), Number(data.location.coordinates[1]));
      }
    } else {
      if (data.city !== undefined) {
        fields.push('city = ?');
        values.push(data.city);
      }
      if (data.latitude !== undefined) {
        fields.push('latitude = ?');
        values.push(Number(data.latitude));
      }
      if (data.longitude !== undefined) {
        fields.push('longitude = ?');
        values.push(Number(data.longitude));
      }
    }

    if (fields.length > 0) {
      values.push(String(id));
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [String(id)]);
    return toUser(rows[0]);
  },

  async deleteMany(filter = {}) {
    if (filter?.email?.$in && Array.isArray(filter.email.$in)) {
      if (filter.email.$in.length === 0) return { deletedCount: 0 };
      const [res] = await pool.query('DELETE FROM users WHERE email IN (?)', [filter.email.$in]);
      return { deletedCount: res.affectedRows };
    }
    const [res] = await pool.query('DELETE FROM users');
    return { deletedCount: res.affectedRows };
  }
};

export default User;
