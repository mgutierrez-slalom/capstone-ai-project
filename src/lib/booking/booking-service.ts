import {
  isValidTimeRange,
  isWithinMaximumDuration,
} from './booking-rules';
import { createError, type ValidationError } from './error-types';
import * as bookingRepo from '@/lib/prisma/booking-repository';
import type { Booking } from '@/lib/prisma/booking-repository';
import * as roomRepo from '@/lib/prisma/room-repository';

export interface CreateBookingRequest {
  roomId: string;
  organizerName: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

// Re-export Booking type for convenience
export type { Booking } from '@/lib/prisma/booking-repository';

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

  // All domain validations passed - attempt atomic booking creation
  // This function owns the transaction and handles conflicts internally
  try {
    const booking = await bookingRepo.createBookingWithConflictCheck({
      roomId: request.roomId,
      organizerName,
      title,
      startTime: request.startTime,
      endTime: request.endTime,
    });

    if (booking === null) {
      // Conflict detected within transaction
      return {
        success: false,
        error: createError('BOOKING_CONFLICT', 'Time slot is already booked'),
      };
    }

    return {
      success: true,
      booking,
    };
  } catch (error) {
    // Infrastructure error (Prisma/SQLite/transaction issue)
    // Do not misclassify as domain error
    console.error('Booking creation infrastructure error:', error);
    throw error;
  }
}

export async function cancelBooking(
  bookingId: string,
): Promise<{ success: true; booking: Booking } | { success: false; error: ValidationError }> {
  try {
    // Attempt atomic cancellation: only succeeds if booking exists and is CONFIRMED
    const cancelled = await bookingRepo.cancelBookingIfConfirmed(bookingId);

    if (cancelled === null) {
      // Either booking doesn't exist OR is already cancelled
      // Need to check which case it is for correct error response
      const existing = await bookingRepo.getBookingById(bookingId);

      if (!existing) {
        // Booking doesn't exist
        return {
          success: false,
          error: createError('BOOKING_NOT_FOUND', 'Booking not found'),
        };
      } else if (existing.status === 'CANCELLED') {
        // Booking exists but is already cancelled
        return {
          success: false,
          error: createError('BOOKING_ALREADY_CANCELLED', 'Booking is already cancelled'),
        };
      }

      // Shouldn't reach here, but handle gracefully
      return {
        success: false,
        error: createError('BOOKING_NOT_FOUND', 'Booking not found'),
      };
    }

    return {
      success: true,
      booking: cancelled,
    };
  } catch (error) {
    // Infrastructure error (Prisma/SQLite/transaction issue)
    console.error('Booking cancellation infrastructure error:', error);
    throw error;
  }
}
