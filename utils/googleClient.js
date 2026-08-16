import {OAuth2Client }from 'google-auth-library'
import { configDotenv } from 'dotenv'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export default client