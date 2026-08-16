import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoute from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import adminRoute from "./routes/admin.route.js";
import errorMiddleware from "./middleware/error.middleware.js";

const app = express();

// parse json body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Security headers
app.use(helmet());

// Rate limiter for auth-sensitive routes
const authWindowMinutes = Number(process.env.AUTH_RATE_WINDOW_MINUTES) || 15;
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 100;
const authLimiter = rateLimit({
  windowMs: authWindowMinutes * 60 * 1000,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});

// cors

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Authentication API Running..," });
});

app.use("/api/auth", authLimiter, authRoute);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRoute);

app.use(errorMiddleware);

export default app;
