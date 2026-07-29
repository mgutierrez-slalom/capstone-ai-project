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

export type Booking = {
  id: string;
  roomId: string;
  title: string;
  organizerName: string;
  startTime: Date;
  endTime: Date;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
};

export async function createBooking(
  request: CreateBookingRequest,
): Promise<{ success: true; booking: Booking } | { success: false; error: ValidationError }> {
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

  if (!request.roomId) {
    return {
      success: false,
      error: createError('INVALID_INPUT', 'Room ID is required', 'roomId'),
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
        'endTime',
      ),
    };
  }

  // Validate start time is in the future (server UTC)
  const now = new Date();
  if (request.startTime <= now) {
    return {
      success: false,
      error: createError('BOOKING_IN_PAST', 'Start time must be in the future', 'startTime'),
    };
  }

  // Validate duration
  if (!isWithinMaximumDuration(timeRange)) {
    return {
      success: false,
      error: createError(
        'MAX_DURATION_EXCEEDED',
        'Booking duration cannot exceed 4 hours',
        'endTime',
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
        booking: {
          id: booking.id,
          roomId: booking.roomId,
          title: booking.title,
          organizerName: booking.organizerName,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          createdAt: booking.createdAt,
        },
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
  booking: Booking;
} | { success: false; error: ValidationError }> {
  const booking = await bookingRepo.getBookingById(bookingId);

  if (!booking) {
    return {
      success: false,
      error: createError('BOOKING_NOT_FOUND', 'Booking not found'),
    };
  }

  if (booking.status === 'CANCELLED') {
    return {
      success: false,
      error: createError('BOOKING_ALREADY_CANCELLED', 'Booking is already cancelled'),
    };
  }

  const cancelled = await bookingRepo.cancelBooking(bookingId);

  return {
    success: true as const,
    booking: {
      id: cancelled.id,
      roomId: cancelled.roomId,
      title: cancelled.title,
      organizerName: cancelled.organizerName,
      startTime: cancelled.startTime,
      endTime: cancelled.endTime,
      status: cancelled.status,
      createdAt: cancelled.createdAt,
    },
  };
}
