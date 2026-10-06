/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import User from "@/lib/db/models/users";
import "dotenv/config";

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}, { __v: 0 }).lean();
    return NextResponse.json({ data: users });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-api-key");

  // AUTH
  if (!key || key !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await req.json();

    console.log("Incoming users:", body.users?.length);

    // ================= BULK UPSERT =================
    if (Array.isArray(body.users)) {
      const results = [];
      const skipped = [];

      for (const m of body.users) {
        if (!m.name || typeof m.name !== "string" || m.name.trim() === "") {
          console.log("❌ Invalid user skipped:", m);
          skipped.push(m);
          continue;
        }

        const cleanName = m.name.trim();

        try {
          const updateQuery: any = {
            $set: {
              name: cleanName,
              ...(m.githubUsername &&
                m.githubUsername !== "NA" && {
                  githubUsername: m.githubUsername,
                }),
              customOrgLinks: Array.isArray(m.customOrgLinks)
                ? m.customOrgLinks
                : [],
            },
          };

          // HANDLE gitlabUsername PROPERLY
          if (m.gitlabUsername && m.gitlabUsername !== "NA") {
            updateQuery.$set.gitlabUsername = m.gitlabUsername;
          } else {
            updateQuery.$unset = { gitlabUsername: "" };
          }

          if (m.kernelEmail && m.kernelEmail !== "NA") {
            updateQuery.$set.kernelEmail = String(m.kernelEmail).trim().toLowerCase();
          } else {
            updateQuery.$unset = {
              ...(updateQuery.$unset ?? {}),
              kernelEmail: "",
            };
          }

          const doc = await User.findOneAndUpdate(
            { name: cleanName },
            updateQuery,
            {
              upsert: true,
              returnDocument: "after",
            }
          );

          results.push(doc);
        } catch (err) {
          console.error("❌ DB error for user:", m, err);
          skipped.push(m);
        }
      }

      return NextResponse.json({
        message: `Upserted ${results.length} users`,
        skipped: skipped.length,
        data: results,
      });
    }

    // ================= SINGLE USER UPSERT =================

    const { name, githubUsername, gitlabUsername, kernelEmail, customOrgLinks } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    const updateQuery: any = {
      $set: {
        name: cleanName,
        ...(githubUsername &&
          githubUsername !== "NA" && {
            githubUsername,
          }),
        customOrgLinks: Array.isArray(customOrgLinks)
          ? customOrgLinks
          : [],
      },
    };

    if (gitlabUsername && gitlabUsername !== "NA") {
      updateQuery.$set.gitlabUsername = gitlabUsername;
    } else {
      updateQuery.$unset = { gitlabUsername: "" };
    }

    if (kernelEmail && kernelEmail !== "NA") {
      updateQuery.$set.kernelEmail = String(kernelEmail).trim().toLowerCase();
    } else {
      updateQuery.$unset = {
        ...(updateQuery.$unset ?? {}),
        kernelEmail: "",
      };
    }

    const doc = await User.findOneAndUpdate(
      { name: cleanName },
      updateQuery,
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    return NextResponse.json({
      message: "User upserted",
      data: doc,
    });
  } catch (err: any) {
    console.error("❌ API ERROR:", err);
    return NextResponse.json(
      { error: "Failed to save user" },
      { status: 500 }
    );
  }
}