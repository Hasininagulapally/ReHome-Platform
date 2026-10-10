import { randomUUID } from 'node:crypto';
import pool from '../config/mysql.js';

export const CATEGORIES = [
  'Furniture',
  'Electronics',
  'Appliances',
  'Books',
  'Kitchen',
  'Other'
];

export const CONDITIONS = [
  'New',
  'Like New',
  'Gently Used',
  'Good',
  'Fair'
];

export const STATUSES = [
  'Available',
  'Reserved',
  'Given Away'
];

// Helper to format an item database row
export function parseItem(row, ownerUser = null) {
  if (!row) return null;

  let images = [];
  try {
    if (typeof row.images === 'string') {
      images = JSON.parse(row.images || '[]');
    } else if (Array.isArray(row.images)) {
      images = row.images;
    }
  } catch {
    images = [];
  }

  const coordinates = [
    Number(row.longitude ?? 0),
    Number(row.latitude ?? 0)
  ];

  const item = {
    _id: row.id,
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    price: Number(row.price || 0),
    isFree: Boolean(row.isFree),
    condition: row.condition,
    images,
    owner: ownerUser || row.owner,
    location: {
      address: row.address || '',
      city: row.city || '',
      type: 'Point',
      coordinates,
      toObject: function () {
        return {
          address: this.address,
          city: this.city,
          type: this.type,
          coordinates: this.coordinates
        };
      }
    },
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
  };

  if (row.distanceKm !== undefined) {
    item.distanceKm = Number(row.distanceKm);
  }
  if (row.distanceMeters !== undefined) {
    item.distanceMeters = Number(row.distanceMeters);
  }

  item.save = async function () {
    return Item.update(this._id, this);
  };

  item.deleteOne = async function () {
    return Item.deleteById(this._id);
  };

  return item;
}

// Convert MongoDB style filter object into SQL WHERE clauses
function buildWhereClause(query = {}) {
  const conditions = [];
  const params = [];

  if (!query || typeof query !== 'object') {
    return { clause: '', params: [] };
  }

  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  }

  if (query.owner) {
    const ownerId = query.owner._id || query.owner.id || query.owner;
    conditions.push('owner = ?');
    params.push(String(ownerId));
  }

  if (query.category) {
    conditions.push('category = ?');
    params.push(query.category);
  }

  if (query.condition) {
    conditions.push('`condition` = ?');
    params.push(query.condition);
  }

  if (query.isFree !== undefined) {
    conditions.push('isFree = ?');
    params.push(query.isFree ? 1 : 0);
  }

  if (query.price && typeof query.price === 'object') {
    if (query.price.$gte !== undefined) {
      conditions.push('price >= ?');
      params.push(Number(query.price.$gte));
    }
    if (query.price.$lte !== undefined) {
      conditions.push('price <= ?');
      params.push(Number(query.price.$lte));
    }
  }

  const city = query['location.city'] || query.city;
  if (city) {
    const cityName = city instanceof RegExp ? city.source.replace(/\^|\$/g, '') : String(city);
    conditions.push('LOWER(city) LIKE ?');
    params.push(`%${cityName.toLowerCase().trim()}%`);
  }

  if (Array.isArray(query.$or) && query.$or.length > 0) {
    const orParts = [];
    for (const cond of query.$or) {
      const field = Object.keys(cond)[0];
      const val = cond[field];
      const searchStr = val instanceof RegExp ? val.source.replace(/\^|\$/g, '') : String(val);
      if (['title', 'description', 'category'].includes(field)) {
        orParts.push(`LOWER(${field}) LIKE ?`);
        params.push(`%${searchStr.toLowerCase().trim()}%`);
      }
    }
    if (orParts.length > 0) {
      conditions.push(`(${orParts.join(' OR ')})`);
    }
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

class ItemSingleQuery {
  constructor(id) {
    this.id = id;
    this.populateOwner = false;
  }

  populate(field) {
    if (field === 'owner') this.populateOwner = true;
    return this;
  }

  async exec() {
    const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [String(this.id)]);
    if (!rows.length) return null;

    const row = rows[0];
    let ownerObj = null;

    if (this.populateOwner && row.owner) {
      const [userRows] = await pool.query(
        'SELECT id, name, email, phone, address, city, latitude, longitude, createdAt FROM users WHERE id = ?',
        [row.owner]
      );
      if (userRows.length) {
        const u = userRows[0];
        ownerObj = {
          _id: u.id,
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          address: u.address || '',
          location: {
            type: 'Point',
            coordinates: [Number(u.longitude ?? 0), Number(u.latitude ?? 0)],
            city: u.city || ''
          },
          createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt
        };
      }
    }

    return parseItem(row, ownerObj);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class ItemFindQuery {
  constructor(query = {}) {
    this.query = query;
    this._sort = 'createdAt DESC';
    this._skip = 0;
    this._limit = 100;
    this._populateOwner = false;
  }

  sort(sortObj) {
    if (typeof sortObj === 'string') {
      this._sort = sortObj;
    } else if (sortObj && typeof sortObj === 'object') {
      const parts = [];
      for (const [key, dir] of Object.entries(sortObj)) {
        parts.push(`${key} ${dir === 1 || dir === 'asc' ? 'ASC' : 'DESC'}`);
      }
      if (parts.length) this._sort = parts.join(', ');
    }
    return this;
  }

  skip(n) {
    this._skip = Math.max(0, parseInt(n, 10) || 0);
    return this;
  }

  limit(n) {
    this._limit = Math.max(1, parseInt(n, 10) || 12);
    return this;
  }

  populate(field) {
    if (field === 'owner') this._populateOwner = true;
    return this;
  }

  async exec() {
    const { clause, params } = buildWhereClause(this.query);
    const sql = `SELECT * FROM items ${clause} ORDER BY ${this._sort} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(sql, [...params, this._limit, this._skip]);

    let ownerMap = new Map();
    if (this._populateOwner && rows.length > 0) {
      const ownerIds = [...new Set(rows.map((r) => r.owner).filter(Boolean))];
      if (ownerIds.length > 0) {
        const [users] = await pool.query(
          'SELECT id, name, email, phone, address, city, latitude, longitude, createdAt FROM users WHERE id IN (?)',
          [ownerIds]
        );
        for (const u of users) {
          ownerMap.set(u.id, {
            _id: u.id,
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            address: u.address || '',
            location: {
              type: 'Point',
              coordinates: [Number(u.longitude ?? 0), Number(u.latitude ?? 0)],
              city: u.city || ''
            },
            createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt
          });
        }
      }
    }

    return rows.map((r) => parseItem(r, ownerMap.get(r.owner) || null));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

const Item = {
  findById(id) {
    return new ItemSingleQuery(id);
  },

  find(query = {}) {
    return new ItemFindQuery(query);
  },

  async countDocuments(query = {}) {
    const { clause, params } = buildWhereClause(query);
    const [rows] = await pool.query(`SELECT COUNT(*) as count FROM items ${clause}`, params);
    return Number(rows[0]?.count || 0);
  },

  async create(input) {
    if (Array.isArray(input)) {
      const results = [];
      for (const item of input) {
        results.push(await Item.create(item));
      }
      return results;
    }

    const id = input._id || input.id || randomUUID();
    const title = String(input.title || '').trim();
    const description = String(input.description || '').trim();
    const category = input.category;
    const isFree = Boolean(input.isFree) || Number(input.price) === 0;
    const price = isFree ? 0 : Number(input.price || 0);
    const condition = input.condition;
    const images = Array.isArray(input.images) ? input.images : [];
    const ownerId = input.owner?._id || input.owner?.id || input.owner;
    const status = input.status || 'Available';

    const location = input.location || {};
    const coordinates = location.coordinates || [];
    const lng = Number(coordinates[0] ?? input.longitude ?? 0);
    const lat = Number(coordinates[1] ?? input.latitude ?? 0);
    const address = location.address || input.address || '';
    const city = location.city || input.city || '';

    await pool.query(
      `INSERT INTO items (
        id, title, description, category, price, isFree, \`condition\`,
        images, owner, address, city, latitude, longitude, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        description,
        category,
        price,
        isFree ? 1 : 0,
        condition,
        JSON.stringify(images),
        String(ownerId),
        address,
        city,
        lat,
        lng,
        status
      ]
    );

    const created = await Item.findById(id);
    return created;
  },

  async update(id, changes) {
    const fields = [];
    const values = [];

    if (changes.title !== undefined) {
      fields.push('title = ?');
      values.push(String(changes.title).trim());
    }
    if (changes.description !== undefined) {
      fields.push('description = ?');
      values.push(String(changes.description).trim());
    }
    if (changes.category !== undefined) {
      fields.push('category = ?');
      values.push(changes.category);
    }
    if (changes.condition !== undefined) {
      fields.push('`condition` = ?');
      values.push(changes.condition);
    }
    if (changes.status !== undefined) {
      fields.push('status = ?');
      values.push(changes.status);
    }
    if (changes.isFree !== undefined) {
      const isFree = Boolean(changes.isFree);
      fields.push('isFree = ?');
      values.push(isFree ? 1 : 0);
      if (isFree) {
        fields.push('price = 0');
      }
    }
    if (changes.price !== undefined && !changes.isFree) {
      fields.push('price = ?');
      values.push(Number(changes.price));
    }
    if (changes.images !== undefined) {
      fields.push('images = ?');
      values.push(JSON.stringify(changes.images));
    }

    if (changes.location) {
      if (changes.location.address !== undefined) {
        fields.push('address = ?');
        values.push(changes.location.address);
      }
      if (changes.location.city !== undefined) {
        fields.push('city = ?');
        values.push(changes.location.city);
      }
      if (changes.location.coordinates && Array.isArray(changes.location.coordinates)) {
        fields.push('longitude = ?', 'latitude = ?');
        values.push(Number(changes.location.coordinates[0]), Number(changes.location.coordinates[1]));
      }
    } else {
      if (changes.address !== undefined) {
        fields.push('address = ?');
        values.push(changes.address);
      }
      if (changes.city !== undefined) {
        fields.push('city = ?');
        values.push(changes.city);
      }
      if (changes.latitude !== undefined) {
        fields.push('latitude = ?');
        values.push(Number(changes.latitude));
      }
      if (changes.longitude !== undefined) {
        fields.push('longitude = ?');
        values.push(Number(changes.longitude));
      }
    }

    if (fields.length > 0) {
      values.push(String(id));
      await pool.query(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return Item.findById(id);
  },

  async deleteById(id) {
    const [res] = await pool.query('DELETE FROM items WHERE id = ?', [String(id)]);
    return res.affectedRows > 0;
  },

  async deleteMany() {
    const [res] = await pool.query('DELETE FROM items');
    return { deletedCount: res.affectedRows };
  },

  // Geospatial aggregation pipeline implementation using MySQL spatial functions
  async aggregate(pipeline = []) {
    const geoNearStage = pipeline.find((s) => s.$geoNear)?.$geoNear;
    if (!geoNearStage) {
      return [{ metadata: [{ total: 0 }], data: [] }];
    }

    const [targetLng, targetLat] = geoNearStage.near.coordinates;
    const maxDistanceMeters = geoNearStage.maxDistance || 100000;
    const match = geoNearStage.query || {};

    const facetStage = pipeline.find((s) => s.$facet)?.$facet || {};
    const skip = facetStage.data?.find((d) => d.$skip)?.$skip || 0;
    const limit = facetStage.data?.find((d) => d.$limit)?.$limit || 12;

    const lng = Number(targetLng);
    const lat = Number(targetLat);
    const maxDist = Number(maxDistanceMeters);

    const conditions = ['status = ?'];
    const filterParams = [match.status || 'Available'];

    if (match.category) {
      conditions.push('category = ?');
      filterParams.push(match.category);
    }
    if (match.isFree !== undefined) {
      conditions.push('isFree = ?');
      filterParams.push(match.isFree ? 1 : 0);
    }

    // Bounding-box prefilter for fast indexing prior to spherical calculation
    const radiusKm = maxDist / 1000;
    const latDelta = radiusKm / 111.0;
    const cosLat = Math.abs(Math.cos((lat * Math.PI) / 180));
    const lngDelta = radiusKm / (111.0 * (cosLat > 0.01 ? cosLat : 0.01));

    conditions.push(`latitude BETWEEN ${lat - latDelta} AND ${lat + latDelta}`);
    conditions.push(`longitude BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}`);

    // Distance calculation using MySQL ST_Distance_Sphere (returns meters)
    const distanceFormula = `ST_Distance_Sphere(POINT(longitude, latitude), POINT(${lng}, ${lat}))`;
    conditions.push(`${distanceFormula} <= ${maxDist}`);

    const whereStr = `WHERE ${conditions.join(' AND ')}`;

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM items
      ${whereStr}
    `;

    // Fast subquery pagination: calculate distance on index-filtered candidate rows,
    // then join full item data and user profile only for the top-N page slice
    const dataSql = `
      SELECT i.*,
             top.distanceMeters,
             ROUND(top.distanceMeters / 1000, 1) as distanceKm,
             u.id as owner_id, u.name as owner_name, u.email as owner_email,
             u.phone as owner_phone, u.city as owner_city,
             u.latitude as owner_lat, u.longitude as owner_lng, u.createdAt as owner_createdAt
      FROM (
        SELECT id, ${distanceFormula} as distanceMeters
        FROM items
        ${whereStr}
        ORDER BY distanceMeters ASC
        LIMIT ? OFFSET ?
      ) top
      JOIN items i ON top.id = i.id
      LEFT JOIN users u ON i.owner = u.id
      ORDER BY top.distanceMeters ASC
    `;

    const [[countRows], [rows]] = await Promise.all([
      pool.query(countSql, filterParams),
      pool.query(dataSql, [...filterParams, limit, skip])
    ]);
    const total = Number(countRows[0]?.total || 0);

    const items = rows.map((r) => {
      const ownerObj = r.owner_id
        ? {
            _id: r.owner_id,
            id: r.owner_id,
            name: r.owner_name,
            email: r.owner_email,
            phone: r.owner_phone || '',
            location: {
              type: 'Point',
              coordinates: [Number(r.owner_lng ?? 0), Number(r.owner_lat ?? 0)],
              city: r.owner_city || ''
            },
            createdAt: r.owner_createdAt instanceof Date ? r.owner_createdAt.toISOString() : r.owner_createdAt
          }
        : null;

      const parsed = parseItem(r, ownerObj);
      parsed.distanceKm = Number(r.distanceKm);
      parsed.distanceMeters = Number(r.distanceMeters);
      return parsed;
    });

    return [
      {
        metadata: [{ total }],
        data: items
      }
    ];
  }
};

export default Item;