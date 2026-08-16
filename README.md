# AUTH_SYSTEM - Server

## Environment variables

See `.env.example` for required variables. Important keys:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET`, `JWT_EXPIRE` - JWT signing and expiry
- `BREVO_EMAIL`, `BREVO_PASSWORD`, `SENT_EMAIL` - SMTP for OTP and emails
- `GOOGLE_CLIENT_ID` - Google OAuth client id
- `CLOUDINARY_*` - Cloudinary credentials for image uploads
- `AUTH_RATE_WINDOW_MINUTES`, `AUTH_RATE_LIMIT_MAX` - auth route rate limiter settings

## MongoDB Indexes and migration notes

The `User` schema defines partial unique indexes to support soft-delete semantics:

- Unique index on `email` for documents where `isDeleted: false`.
- Unique index on `phone` for documents where `isDeleted: false` and `phone` exists.

If you are connecting to a database that may contain duplicates (for example after earlier schema changes), index creation can fail with a `11000` error. Steps to migrate safely:

1. Audit duplicates (example Mongo shell commands):

```
# find duplicate emails among non-deleted users
db.users.aggregate([
  { $match: { isDeleted: false, email: { $exists: true } } },
  { $group: { _id: { email: "$email" }, count: { $sum: 1 }, docs: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
])

# find duplicate phones among non-deleted users
db.users.aggregate([
  { $match: { isDeleted: false, phone: { $exists: true } } },
  { $group: { _id: { phone: "$phone" }, count: { $sum: 1 }, docs: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
])
```

2. Resolve duplicates manually: merge accounts, remove test accounts, or set `isDeleted: true` on duplicates you want deactivated.

3. After cleanup, restart the server; Mongoose will create indexes on startup (or run the `createIndexes` command manually).

Manual index creation example (run in Mongo shell):

```
db.users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })

db.users.createIndex({ phone: 1 }, { unique: true, partialFilterExpression: { isDeleted: false, phone: { $exists: true } } })
```

## Local setup

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies and start server:

```bash
cd server
npm install
npm run dev
```

3. Frontend runs separately; see frontend README for instructions.

## API server startup

- Server entry: `server/server.js` which imports `app.js`.
- `app.js` applies security middleware (helmet) and rate-limiting for `/api/auth`.

## Notes about security and logging

- HTTP-only cookies are used for authentication; tokens are not returned in JSON responses.
- A small safe logger is used to redact sensitive keys from logged metadata.
- Rate limiting is applied to authentication routes. Tune via `AUTH_RATE_WINDOW_MINUTES` and `AUTH_RATE_LIMIT_MAX`.

## Troubleshooting

- If you see index-related errors (duplicate key `11000`), follow the migration steps above before allowing Mongoose to create the indexes.

**_ End of README _**
# AUTH_SYSTEM - Server

Backend API for **AUTH SYSTEM**, a secure authentication and user management system built with Node.js, Express.js, MongoDB, JWT, Google OAuth, and Brevo SMTP.

---

## 🚀 Features

### Authentication

* User Registration
* Email OTP Verification
* Resend OTP
* Login
* Logout
* JWT Authentication
* Forgot Password
* Reset Password
* Change Password
* Google OAuth Login
* Get Current User

### User Management

* Get Profile
* Update Profile
* Phone Number Validation
* Indian `+91` Phone Number Normalization
* Profile Image Support
* Account Blocking
* Soft Account Deletion
* Role-Based Access Control

### Email

* OTP Verification Email
* Password Reset Email
* Welcome Email
* Brevo SMTP integration using Nodemailer

### Security

* Password hashing with bcrypt
* JWT authentication
* HTTP-only authentication cookies
* Helmet security headers
* CORS configuration
* Authentication rate limiting
* Protected routes
* Centralized error handling
* Google token verification
* Sensitive data protection

---

## 🛠️ Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB**
* **Mongoose**
* **JWT**
* **bcryptjs**
* **Google OAuth**
* **Nodemailer**
* **Brevo SMTP**
* **Helmet**
* **Express Rate Limit**
* **CORS**
* **Cookie Parser**
* **Cloudinary**
* **Multer**
* **Validator**
* **libphonenumber-js**
* **dotenv**

---

## 📁 Project Structure

```text
server/
│
├── config/
│   ├── db.js
│   └── brevo.js
│
├── controllers/
│   ├── auth.controller.js
│   ├── user.controller.js
│   └── admin.controller.js
│
├── middleware/
│   ├── auth.middleware.js
│   └── error.middleware.js
│
├── models/
│   └── User.js
│
├── routes/
│   ├── auth.route.js
│   ├── user.route.js
│   └── admin.route.js
│
├── utils/
│   ├── email.js
│   └── logger.js
│
├── .env
├── .env.example
├── .gitignore
├── app.js
├── server.js
├── package.json
└── package-lock.json
```

---

# ⚙️ Environment Variables

See `.env.example` for the required variables.

Important keys:

| Variable                   | Description                      |
| -------------------------- | -------------------------------- |
| `MONGO_URI`                | MongoDB connection string        |
| `PORT`                     | Server port                      |
| `NODE_ENV`                 | Application environment          |
| `CLIENT_URL`               | Frontend application URL         |
| `JWT_SECRET`               | JWT signing secret               |
| `JWT_EXPIRE`               | JWT expiration time              |
| `BREVO_EMAIL`              | Brevo SMTP username              |
| `BREVO_PASSWORD`           | Brevo SMTP password              |
| `SENT_EMAIL`               | Sender email address             |
| `GOOGLE_CLIENT_ID`         | Google OAuth client ID           |
| `CLOUDINARY_CLOUD_NAME`    | Cloudinary cloud name            |
| `CLOUDINARY_API_KEY`       | Cloudinary API key               |
| `CLOUDINARY_API_SECRET`    | Cloudinary API secret            |
| `AUTH_LOGO`                | Public URL of AUTH SYSTEM logo   |
| `AUTH_RATE_WINDOW_MINUTES` | Authentication rate-limit window |
| `AUTH_RATE_LIMIT_MAX`      | Maximum authentication requests  |

### Example

```env
MONGO_URI=
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

JWT_SECRET=
JWT_EXPIRE=7d

BREVO_EMAIL=
SENT_EMAIL=
BREVO_PASSWORD=

GOOGLE_CLIENT_ID=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

AUTH_LOGO=

AUTH_RATE_WINDOW_MINUTES=15
AUTH_RATE_LIMIT_MAX=10
```

> Never commit `.env` or any secret credentials to GitHub.

---

# 📦 Installation

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2. Navigate to the server directory

```bash
cd server
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create environment file

Create a `.env` file using `.env.example`:

```bash
cp .env.example .env
```

On Windows, create `.env` manually if the above command is unavailable.

### 5. Add your environment values

Configure MongoDB, JWT, Brevo, Google OAuth, and Cloudinary credentials.

---

# ▶️ Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The server runs on:

```text
http://localhost:5000
```

---

# 🌐 API Server

Server entry point:

```text
server/server.js
```

The server:

* Loads environment variables
* Connects to MongoDB
* Starts the Express application
* Uses centralized error handling

`app.js` configures:

* JSON parsing
* URL encoded body parsing
* Cookie parsing
* Helmet
* CORS
* Authentication rate limiting
* Authentication routes
* User routes
* Admin routes
* Global error middleware

---

# 🔑 API Routes

## Authentication

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| POST   | `/api/auth/register`        | Register a new user     |
| POST   | `/api/auth/verify-otp`      | Verify email OTP        |
| POST   | `/api/auth/resend-otp`      | Resend verification OTP |
| POST   | `/api/auth/login`           | User login              |
| POST   | `/api/auth/google-login`    | Google login            |
| POST   | `/api/auth/forgot-password` | Request password reset  |
| POST   | `/api/auth/reset-password`  | Reset password          |
| POST   | `/api/auth/change-password` | Change password         |
| POST   | `/api/auth/logout`          | Logout                  |

## User

| Method | Endpoint        | Description             |
| ------ | --------------- | ----------------------- |
| GET    | `/api/user/...` | User profile operations |
| PUT    | `/api/user/...` | Update user information |
| DELETE | `/api/user/...` | Account deletion        |

> Check the route files for the exact user endpoint paths configured in the project.

## Admin

Admin routes are available under:

```text
/api/admin
```

Protected admin endpoints require the appropriate authentication and authorization permissions.

---

# 🔐 Authentication Flow

## Registration

```text
Registration
     ↓
Validate Input
     ↓
Hash Password
     ↓
Create User
     ↓
Generate OTP
     ↓
Send OTP Email
     ↓
Verify OTP
     ↓
Account Verified
```

## Login

```text
Login
  ↓
Validate Credentials
  ↓
Check Account Status
  ↓
Compare Password
  ↓
Generate JWT
  ↓
HTTP-only Cookie
  ↓
Authenticated User
```

## Google Login

```text
Google Sign-In
      ↓
Verify Google Token
      ↓
Find User
      ↓
New User?
   ↙       ↘
 Yes       No
 ↓          ↓
Create     Login
User
 ↓
Welcome Email
```

Welcome email is sent only when a new Google account is created.

---

# 🍃 MongoDB Indexes

The `User` schema uses partial unique indexes to support soft-delete semantics.

### Email

A unique index is applied to active users:

```text
email
isDeleted: false
```

### Phone

A unique index is applied to active users where a phone number exists:

```text
phone
isDeleted: false
phone exists
```

---

# 🔄 MongoDB Migration Notes

If the database contains duplicate records from earlier schema changes, MongoDB may return:

```text
E11000 duplicate key error
```

### Find duplicate emails

```javascript
db.users.aggregate([
  {
    $match: {
      isDeleted: false,
      email: { $exists: true }
    }
  },
  {
    $group: {
      _id: "$email",
      count: { $sum: 1 },
      docs: { $push: "$_id" }
    }
  },
  {
    $match: {
      count: { $gt: 1 }
    }
  }
])
```

### Find duplicate phone numbers

```javascript
db.users.aggregate([
  {
    $match: {
      isDeleted: false,
      phone: { $exists: true }
    }
  },
  {
    $group: {
      _id: "$phone",
      count: { $sum: 1 },
      docs: { $push: "$_id" }
    }
  },
  {
    $match: {
      count: { $gt: 1 }
    }
  }
])
```

Resolve duplicate records before allowing Mongoose to create the indexes.

---

# 🛡️ Security

AUTH_SYSTEM follows several security practices:

* Passwords are hashed using bcrypt.
* JWT authentication uses HTTP-only cookies.
* Authentication routes are rate limited.
* Helmet provides security headers.
* CORS restricts cross-origin requests.
* Google credentials are verified server-side.
* Sensitive environment variables are excluded from Git.
* Blocked accounts cannot authenticate.
* Deleted accounts cannot authenticate.
* Authentication tokens are not returned in normal JSON responses.
* Centralized error handling prevents inconsistent API responses.

---

# 🚦 Rate Limiting

Authentication routes use `express-rate-limit`.

Configure the limits using:

```env
AUTH_RATE_WINDOW_MINUTES=15
AUTH_RATE_LIMIT_MAX=10
```

Example:

```text
15-minute window
Maximum 10 authentication requests
```

---

# ❤️ Health Check

The root endpoint can be used to verify that the API server is running:

```text
GET /
```

Example response:

```json
{
  "success": true,
  "message": "Authentication API Running..,"
}
```

---

# 🧪 Testing

The API can be tested using:

* Postman
* Thunder Client
* Frontend application

Recommended test cases:

* Valid registration
* Duplicate email
* Invalid email
* Empty fields
* Invalid OTP
* Expired OTP
* Resend OTP
* Correct login
* Incorrect password
* Forgot password
* Reset password
* Change password
* Google login
* Duplicate phone number
* Invalid phone number
* Blocked account
* Deleted account
* Invalid JWT
* Unauthorized requests
* Admin authorization

---

# 🌐 Production Deployment

For production deployment, configure the environment variables on the hosting platform instead of committing `.env`.

Example:

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend-domain.com

MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/auth_system

JWT_SECRET=YOUR_STRONG_SECRET
JWT_EXPIRE=7d
```

Use:

* MongoDB Atlas
* Production frontend URL
* HTTPS
* Strong JWT secret
* Production Brevo credentials
* Production Google OAuth credentials
* Production Cloudinary credentials

### Frontend

The frontend should use:

```env
VITE_API_URL=https://your-backend-domain.com
```

---

# 🔒 Environment File Rules

The following files should not be committed:

```text
.env
.env.*
```

The following file can be committed:

```text
.env.example
```

Never expose:

* MongoDB credentials
* JWT secret
* Brevo password
* Google OAuth secret
* Cloudinary API secret

---

# 🐛 Troubleshooting

### MongoDB connection error

Check:

```text
MONGO_URI
```

and verify that MongoDB Atlas allows the deployed server to connect.

### Duplicate key error

If you receive:

```text
E11000 duplicate key error
```

check the MongoDB duplicate-record migration steps above.

### CORS error

Verify that:

```env
CLIENT_URL=https://your-frontend-domain.com
```

matches the actual frontend URL.

### Authentication cookie not working

Check:

* HTTPS is enabled in production.
* `NODE_ENV=production`.
* Backend CORS allows the frontend origin.
* Axios uses `withCredentials: true`.

### Email not sending

Check:

* Brevo SMTP credentials
* `SENT_EMAIL`
* Sender verification
* SMTP configuration
* Server logs

---

# 👨‍💻 Author

**Girish Suresh Posture**

MERN Stack Developer

---

## 📄 License

This project is developed for educational and portfolio purposes.
