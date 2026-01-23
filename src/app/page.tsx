import { notFound } from 'next/navigation';

// Base URL (/) returns 404 - users must access via family-specific URLs like /al-saeed
export default function Home() {
  notFound();
}
