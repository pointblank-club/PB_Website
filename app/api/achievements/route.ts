import { NextResponse } from "next/server";
import {
  getAllAchievements,
  getAchievementsById,
  createAchievements,
  updateAchievements,
  deleteAchievements,
} from "@/lib/server/achievements";
import { createLog } from "@/lib/server/logs";
import { type Achievements } from "@/lib/db/models/achievements";
import { verifyToken } from "@/lib/server/auth";
import connectDB from "@/lib/db/connection";
import { validateAchievementUrls } from "@/lib/server/achievementLinks";

/*
 * GET /api/achievements
 *   searchParams: { id?: string }
 */
export async function GET(request: Request) {
  await connectDB();
  const { searchParams } = new URL(request.url);

  if (searchParams.has("id")) {
    const id = searchParams.get("id")!;
    const achievement = await getAchievementsById(id);
    if (!achievement)
      return NextResponse.json(
        { success: false, error: "Achievement not found" },
        { status: 404 },
      );
    return NextResponse.json({ success: true, achievement });
  }

  const achievements = await getAllAchievements();
  return NextResponse.json({ success: true, achievements });
}

/*
 * POST /api/achievements
 *   Header
 *     { Authorization: "Bearer <token>" }
 *   Body { Achievements }
 */
export async function POST(request: Request) {
  await connectDB();
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];
  if (!token)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const admin = await verifyToken(token);
  if (!admin?.email)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const body = await request.json();
  const { name, achivements }: Achievements = body;

  if (!name || !achivements)
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 },
    );
  
  const urlProblems = validateAchievementUrls(achivements);
  if (urlProblems.length > 0)
    return NextResponse.json(
     { success: false, error: urlProblems.join("; ") },
      { status: 400 },
    );
  const newAchievement = await createAchievements({ ...body });

  await createLog({
    action: "CREATE",
    module: "achievements",
    email: admin.email,
    title: `Created achievement for ${name}`,
  });

  return NextResponse.json({ success: true, achievement: newAchievement });
}

/*
 * PUT /api/achievements
 *   Header
 *     { Authorization: "Bearer <token>" }
 *   Body { Achievements } (must include _id)
 */
export async function PUT(request: Request) {
  await connectDB();
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];
  if (!token)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const admin = await verifyToken(token);
  if (!admin?.email)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const body = await request.json();
  const { _id, name, achivements }: Achievements & { _id: string } = body;

  if (!_id || !name || !achivements)
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 },
    );

  const existing = await getAchievementsById(_id as unknown as string);
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Achievement not found" },
      { status: 404 },
    );

  const urlProblems = validateAchievementUrls(achivements);
  if (urlProblems.length > 0)
  return NextResponse.json(
    { success: false, error: urlProblems.join("; ") },
    { status: 400 },
  );
  const updatedAchievement = await updateAchievements({ ...body });

  await createLog({
    action: "UPDATE",
    module: "achievements",
    email: admin.email,
    title: `Updated achievement for ${name}`,
  });

  return NextResponse.json({ success: true, achievement: updatedAchievement });
}

/*
 * DELETE /api/achievements
 *   Header
 *     { Authorization: "Bearer <token>" }
 *   searchParams: { id: string }
 */
export async function DELETE(request: Request) {
  await connectDB();
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];
  if (!token)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const admin = await verifyToken(token);
  if (!admin?.email)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id)
    return NextResponse.json(
      { success: false, error: "Missing required query param: id" },
      { status: 400 },
    );

  const existing = await getAchievementsById(id);
  if (!existing)
    return NextResponse.json(
      { success: false, error: "Achievement not found" },
      { status: 404 },
    );

  const deleted = await deleteAchievements(id);
  if (!deleted)
    return NextResponse.json(
      { success: false, error: "Failed to delete achievement" },
      { status: 500 },
    );

  await createLog({
    action: "DELETE",
    module: "achievements",
    email: admin.email,
    title: `Deleted achievement for ${existing.name}`,
  });

  return NextResponse.json({ success: true });
}
