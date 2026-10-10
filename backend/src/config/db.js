import { initMySQL } from './mysql.js';

const connectDB = async () => {
  return await initMySQL();
};

export default connectDB;
