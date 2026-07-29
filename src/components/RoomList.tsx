'use client';

import { useEffect, useState } from 'react';

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
}

export function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading rooms...</div>
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

  if (rooms.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No rooms available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <div key={room.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">Capacity:</span> {room.capacity} people
            </p>
            <p>
              <span className="font-medium">Location:</span> {room.location}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
