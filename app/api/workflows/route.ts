import { NextResponse } from 'next/server';
import { getAllWorkflowRuns } from '@/lib/workflows/workflow-tracking';

export async function GET() {
  const runs = getAllWorkflowRuns();
  return NextResponse.json(runs);
}
