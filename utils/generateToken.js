import jwt from 'jsonwebtoken';
import { configDotenv } from 'dotenv';

const generateToken = (userID) => {
    return jwt.sign(
        {
            id: userID,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

export default generateToken