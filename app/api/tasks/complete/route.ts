// app/api/tasks/complete/route.ts
// Marks a HubSpot task as completed. Called when the person explicitly clicks
// "Marquer comme fait" — a real write to HubSpot, triggered only by that click.

import { NextResponse } from "next/server";
import { completeTask } from "@/lib/hubspot";

export async function POST(request: Request) {
  try {
    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }
    await completeTask(taskId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error completing task:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
