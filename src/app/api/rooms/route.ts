import { getAllRooms } from '@/lib/prisma/room-repository';

export async function GET() {
  try {
    const rooms = await getAllRooms();
    return Response.json(rooms);
  } catch (error) {
    console.error('GET /api/rooms error:', error);
    return Response.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
