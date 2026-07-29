import { getAllConfirmedBookings } from '@/lib/prisma/booking-repository';
import { createBooking } from '@/lib/booking/booking-service';

export async function GET() {
  try {
    const bookings = await getAllConfirmedBookings();
    return Response.json(bookings);
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return Response.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // --- Parse JSON body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { code: 'INVALID_INPUT', message: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  // --- Validate shape and types ---
  if (typeof body !== 'object' || body === null) {
    return Response.json(
      { code: 'INVALID_INPUT', message: 'Request body must be a JSON object' },
      { status: 400 },
    );
  }

  const raw = body as Record<string, unknown>;

  const { roomId, organizerName, title, startTime: rawStart, endTime: rawEnd } = raw;

  if (
    roomId === undefined ||
    organizerName === undefined ||
    title === undefined ||
    rawStart === undefined ||
    rawEnd === undefined
  ) {
    return Response.json(
      { code: 'INVALID_INPUT', message: 'Missing required fields: roomId, organizerName, title, startTime, endTime' },
      { status: 400 },
    );
  }

  if (typeof organizerName !== 'string') {
    return Response.json(
      { code: 'INVALID_INPUT', message: 'organizerName must be a string', field: 'organizerName' },
      { status: 400 },
    );
  }

  if (typeof title !== 'string') {
    return Response.json(
      { code: 'INVALID_INPUT', message: 'title must be a string', field: 'title' },
      { status: 400 },
    );
  }

  const startTime = new Date(rawStart as string);
  const endTime = new Date(rawEnd as string);

  if (isNaN(startTime.getTime())) {
    return Response.json(
      { code: 'INVALID_INPUT', message: 'startTime is not a valid date', field: 'startTime' },
      { status: 400 },
    );
  }

  if (isNaN(endTime.getTime())) {
    return Response.json(
      { code: 'INVALID_INPUT', message: 'endTime is not a valid date', field: 'endTime' },
      { status: 400 },
    );
  }

  // --- Call domain service ---
  try {
    const result = await createBooking({
      roomId: String(roomId),
      organizerName,
      title,
      startTime,
      endTime,
    });

    if (!result.success) {
      return Response.json(
        { code: result.error.code, message: result.error.message, field: result.error.field },
        { status: result.error.statusCode },
      );
    }

    return Response.json(result.booking, { status: 201 });
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return Response.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
