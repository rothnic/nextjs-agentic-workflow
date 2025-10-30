import { NextResponse } from 'next/server';
import { getAllWorkflowExecutions } from '@/lib/workflows/lead-workflows';

export async function GET() {
  const executions = getAllWorkflowExecutions();
  return NextResponse.json(executions);
}
