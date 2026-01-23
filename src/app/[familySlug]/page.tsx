import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getFamilyBySlug, getAllFamilySlugs } from '@/config/families';
import { FamilyTreeClient } from './FamilyTreeClient';

interface PageProps {
  params: Promise<{ familySlug: string }>;
}

// Generate static paths for all families at build time
export function generateStaticParams() {
  return getAllFamilySlugs().map((slug) => ({
    familySlug: slug,
  }));
}

// Generate metadata per family
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { familySlug } = await params;
  const family = getFamilyBySlug(familySlug);

  if (!family) {
    return {
      title: 'العائلة غير موجودة',
    };
  }

  return {
    title: `عائلة ${family.displayName}`,
    description: `شجرة عائلة ${family.displayName}`,
  };
}

export default async function FamilyPage({ params }: PageProps) {
  const { familySlug } = await params;
  const family = getFamilyBySlug(familySlug);

  if (!family) {
    notFound();
  }

  return <FamilyTreeClient familyConfig={family} />;
}
