import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Simplified middleware — skip Supabase session for now
  // Protected route check will be done at page level
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
