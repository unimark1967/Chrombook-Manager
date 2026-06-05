import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Monitor, Search, Filter, Plus, Wifi, WifiOff } from 'lucide-react';

export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user?.orgId) redirect('/');

  const devices = await prisma.device.findMany({
    where: { orgId: session.user.orgId },
    include: { student: { select: { name: true, email: true } } },
    orderBy: { lastSeen: 'desc' },
  });

  const activeCount = devices.filter(d => d.status === 'active').length;

  function timeAgo(date: Date | null) {
    if (!date) return 'никога';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `преди ${diff} сек`;
    if (diff < 3600) return `преди ${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `преди ${Math.floor(diff / 3600)} ч`;
    return `преди ${Math.floor(diff / 86400)} дни`;
  }

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

      <div className="mb-6 flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Търси по сериен номер или ученик..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Filter className="h-4 w-4" />
          Филтър
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {devices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Monitor className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Няма устройства</p>
            <p className="text-sm mt-1">Добави Chromebook устройства за да започнеш</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Сериен номер</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Ученик</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Статус</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Последно виждане</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Monitor className="h-4 w-4 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 font-mono">{device.serialNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {device.student ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{device.student.name}</p>
                        <p className="text-xs text-gray-500">{device.student.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Не е назначен</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {device.status === 'active' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {device.status === 'active' ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {timeAgo(device.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}