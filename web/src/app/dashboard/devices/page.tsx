import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import DevicesTable from './DevicesTable';

export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user?.orgId) redirect('/');

  const devices = await prisma.device.findMany({
    where: { orgId: session.user.orgId },
    include: { student: { select: { name: true, email: true } } },
    orderBy: [{ orgUnitPath: 'asc' }, { lastSeen: 'desc' }],
  });

  const activeCount = devices.filter((d) => d.status === 'active').length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Устройства</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} активни от {devices.length} общо
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" />
          Добави устройство
        </button>
      </div>
      <DevicesTable devices={devices} />
    </div>
  );
}