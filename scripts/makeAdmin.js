import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const makeAdmin = async (email) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }

    user.role = 'admin';
    user.status = 'active';
    await user.save();

    console.log('✅ User', email, 'is now an admin');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
};

const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

makeAdmin(email);