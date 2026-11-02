import connectDB from "@/lib/db/connection";
import RecruitmentModel from "@/models/Recruitment";
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
 *           description: Action to perform (addRegistration, checkDuplicates)
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
      try {
        const posthog = getPostHogClient();
        if (posthog) {
          posthog.capture({
            distinctId: normalizedEmail ?? "anonymous",
            event: "recruitment_duplicate_detected",
            properties: { duplicate_fields: duplicates },
          });
          await posthog.flush();
        }
      } catch (posthogError) {
        console.error("[PostHog] Failed to track duplicate check:", posthogError);
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
    const missingFields = requiredFields.filter((field) => !data2[field]);

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

    const newDoc = new RecruitmentModel(data2);

    await newDoc.save();

    try {
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({
          distinctId: data2.email,
          event: "recruitment_registered",
          properties: {
            year_of_study: data2.year_of_study,
            branch: data2.branch,
          },
        });
        await posthog.flush();
      }
    } catch (posthogError) {
      console.error("[PostHog] Failed to track registration:", posthogError);
    }

    return NextResponse.json({ message: "Registration successful!" });
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
