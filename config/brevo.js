import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_EMAIL,
    pass: process.env.BREVO_PASSWORD,
  },
});
transporter.verify((error) => {
  if (error) {
    logger.warn("Brevo transporter verify failed", { message: error.message });
  } else {
    logger.info("Brevo SMTP Ready");
  }
});

export default transporter;
