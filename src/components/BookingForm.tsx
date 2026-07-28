'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
}

interface ApiError {
  code: string;
  message: string;
  field?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export function BookingForm() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    roomId: '',
    organizerName: '',
    title: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    async function fetchRooms() {
      try {
        const response = await fetch('/api/rooms');
        if (!response.ok) {
          throw new Error('Failed to load rooms');
        }
        const data = await response.json();
        setRooms(data);
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to load rooms', 'error');
      } finally {
        setLoadingRooms(false);
      }
    }

    fetchRooms();
  }, []);

  function addToast(message: string, type: 'success' | 'error') {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.roomId) {
      newErrors.roomId = 'Room is required';
    }

    if (!formData.organizerName.trim()) {
      newErrors.organizerName = 'Organizer name is required';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);

      if (start >= end) {
        newErrors.endTime = 'End time must be after start time';
      }

      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      if (durationHours > 4) {
        newErrors.endTime = 'Booking duration cannot exceed 4 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: formData.roomId,
          organizerName: formData.organizerName.trim(),
          title: formData.title.trim(),
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
        }),
      });

      const data: ApiError | { bookingId: string } = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        const errorMessage = `${error.code}: ${error.message}`;

        if (error.field) {
          setErrors((prev) => ({
            ...prev,
            [error.field || 'general']: error.message,
          }));
        }

        addToast(errorMessage, 'error');
        return;
      }

      addToast('Booking created successfully!', 'success');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create booking', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loadingRooms) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading form...</div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        {/* Room Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Room <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.roomId}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, roomId: e.target.value }));
              setErrors((prev) => ({ ...prev, roomId: '' }));
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.roomId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} (Capacity: {room.capacity}, Location: {room.location})
              </option>
            ))}
          </select>
          {errors.roomId && <p className="mt-1 text-sm text-red-600">{errors.roomId}</p>}
        </div>

        {/* Organizer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Organizer Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.organizerName}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, organizerName: e.target.value }));
              setErrors((prev) => ({ ...prev, organizerName: '' }));
            }}
            placeholder="Your name"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.organizerName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.organizerName && <p className="mt-1 text-sm text-red-600">{errors.organizerName}</p>}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Meeting Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, title: e.target.value }));
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder="e.g. Team Standup"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Start Time <span className="text-red-600">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, startTime: e.target.value }));
              setErrors((prev) => ({ ...prev, startTime: '' }));
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.startTime ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>}
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            End Time <span className="text-red-600">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, endTime: e.target.value }));
              setErrors((prev) => ({ ...prev, endTime: '' }));
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.endTime ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>}
          <p className="mt-1 text-xs text-gray-500">Maximum duration: 4 hours</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-white font-medium bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating Booking...' : 'Create Booking'}
        </button>
      </form>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </>
  );
}
