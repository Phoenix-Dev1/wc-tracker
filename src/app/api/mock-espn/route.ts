import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "src/data/mock_espn.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);
    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Mock API Error:", error);
    return NextResponse.json({ error: "Failed to read mock file" }, { status: 500 });
  }
}
