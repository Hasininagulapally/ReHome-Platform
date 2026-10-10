// Static product taxonomy and marketing copy.
// IMPORTANT: contains no user-generated, trust, or transaction data.
// All listings, users, and counts come from the real backend API.

export const CATEGORIES = [
  {
    id: 'furniture',
    name: 'Furniture',
    icon: 'InboxOutlined',
    description: 'Sofas, study tables, chairs, wardrobes & beds',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    popularItems: ['Sofa', 'Study Table', 'Office Chair', 'Bookshelf']
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'LaptopOutlined',
    description: 'Monitors, speakers, keyboards, cables & gadgets',
    image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80',
    popularItems: ['Monitor', 'Headphones', 'Bluetooth Speaker']
  },
  {
    id: 'appliances',
    name: 'Appliances',
    icon: 'ThunderboltOutlined',
    description: 'Refrigerators, washing machines, microwaves & coolers',
    image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80',
    popularItems: ['Refrigerator', 'Washing Machine', 'Microwave']
  },
  {
    id: 'books',
    name: 'Books',
    icon: 'ReadOutlined',
    description: 'Novels, college textbooks, entrance prep & kids books',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    popularItems: ['Novels', 'Engineering Textbooks', 'Comics']
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: 'CoffeeOutlined',
    description: 'Cookware, blenders, dinner sets, jars & organizers',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    popularItems: ['Blender', 'Cookware Set', 'Dinner Plates']
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'AppstoreOutlined',
    description: 'Fitness gear, planters, indoor decor & luggage',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    popularItems: ['Yoga Mat', 'Indoor Planter', 'Dumbbells']
  }
];

export const CONDITIONS = [
  { value: 'New', label: 'New' },
  { value: 'Like New', label: 'Like New' },
  { value: 'Gently Used', label: 'Gently Used' },
  { value: 'Good', label: 'Good' },
  { value: 'Fair', label: 'Fair' }
];

export const ITEM_STATUSES = ['Available', 'Reserved', 'Given Away'];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Search',
    subtitle: 'Find Exactly What You Need',
    description: 'Search household essentials by keyword or category, filtered by your neighborhood.'
  },
  {
    step: '02',
    title: 'Discover Nearby',
    subtitle: 'Listings Within Minutes of You',
    description: 'Browse photos, condition grades, and locations from people in your area.'
  },
  {
    step: '03',
    title: 'Connect',
    subtitle: 'Coordinate Pickup Directly',
    description: 'Message the giver, agree on a time, and arrange a simple handover.'
  },
  {
    step: '04',
    title: 'Reuse',
    subtitle: 'Give Items a Second Life',
    description: 'Keep quality household goods in circulation, save money, and cut local landfill waste together.'
  }
];
