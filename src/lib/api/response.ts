import { NextResponse } from 'next/server';

interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function success<T>(data: T, meta?: ApiMeta) {
  return NextResponse.json<ApiSuccess<T>>({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

export function error(code: string, message: string, status = 400) {
  return NextResponse.json<ApiError>(
    { success: false, error: { code, message } },
    { status },
  );
}

export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) {
  return success(data, {
    page,
    limit,
    total,
    has_more: page * limit < total,
  });
}

// Standard error codes
export const ERROR_CODES = {
  // Auth
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',

  // Speed
  SPEED_QUEUE_FULL: 'SPEED_QUEUE_FULL',
  SPEED_ALREADY_CLAIMED: 'SPEED_ALREADY_CLAIMED',
  SPEED_DEPARTED: 'SPEED_DEPARTED',
  SPEED_UNRESOLVED_CLAIMS: 'SPEED_UNRESOLVED_CLAIMS',

  // Listing
  LISTING_NOT_FOUND: 'LISTING_NOT_FOUND',
  LISTING_FEE_EXPIRED: 'LISTING_FEE_EXPIRED',
  LISTING_DUPLICATE: 'LISTING_DUPLICATE',

  // Funding
  FUNDING_CAMPAIGN_CLOSED: 'FUNDING_CAMPAIGN_CLOSED',
  FUNDING_NOT_VERIFIED: 'FUNDING_NOT_VERIFIED',

  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;
