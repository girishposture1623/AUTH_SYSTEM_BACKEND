import mongoose from 'mongoose';
const PendingUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: 3,
        maxlength: 50,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    otpExpire: {
        type: Date,
        required: true,
    },
    provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
},{timestamps:true});

const PendingUser = mongoose.model('PendingUser', PendingUserSchema)

export default PendingUser