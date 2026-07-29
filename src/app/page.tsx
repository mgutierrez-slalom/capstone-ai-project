import Link from 'next/link';
import { RoomList } from '@/components/RoomList';
import { BookingList } from '@/components/BookingList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">RoomFlow</h1>
          <p className="mt-2 text-gray-600">Meeting Room Booking System</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Rooms Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
          </div>
          <RoomList />
        </section>

        {/* Bookings Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Bookings</h2>
            <Link
              href="/bookings/new"
              className="px-4 py-2 text-white font-medium bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              New Booking
            </Link>
          </div>
          <BookingList />
        </section>
      </div>
    </main>
  );
}
