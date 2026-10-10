import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Item from '../models/Item.js';

dotenv.config();

const sampleUsers = [
  {
    name: 'Priya Sharma',
    email: 'priya@rehome.org',
    password: 'password123',
    phone: '+91 9876543210',
    address: 'Indiranagar 2nd Stage',
    location: {
      type: 'Point',
      coordinates: [77.6408, 12.9784],
      city: 'Bangalore'
    },
    role: 'user'
  },
  {
    name: 'Rahul Mehta',
    email: 'rahul@rehome.org',
    password: 'password123',
    phone: '+91 9845123456',
    address: 'Koramangala 4th Block',
    location: {
      type: 'Point',
      coordinates: [77.6245, 12.9352],
      city: 'Bangalore'
    },
    role: 'user'
  },
  {
    name: 'Admin User',
    email: 'admin@rehome.org',
    password: 'adminPassword123',
    phone: '+91 9000000000',
    address: 'MG Road',
    location: {
      type: 'Point',
      coordinates: [77.6081, 12.9756],
      city: 'Bangalore'
    },
    role: 'admin'
  }
];

const sampleItems = [
  {
    title: '3-Seater Fabric Sofa (Charcoal Grey)',
    description: 'High-density foam 3-seater sofa in great structural condition. Moving to an unfurnished apartment with a smaller living room, so giving it away.',
    category: 'Furniture',
    price: 0,
    isFree: true,
    condition: 'Gently Used',
    location: {
      address: 'Indiranagar, 2nd Stage',
      city: 'Bangalore',
      type: 'Point',
      coordinates: [77.6408, 12.9784]
    },
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'],
    status: 'Available'
  },
  {
    title: 'Solid Teak Study Table with Drawers',
    description: 'Compact study and work-from-home desk with two smooth-gliding drawers. Scratch-free matte varnish finish.',
    category: 'Furniture',
    price: 35,
    isFree: false,
    condition: 'Like New',
    location: {
      address: 'Koramangala, 4th Block',
      city: 'Bangalore',
      type: 'Point',
      coordinates: [77.6245, 12.9352]
    },
    images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80'],
    status: 'Available'
  },
  {
    title: 'Ergonomic Mesh Office Chair',
    description: 'Breathable Korean mesh high-back chair with adjustable lumbar support and 3D armrests.',
    category: 'Furniture',
    price: 25,
    isFree: false,
    condition: 'Like New',
    location: {
      address: 'HSR Layout, Sector 3',
      city: 'Bangalore',
      type: 'Point',
      coordinates: [77.6389, 12.9121]
    },
    images: ['https://images.unsplash.com/photo-1580481077195-c328ad4f4453?auto=format&fit=crop&w=800&q=80'],
    status: 'Available'
  },
  {
    title: 'Double Door Frost-Free Refrigerator (260L)',
    description: 'Energy-efficient 3-Star inverter compressor refrigerator in pristine working condition. Fast cooling, tempered glass shelves.',
    category: 'Appliances',
    price: 90,
    isFree: false,
    condition: 'Gently Used',
    location: {
      address: 'BTM Layout, Stage 2',
      city: 'Bangalore',
      type: 'Point',
      coordinates: [77.6101, 12.9166]
    },
    images: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80'],
    status: 'Available'
  },
  {
    title: '5-Tier Minimalist Wooden Bookshelf',
    description: 'Sturdy Scandinavian-style open bookcase. Holds up to 120 books or display decor. Ready for pickup.',
    category: 'Furniture',
    price: 0,
    isFree: true,
    condition: 'Good',
    location: {
      address: 'Jayanagar, 5th Block',
      city: 'Bangalore',
      type: 'Point',
      coordinates: [77.5833, 12.9250]
    },
    images: ['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80'],
    status: 'Available'
  },
  {
    title: 'Front Load Washing Machine (7.0 kg)',
    description: 'Fully automatic front-loading machine with heater, 1200 RPM spin speed, and express 15-minute quick wash.',
    category: 'Appliances',
    price: 85,
    isFree: false,
    condition: 'Gently Used',
    location: {
      address: 'Whitefield, Main Road',
      city: 'Bangalore',
      type: 'Point',
      coordinates: [77.7499, 12.9698]
    },
    images: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80'],
    status: 'Available'
  }
];

const seed = async () => {
  try {
    await connectDB();
    console.log('[Seed] Clearing existing items and sample users...');
    await Item.deleteMany({});
    await User.deleteMany({ email: { $in: sampleUsers.map((u) => u.email) } });

    console.log('[Seed] Creating sample users...');
    const createdUsers = await User.create(sampleUsers);
    const priya = createdUsers[0];
    const rahul = createdUsers[1];

    console.log('[Seed] Creating sample items...');
    const itemsWithOwner = sampleItems.map((item, idx) => ({
      ...item,
      owner: idx % 2 === 0 ? priya._id : rahul._id
    }));

    await Item.create(itemsWithOwner);

    console.log(`[Seed] Successfully seeded ${createdUsers.length} users and ${sampleItems.length} items!`);
    console.log('Sample User Credentials:');
    console.log('  Email: priya@rehome.org / Password: password123');
    console.log('  Email: rahul@rehome.org / Password: password123');
    console.log('  Email: admin@rehome.org / Password: adminPassword123');

    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error: ${error.message}`);
    process.exit(1);
  }
};

seed();
