export type ErrorCode =
  | 'INVALID_TIME_RANGE'
  | 'BOOKING_IN_PAST'
  | 'BOOKING_CONFLICT'
  | 'MAX_DURATION_EXCEEDED'
  | 'ROOM_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_ALREADY_CANCELLED';

export interface ValidationError {
  code: ErrorCode;
  message: string;
  field?: string;
  statusCode: number;
}

export function createError(
  code: ErrorCode,
  message: string,
  field?: string,
): ValidationError {
  const statusCodeMap: Record<ErrorCode, number> = {
    INVALID_TIME_RANGE: 422,
    BOOKING_IN_PAST: 400,
    BOOKING_CONFLICT: 409,
    MAX_DURATION_EXCEEDED: 400,
    ROOM_NOT_FOUND: 400,
    INVALID_INPUT: 400,
    BOOKING_NOT_FOUND: 404,
    BOOKING_ALREADY_CANCELLED: 409,
  };

  return {
    code,
    message,
    field,
    statusCode: statusCodeMap[code],
  };
}
