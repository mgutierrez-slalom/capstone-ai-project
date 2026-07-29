import { getAllConfirmedBookings } from '@/lib/prisma/booking-repository';
import { createBooking } from '@/lib/booking/booking-service';

export async function GET() {
  const bookings = await getAllConfirmedBookings();

  return Response.json(bookings);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await createBooking({
      roomId: body.roomId,
      organizerName: body.organizerName,
      title: body.title,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
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
