/**
 * Database Verification Utility
 * Run this to check if all indexes are properly set up
 * Usage: node src/utils/verifyDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Otp = require('../models/Otp');

const verifyIndexes = async () => {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check User indexes
        console.log('📋 Checking User model indexes...');
        const userIndexes = await User.collection.getIndexes();
        console.log('User indexes:', JSON.stringify(userIndexes, null, 2));
        
        if (!userIndexes.email_1) {
            console.log('⚠️  Creating email index on User collection...');
            await User.collection.createIndex({ email: 1 }, { unique: true });
            console.log('✅ Email index created');
        } else {
            console.log('✅ Email index exists');
        }

        // Check OTP indexes
        console.log('\n📋 Checking OTP model indexes...');
        const otpIndexes = await Otp.collection.getIndexes();
        console.log('OTP indexes:', JSON.stringify(otpIndexes, null, 2));
        
        if (!otpIndexes.expiresAt_1) {
            console.log('⚠️  Creating TTL index on OTP collection...');
            await Otp.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            console.log('✅ TTL index created');
        } else {
            console.log('✅ TTL index exists');
        }

        // Test user creation
        console.log('\n🧪 Testing user creation flow...');
        const testEmail = `test_${Date.now()}@example.com`;
        const testUser = await User.create({
            name: 'Test User',
            email: testEmail,
            password: 'test123456',
            isVerified: true
        });
        console.log('✅ User created successfully:', testUser.email);
        
        // Cleanup test user
        await User.deleteOne({ _id: testUser._id });
        console.log('✅ Test user cleaned up');

        console.log('\n🎉 All database checks passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database verification failed:', error.message);
        console.error(error);
        process.exit(1);
    }
};

verifyIndexes();
