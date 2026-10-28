import connectDB from "@/lib/db/connection";
import RecruitmentModel from "@/models/Recruitment";
import PendingRecruitmentModel from "@/models/PendingRecruitment";
import {
  generateRecruitmentCode,
  hashRecruitmentCode,
  matchesRecruitmentCode,
} from "@/lib/server/recruitment-otp";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * @swagger
 * /api/registration/recruitment:
 *   get:
 *     summary: Check if an email or phone is registered
 *     description: This endpoint checks if the provided email or phone is already registered for recruitment.
 *     tags:
 *      - Recruitment
 *     parameters:
 *       - in: query
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *           description: The email or phone number to check.
 *     responses:
 *       200:
 *         description: The identifier is already registered.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "email already exists"
 *                 isUnique:
 *                   type: boolean
 *                   example: false
 *       403:
 *         description: The identifier is not registered.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "email not registered"
 *                 isUnique:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "An error occurred"
 */
export async function GET(request: Request) {
  await connectDB();

  // Wait for connection with timeout
  const connectionTimeout = 10000;
  const startTime = Date.now();

  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - startTime > connectionTimeout) {
      throw new Error("Database connection timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("identifier");
    if (!identifier) {
      return NextResponse.json(
        { error: "identifier query parameter is required" },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (identifier && emailRegex.test(identifier)) {
      const existing = await Promise.race([
        RecruitmentModel.findOne({
          email: identifier,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Email check timeout")), 5000)
        ),
      ]);
      if (existing) {
        return NextResponse.json(
          { message: "email already exists", isUnique: false },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { message: "email not registered", isUnique: true },
        { status: 403 }
      );
    } else {
      const existing = await Promise.race([
        RecruitmentModel.findOne({
          whatsapp_number: identifier,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Phone check timeout")), 5000)
        ),
      ]);
      if (existing) {
        return NextResponse.json(
          { message: "phone already exists", isUnique: false },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { message: "phone not registered", isUnique: true },
        { status: 403 }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "An error occurred", details: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: "An unknown error occurred" },
        { status: 500 }
      );
    }
  }
}

/**
 * @swagger
 * /api/registration/recruitment:
 *   post:
 *     summary: Handle recruitment actions
 *     description: This endpoint handles different recruitment actions like adding a registration.
 *     tags:
 *      - Recruitment
 *     parameters:
 *       - in: query
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           description: Action to perform (addRegistration, verifyRegistration, checkDuplicates)
 *               email:
 *                 type: string
 *               whatsapp_number:
 *                 type: string
 *               college_id:
 *                 type: string
 *               year_of_study:
 *                 type: string
 *               branch:
 *                 type: string
 *               about:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful operation based on action.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Operation successful!"
 *       400:
 *         description: Invalid action specified or missing data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid action specified"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "An error occurred"
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action) {
      return NextResponse.json(
        { error: "Action parameter is required" },
        { status: 400 }
      );
    }

    if (action === "addRegistration") {
      return addRegistration(request);
    } else if (action === "verifyRegistration") {
      return verifyRegistration(request);
    } else if (action === "checkDuplicates") {
      return checkDuplicates(request);
    } else {
      return NextResponse.json(
        { error: "Invalid action specified" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "An error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function checkDuplicates(request: Request) {
  try {
    await connectDB();

    // Wait for connection with timeout (same as addRegistration)
    const connectionTimeout = 10000;
    const startTime = Date.now();
    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - startTime > connectionTimeout) {
        throw new Error("Database connection timeout");
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const { email, whatsapp_number, college_id } = await request.json();
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedCollegeId = college_id?.toUpperCase().trim();

    const [existingEmail, existingPhone, existingCollegeId] = await Promise.all([
      normalizedEmail
        ? RecruitmentModel.findOne({ email: normalizedEmail }).select("email").lean()
        : null,
      whatsapp_number
        ? RecruitmentModel.findOne({ whatsapp_number }).select("whatsapp_number").lean()
        : null,
      normalizedCollegeId
        ? RecruitmentModel.findOne({ college_id: normalizedCollegeId }).select("college_id").lean()
        : null,
    ]);

    const duplicates: string[] = [];
    if (existingEmail) duplicates.push("email");
    if (existingPhone) duplicates.push("phone");
    if (existingCollegeId) duplicates.push("college_id");

    if (duplicates.length > 0) {
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({
          distinctId: normalizedEmail ?? "anonymous",
          event: "recruitment_duplicate_detected",
          properties: { duplicate_fields: duplicates },
        });
        await posthog.flush();
      }
      return NextResponse.json(
        { error: "Already registered", duplicates },
        { status: 409 }
      );
    }

    return NextResponse.json({ message: "No duplicates found" });
  } catch {
    return NextResponse.json(
      { error: "Failed to check duplicates" },
      { status: 500 }
    );
  }
}

async function addRegistration(request: Request) {
  try {
    await connectDB();

    // Wait for connection with timeout
    const connectionTimeout = 10000;
    const startTime = Date.now();

    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - startTime > connectionTimeout) {
        throw new Error("Database connection timeout");
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const data = await request.json();
    const data2 = data;
    if (!data2 || typeof data2 !== "object" || Array.isArray(data2)) {
      return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });
    }
    if (typeof data2?.email === "string") data2.email = data2.email.trim().toLowerCase();
    if (typeof data2?.college_id === "string") data2.college_id = data2.college_id.trim().toUpperCase();
    if (typeof data2?.whatsapp_number === "string") data2.whatsapp_number = data2.whatsapp_number.trim();

    // Validate required fields
    const requiredFields = [
      "name",
      "email",
      "whatsapp_number",
      "college_id",
      "year_of_study",
      "branch",
      "about",
    ];
    const missingFields = requiredFields.filter(
      (field) => typeof data2[field] !== "string" || !data2[field].trim()
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate name is not just whitespace
    if (!data2.name || data2.name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data2.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate phone format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(data2.whatsapp_number)) {
      return NextResponse.json(
        {
          error:
            "Invalid phone number format. Must be 10 digits starting with 6-9",
        },
        { status: 400 }
      );
    }

    // Validate about word count (max 150 words)
    const aboutWordCount = data2.about.trim().split(/\s+/).filter(Boolean).length;
    if (aboutWordCount > 150) {
      return NextResponse.json(
        { error: `About section must be 150 words or less (you have ${aboutWordCount})` },
        { status: 400 }
      );
    }

    // Validate college_id based on year
    if (data2.year_of_study === "1st year") {
      const admissionNumberRegex = /^[1-9][0-9][A-Z]{4}[0-9]{4}$/;
      if (!admissionNumberRegex.test(data2.college_id)) {
        return NextResponse.json(
          {
            error:
              "Invalid Admission Number format for 1st year. Expected format: 19ABCD1234",
          },
          { status: 400 }
        );
      }
    } else {
      const usnRegex = /^[1][D][S][1-3][0-9][A-Z]{2}[0-9]{3}$/;
      if (!usnRegex.test(data2.college_id)) {
        return NextResponse.json(
          {
            error:
              "Invalid USN format for 2nd/3rd/4th year. Expected format: 1DS21CS123",
          },
          { status: 400 }
        );
      }
    }

    // Check if email, phone, or college_id already exists
    const [existingEmail, existingPhone, existingCollegeId] = await Promise.all(
      [
        Promise.race([
          RecruitmentModel.findOne({ email: data2.email }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Email check timeout")), 5000)
          ),
        ]),
        Promise.race([
          RecruitmentModel.findOne({ whatsapp_number: data2.whatsapp_number }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Phone check timeout")), 5000)
          ),
        ]),
        Promise.race([
          RecruitmentModel.findOne({ college_id: data2.college_id }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("College ID check timeout")),
              5000
            )
          ),
        ]),
      ]
    );

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 400 }
      );
    }

    if (existingCollegeId) {
      return NextResponse.json(
        { error: "College ID already registered" },
        { status: 400 }
      );
    }

    const registration = new RecruitmentModel(data2);
    await registration.validate();

    const { RESEND_API_KEY, RESEND_FROM_EMAIL, RECRUITMENT_OTP_SECRET } = process.env;
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !RECRUITMENT_OTP_SECRET) {
      return NextResponse.json({ error: "Email verification is not configured" }, { status: 503 });
    }

    const now = new Date();
    const code = generateRecruitmentCode();
    let pending;
    try {
      pending = await PendingRecruitmentModel.findOneAndUpdate(
        {
          _id: data2.email,
          $or: [{ sentAt: { $lte: new Date(now.getTime() - 60_000) } }, { sentAt: { $exists: false } }],
        },
        {
          $set: {
            data: registration.toObject(),
            codeHash: hashRecruitmentCode(data2.email, code, RECRUITMENT_OTP_SECRET),
            expiresAt: new Date(now.getTime() + 10 * 60_000),
            sentAt: now,
            attempts: 0,
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === 11000) {
        return NextResponse.json({ error: "Please wait a minute before requesting another code" }, { status: 429 });
      }
      throw error;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [data2.email],
          subject: "Your Point Blank recruitment verification code",
          text: `Your Point Blank recruitment verification code is ${code}. It expires in 10 minutes. If you did not submit the form, ignore this email.`,
        }),
      });
      if (!response.ok) throw new Error(`Resend rejected email: ${response.status}`);
    } catch (error) {
      await PendingRecruitmentModel.deleteOne({ _id: pending._id, codeHash: pending.codeHash });
      console.error("Recruitment OTP email failed:", error);
      return NextResponse.json({ error: "Could not send the verification code. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ message: "Verification code sent" }, { status: 202 });
  } catch (error) {
    if (error instanceof Error) {
      // Handle Mongoose validation errors
      if (error.name === "ValidationError") {
        const validationErrors = Object.values(
          (error as unknown as { errors: Record<string, { message: string }> }).errors
        ).map((err) => err.message);
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationErrors,
            type: "validation_error",
          },
          { status: 400 }
        );
      }

      // Handle duplicate key errors
      if (
        error.name === "MongoServerError" &&
        error.message.includes("duplicate key")
      ) {
        return NextResponse.json(
          {
            error: "Duplicate entry detected",
            details: error.message,
            type: "duplicate_error",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to add registration",
        details: error instanceof Error ? error.message : String(error),
        type: "server_error",
      },
      { status: 500 }
    );
  }
}

async function verifyRegistration(request: Request) {
  try {
    const { email, code } = await request.json();
    if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter a valid six digit code" }, { status: 400 });
    }
    const secret = process.env.RECRUITMENT_OTP_SECRET;
    if (!secret) return NextResponse.json({ error: "Email verification is not configured" }, { status: 503 });

    await connectDB();
    const normalizedEmail = email.trim().toLowerCase();
    const pending = await PendingRecruitmentModel.findOneAndUpdate(
      { _id: normalizedEmail, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    if (!pending) {
      return NextResponse.json({ error: "Code expired or too many attempts. Request a new code." }, { status: 400 });
    }
    if (!matchesRecruitmentCode(normalizedEmail, code, pending.codeHash, secret)) {
      return NextResponse.json({ error: "Incorrect verification code" }, { status: 400 });
    }

    const registration = new RecruitmentModel(pending.data);
    await registration.save();
    try {
      await PendingRecruitmentModel.deleteOne({ _id: pending._id });
    } catch (error) {
      console.error("Could not remove verified recruitment code:", error);
    }

    try {
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({
          distinctId: registration.email,
          event: "recruitment_registered",
          properties: { year_of_study: registration.year_of_study, branch: registration.branch },
        });
        await posthog.flush();
      }
    } catch (error) {
      console.error("Recruitment analytics failed:", error);
    }

    return NextResponse.json({ message: "Registration successful!" });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Already registered" }, { status: 409 });
    }
    console.error("Recruitment verification failed:", error);
    return NextResponse.json({ error: "Failed to verify registration" }, { status: 500 });
  }
}
