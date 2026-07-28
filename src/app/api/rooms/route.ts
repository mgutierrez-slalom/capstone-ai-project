import { getAllRooms } from '@/lib/prisma/room-repository';

export async function GET() {
  const rooms = await getAllRooms();

  return Response.json(rooms);
}
