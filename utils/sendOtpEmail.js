import transporter from "../config/brevo.js";
import dotenv from "dotenv";

dotenv.config();
const sendEmailOtp = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: `"AUTH SYSTEM" <${process.env.SENT_EMAIL}>`,
      to: email,
      subject: "Verify your email",

      html: ` <div style="font-family:Arial,sans-serif;padding:20px">
                <h2>Email Verification</h2>

                <p>Your verification code is:</p>

                <h1 style="
                    letter-spacing:8px;
                    color:#2563eb;
                ">
                    ${otp}
                </h1>

                <p>
                    This OTP will expire in
                    <strong>3 minutes</strong>.
                </p>

                <p>
                    Do not share this OTP with anyone.
                </p>
            </div>`,
    });
    // Log success without leaking email/otp
    // eslint-disable-next-line no-console
    // Use logger in case it's available
    try {
      const logger = (await import("./logger.js")).default;
      logger.info("OTP email sent");
    } catch (e) {
      console.info("OTP email sent");
    }
  } catch (error) {
    // Avoid leaking internal error content
    try {
      const logger = (await import("./logger.js")).default;
      logger.error("Failed to send OTP email", { message: error.message });
    } catch (e) {
      console.error("Failed to send OTP email");
    }
    throw new Error("Failed to send OTP");
  }
};

export const sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"AUTH SYSTEM" <${process.env.SENT_EMAIL}>`,
      to: email,
      subject: "🎉 Welcome to AUTH SYSTEM!",

      html: `
        <div style="
          margin:0;
          padding:40px 20px;
          background:#f4f7fb;
          font-family:Arial,Helvetica,sans-serif;
        ">

          <div style="
            max-width:600px;
            margin:auto;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(0,0,0,0.08);
          ">

            <!-- Logo -->
            <div style="
              text-align:center;
              padding:30px 20px 20px;
              border-bottom:1px solid #eeeeee;
            ">
              <img
                src=${process.env.AUTH_LOGO}
                alt="AUTH SYSTEM"
                width="180"
                style="display:inline-block;"
              />
            </div>

            <!-- Content -->
            <div style="padding:35px 30px;">

              <h1 style="
                margin:0 0 15px;
                color:#1f2937;
                font-size:28px;
              ">
                Welcome to AUTH SYSTEM! 🎉
              </h1>

              <p style="
                color:#374151;
                font-size:16px;
                line-height:1.7;
              ">
                Hi <strong>${name}</strong>, 👋
              </p>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                We're happy to have you with us!
                Your account has been successfully created
                and verified.
              </p>

              <!-- Account Details -->
              <div style="
                margin:25px 0;
                padding:20px;
                background:#f8fafc;
                border-radius:12px;
                border:1px solid #e5e7eb;
              ">

                <h3 style="
                  margin:0 0 15px;
                  color:#1f2937;
                ">
                  Account Details
                </h3>

                <p style="margin:8px 0;color:#4b5563;">
                  <strong>Name:</strong> ${name}
                </p>

                <p style="margin:8px 0;color:#4b5563;">
                  <strong>Email:</strong> ${email}
                </p>

                <p style="margin:8px 0;color:#16a34a;">
                  <strong>Status:</strong> Verified ✅
                </p>

              </div>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                You can now log in and start using
                your AUTH SYSTEM account.
              </p>

              <!-- Button -->
              <div style="
                text-align:center;
                margin:30px 0;
              ">
                <a
                  href="${process.env.CLIENT_URL}/login"
                  style="
                    display:inline-block;
                    padding:13px 28px;
                    background:#2563eb;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:bold;
                    font-size:15px;
                  "
                >
                  Login to AUTH SYSTEM
                </a>
              </div>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                Thank you for joining us! 🚀
              </p>

              <p style="
                color:#6b7280;
                font-size:14px;
                line-height:1.6;
              ">
                If you have any questions or need help,
                feel free to contact our support team.
              </p>

              <p style="
                margin-top:30px;
                color:#374151;
                line-height:1.6;
              ">
                Best Regards,<br>
                <strong>AUTH SYSTEM Team</strong><br>
                <span style="color:#6b7280;">
                  Secure. Simple. Reliable. 🔐
                </span>
              </p>

            </div>

            <!-- Footer -->
            <div style="
              padding:18px;
              text-align:center;
              background:#f8fafc;
              border-top:1px solid #eeeeee;
            ">
              <p style="
                margin:0;
                color:#9ca3af;
                font-size:12px;
              ">
                © ${new Date().getFullYear()} AUTH SYSTEM. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      `,
    });

    try {
      const logger = (await import("./logger.js")).default;
      logger.info("Welcome email sent");
    } catch (e) {
      console.info("Welcome email sent");
    }

  } catch (error) {
    try {
      const logger = (await import("./logger.js")).default;
      logger.error("Failed to send welcome email", {
        message: error.message,
      });
    } catch (e) {
      console.error("Failed to send welcome email");
    }

    throw new Error("Failed to send welcome email");
  }
};

export default sendEmailOtp;
