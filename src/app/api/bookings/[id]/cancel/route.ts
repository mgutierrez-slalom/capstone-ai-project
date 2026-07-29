import { cancelBooking } from '@/lib/booking/booking-service';
import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await cancelBooking(id);

    if (!result.success) {
      return Response.json(
        { code: result.error.code, message: result.error.message, field: result.error.field },
        { status: result.error.statusCode },
      );
    }

    return Response.json(result.booking, { status: 200 });
  } catch (error) {
    console.error('POST /api/bookings/{id}/cancel error:', error);
    return Response.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
