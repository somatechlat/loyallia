/* Redirect to program detail page where the active V1 designer lives */

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProgramDesignRedirect() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  useEffect(() => {
    router.replace(`/programs/${programId}`);
  }, [programId, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
