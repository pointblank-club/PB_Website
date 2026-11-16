"use server";

import jwt from "jsonwebtoken";
import { createTransport } from "nodemailer";

export type JwtPayload = {
  email: string;
  name: string;
};

export async function sendVerificationEmail(to: string): Promise<boolean> {
  const normalizedEmail = to.trim().toLowerCase();

  try {
    const query = {
      query: `query CheckActiveUserMembership {
  users(filter: { 
    email: { eq: "${normalizedEmail}" },
    active: { eq: true }
  }) {
    nodes {
      id
      name
      email
    }
  }
}
`,
    };
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.LINEAR_API_KEY as string,
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      console.error("[Auth] Linear API returned status:", response.status);
      return false;
    }

    const json = await response.json();
    const userNode = json?.data?.users?.nodes?.[0];

    if (!userNode?.email) {
      console.warn("[Auth] No active Linear user found for email:", normalizedEmail);
      return false;
    }

    const token = jwt.sign(
      {
        email: userNode.email,
        name: userNode.name,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" },
    );

    let domain = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";
    if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
      domain = `https://${domain}`;
    }
    domain = domain.replace(/\/+$/, "");

    const verificationLink = `${domain}/api/auth/magic-link?token=${token}`;

    const port = parseInt((process.env.MAIL_SMTP_PORT || "465") as string, 10);
    const transporter = createTransport({
      host: process.env.MAIL_SMTP,
      port,
      secure: port === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      to: normalizedEmail,
      from: `Webadmin - Point Blank <${process.env.MAIL_USER}>`,
      subject: "Point Blank - Login Link",
      html: `<p>Hello ${userNode.name},</p>
<p>Click the link below to sign in to the admin panel:</p>
<p><a href="${verificationLink}">Sign In to Admin Panel</a></p>
<p>This link will expire in 15 minutes (i.e., ${new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST).</p>
<p>If you did not request this, please ignore this email.</p>
<p>Best regards,<br/>Team Point Blank</p>`,
      text: `Hello ${userNode.name},\n\nClick the link below to sign in to the admin panel:\n\n${verificationLink}\n\nThis link will expire in 15 minutes (i.e., ${new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST).\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nTeam Point Blank`,
    });

    return true;
  } catch (error) {
    console.error("[Auth] Error in sendVerificationEmail:", error);
    return false;
  }
}

export async function verifyLoginToken(
  token: string,
): Promise<string | boolean> {
  try {
    const user: JwtPayload | null = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload | null;
    if (!user) return false;

    return jwt.sign(
      {
        email: user.email,
        name: user.name,
      },
      process.env.SESSION_SECRET as string,
      {
        expiresIn: "1d",
      },
    );
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return false;
    }
    console.error("Token verification error:", error);
    return false;
  }
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const user: JwtPayload | null = jwt.verify(
      token,
      process.env.SESSION_SECRET as string,
    ) as JwtPayload | null;
    if (!user) return null;
    return user;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return null;
    }
    console.error("Token verification error:", error);
    return null;
  }
}
