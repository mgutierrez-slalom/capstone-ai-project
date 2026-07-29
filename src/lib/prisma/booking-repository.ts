import { prisma } from './client';
import type { BookingStatus } from '@prisma/client';

export interface CreateBookingInput {
  roomId: string;
  organizerName: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export async function getConfirmedBookingsForRoom(roomId: string, startTime: Date, endTime: Date) {
  return prisma.booking.findMany({
    where: {
      roomId,
      status: 'CONFIRMED',
      NOT: {
        OR: [
          { endTime: { lte: startTime } },
          { startTime: { gte: endTime } },
        ],
      },
    },
  });
}

export async function getBookingById(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
  });
}

export async function getAllConfirmedBookings() {
  return prisma.booking.findMany({
    where: { status: 'CONFIRMED' },
    orderBy: { startTime: 'asc' },
  });
}

export async function createBooking(input: CreateBookingInput) {
  return prisma.booking.create({
    data: {
      roomId: input.roomId,
      organizerName: input.organizerName,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'CONFIRMED',
    },
  });
}

export async function cancelBooking(bookingId: string) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' as BookingStatus },
  });
}
