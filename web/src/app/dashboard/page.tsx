import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Monitor, Users, BookOpen, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getDashboardStats(orgId: string) {
  const [deviceCount, classroomCount, activeSessionCount] = await Promise.all([
    prisma.device.count({ where: { orgId } }),
    prisma.classroom.count({ where: { orgId } }),
    prisma.classroomSession.count({ where: { classroom: { orgId }, endedAt: null } }),
  ]);
  return { deviceCount, classroomCount, activeSessionCount };
}

function DeviceCard({ name, status }: { name: string; status: string }) {
  const isLocked = status === 'locked';
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Monitor className="h-5 w-5 text-gray-400" />
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isLocked
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {isLocked ? 'Заключено' : 'Активно'}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
    </div>
  );
}

const DEMO_DEVICES = [
  { name: 'CBK-001', status: 'active' },
  { name: 'CBK-002', status: 'active' },
  { name: 'CBK-003', status: 'locked' },
  { name: 'CBK-004', status: 'active' },
  { name: 'CBK-005', status: 'active' },
  { name: 'CBK-006', status: 'locked' },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const orgId = (session.user as { orgId?: string }).orgId;

  const stats = orgId
    ? await getDashboardStats(orgId)
    : { deviceCount: 0, classroomCount: 0, activeSessionCount: 0 };

  const statCards = [
    {
      title: 'Устройства',
      value: stats.deviceCount,
      icon: Monitor,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Класни стаи',
      value: stats.classroomCount,
      icon: BookOpen,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Активни сесии',
      value: stats.activeSessionCount,
      icon: Activity,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Онлайн ученици',
      value: 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Добре дошли, {session.user.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">Преглед на устройствата и сесиите</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div className={`${card.bg} p-2 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Device Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">
            Устройства в класната стая
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {DEMO_DEVICES.map((device) => (
              <DeviceCard key={device.name} {...device} />
            ))}
          </div>
          {stats.deviceCount === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">
              Няма регистрирани устройства. Инсталирайте разширението на устройствата.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
