import { prisma } from './client';
import type { BookingStatus } from '@prisma/client';

export interface CreateBookingInput {
  roomId: string;
  organizerName: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export interface Booking {
  id: string;
  roomId: string;
  title: string;
  organizerName: string;
  startTime: Date;
  endTime: Date;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all confirmed bookings for a room that overlap with the given time range.
 * Uses the overlap rule: existing.startTime < requested.endTime AND existing.endTime > requested.startTime
 */
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

/**
 * Create a booking with atomic conflict detection.
 * 
 * This function owns the transaction lifecycle and ensures:
 * - Conflict detection happens within the transaction
 * - Two concurrent requests for the same room/time cannot both succeed
 * - SQLite locks are handled internally
 * 
 * Returns the created booking on success, or null if a conflict was detected.
 * Throws only infrastructure errors (Prisma/SQLite issues).
 * Domain validation (empty fields, invalid times) must happen before calling this.
 */
export async function createBookingWithConflictCheck(
  input: CreateBookingInput,
): Promise<Booking | null> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check for overlaps inside transaction to prevent race conditions
      const existingBookings = await tx.booking.findMany({
        where: {
          roomId: input.roomId,
          status: 'CONFIRMED',
          NOT: {
            OR: [
              { endTime: { lte: input.startTime } },
              { startTime: { gte: input.endTime } },
            ],
          },
        },
      });

      if (existingBookings.length > 0) {
        // Conflict detected - return null to signal to caller
        return null;
      }

      // No conflict - create the booking
      const booking = await tx.booking.create({
        data: {
          roomId: input.roomId,
          organizerName: input.organizerName,
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          status: 'CONFIRMED',
        },
      });

      return {
        id: booking.id,
        roomId: booking.roomId,
        title: booking.title,
        organizerName: booking.organizerName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status as 'CONFIRMED' | 'CANCELLED',
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    });

    return result;
  } catch (error) {
    // Transaction/SQLite errors bubble up as infrastructure errors
    // Do not catch or transform - let caller distinguish domain vs infrastructure
    throw error;
  }
}

/**
 * Cancel a booking atomically using a conditional update.
 * 
 * This function ensures:
 * - Only one concurrent cancellation can succeed
 * - The update is conditional: only CONFIRMED → CANCELLED
 * - No race-prone read-then-update pattern
 * 
 * Returns the cancelled booking if it existed and was CONFIRMED.
 * Returns null if the booking didn't exist or was already CANCELLED.
 * Throws only infrastructure errors (Prisma/SQLite issues).
 */
export async function cancelBookingIfConfirmed(bookingId: string): Promise<Booking | null> {
  try {
    // Use updateMany with a filter to make this conditional and atomic
    const result = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: 'CONFIRMED', // Only update if currently CONFIRMED
      },
      data: {
        status: 'CANCELLED' as BookingStatus,
      },
    });

    if (result.count === 0) {
      // No rows matched - either booking doesn't exist or is already cancelled
      return null;
    }

    // Fetch and return the cancelled booking
    const cancelled = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!cancelled) {
      return null;
    }

    return {
      id: cancelled.id,
      roomId: cancelled.roomId,
      title: cancelled.title,
      organizerName: cancelled.organizerName,
      startTime: cancelled.startTime,
      endTime: cancelled.endTime,
      status: cancelled.status as 'CONFIRMED' | 'CANCELLED',
      createdAt: cancelled.createdAt,
      updatedAt: cancelled.updatedAt,
    };
  } catch (error) {
    // Transaction/SQLite errors bubble up as infrastructure errors
    throw error;
  }
}
