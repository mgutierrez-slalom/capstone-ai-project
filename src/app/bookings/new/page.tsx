import Link from 'next/link';
import { BookingForm } from '@/components/BookingForm';

export default function NewBookingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Create New Booking</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <BookingForm />
        </div>
      </div>
    </main>
  );
}
