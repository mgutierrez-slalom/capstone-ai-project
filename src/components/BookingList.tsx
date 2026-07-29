'use client';

import { useEffect, useState } from 'react';

interface Room {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  roomId: string;
  organizerName: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export function BookingList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Map<string, string>>(new Map()); // roomId -> roomName
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Fetch rooms first
        const roomsResponse = await fetch('/api/rooms');
        if (!roomsResponse.ok) {
          throw new Error('Failed to load rooms');
        }
        const roomsData: Room[] = await roomsResponse.json();
        const roomMap = new Map(roomsData.map((r) => [r.id, r.name]));
        setRooms(roomMap);

        // Then fetch bookings
        const bookingsResponse = await fetch('/api/bookings');
        if (!bookingsResponse.ok) {
          throw new Error('Failed to load bookings');
        }
        const bookingsData = await bookingsResponse.json();
        setBookings(bookingsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function fetchBookings() {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Failed to load bookings');
      }
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function addToast(message: string, type: 'success' | 'error') {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  async function handleCancel(bookingId: string) {
    setShowConfirm(null);
    setCancellingId(bookingId);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        addToast(`Error: ${data.message}`, 'error');
        setCancellingId(null);
        return;
      }

      addToast('Booking cancelled successfully', 'success');
      await fetchBookings();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to cancel booking', 'error');
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No bookings</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs font-semibold text-gray-900 bg-gray-100">
            <tr>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Organizer</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Start Time</th>
              <th className="px-4 py-3">End Time</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{rooms.get(booking.roomId) || 'Unknown Room'}</td>
                <td className="px-4 py-3">{booking.organizerName}</td>
                <td className="px-4 py-3">{booking.title}</td>
                <td className="px-4 py-3">{new Date(booking.startTime).toLocaleString()}</td>
                <td className="px-4 py-3">{new Date(booking.endTime).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setShowConfirm(booking.id)}
                    disabled={cancellingId === booking.id}
                    className="px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  >
                    {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900">Cancel Booking?</h3>
            <p className="mt-2 text-gray-600">Are you sure you want to cancel this booking? This action cannot be undone.</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Keep Booking
              </button>
              <button
                onClick={() => handleCancel(showConfirm)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
