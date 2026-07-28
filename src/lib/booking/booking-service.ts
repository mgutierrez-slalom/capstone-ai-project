import {
  isValidTimeRange,
  isWithinMaximumDuration,
} from './booking-rules';
import { createError, type ValidationError } from './error-types';
import * as bookingRepo from '@/lib/prisma/booking-repository';
import * as roomRepo from '@/lib/prisma/room-repository';
import { prisma } from '@/lib/prisma/client';

export interface CreateBookingRequest {
  roomId: string;
  organizerName: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export async function createBooking(
  request: CreateBookingRequest,
): Promise<{ success: true; bookingId: string } | { success: false; error: ValidationError }> {
  // Validate string fields
  const organizerName = request.organizerName.trim();
  const title = request.title.trim();

  if (!organizerName) {
    return {
      success: false,
      error: createError('INVALID_INPUT', 'Organizer name is required', 'organizerName'),
    };
  }

  if (!title) {
    return {
      success: false,
      error: createError('INVALID_INPUT', 'Title is required', 'title'),
    };
  }

  // Validate time range
  const timeRange = { startTime: request.startTime, endTime: request.endTime };

  if (!isValidTimeRange(timeRange)) {
    return {
      success: false,
      error: createError(
        'INVALID_TIME_RANGE',
        'End time must be after start time',
      ),
    };
  }

  // Validate start time is in the future (server UTC)
  const now = new Date();
  if (request.startTime <= now) {
    return {
      success: false,
      error: createError('BOOKING_IN_PAST', 'Start time must be in the future'),
    };
  }

  // Validate duration
  if (!isWithinMaximumDuration(timeRange)) {
    return {
      success: false,
      error: createError(
        'MAX_DURATION_EXCEEDED',
        'Booking duration cannot exceed 4 hours',
      ),
    };
  }

  // Validate room exists
  const room = await roomRepo.getRoomById(request.roomId);
  if (!room) {
    return {
      success: false,
      error: createError('ROOM_NOT_FOUND', 'Room not found'),
    };
  }

  // Check for conflicts with transaction and re-check
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check for overlaps inside transaction
      const existingBookings = await tx.booking.findMany({
        where: {
          roomId: request.roomId,
          status: 'CONFIRMED',
          NOT: {
            OR: [
              { endTime: { lte: request.startTime } },
              { startTime: { gte: request.endTime } },
            ],
          },
        },
      });

      if (existingBookings.length > 0) {
        return {
          success: false as const,
          error: createError('BOOKING_CONFLICT', 'Time slot is already booked'),
        };
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          roomId: request.roomId,
          organizerName,
          title,
          startTime: request.startTime,
          endTime: request.endTime,
          status: 'CONFIRMED',
        },
      });

      return {
        success: true as const,
        bookingId: booking.id,
      };
    });

    return result;
  } catch (error) {
    console.error('Booking creation error:', error);
    return {
      success: false,
      error: createError('BOOKING_CONFLICT', 'Unable to create booking at this time'),
    };
  }
}

export async function cancelBooking(bookingId: string): Promise<{
  success: true;
} | { success: false; error: ValidationError }> {
  const booking = await bookingRepo.getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: createError('INVALID_INPUT', 'Booking not found'),
    };
  }

  if (booking.status === 'CANCELLED') {
    return {
      success: false,
      error: createError('INVALID_INPUT', 'Booking is already cancelled'),
    };
  }

  await bookingRepo.cancelBooking(bookingId);

  return { success: true };
}
