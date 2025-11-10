// This endpoint is no longer used - frontend calls PHP API directly via sendSMSViaHebesPHP
// Keeping file for backward compatibility but endpoint is disabled

import { NextRequest, NextResponse } from 'next/server';

// POST - Send SMS (DISABLED - use PHP API directly)
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is disabled. Please use the PHP API directly via sendSMSViaHebesPHP.',
      details: 'Frontend should call sendSMSViaHebesPHP function instead of this endpoint'
    },
    { status: 410 } // 410 Gone - indicates resource is no longer available
  );
}
