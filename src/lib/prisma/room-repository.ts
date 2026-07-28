import { prisma } from './client';

export async function getAllRooms() {
  return prisma.room.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}

export async function getRoomById(roomId: string) {
  return prisma.room.findUnique({
    where: { id: roomId },
  });
}
