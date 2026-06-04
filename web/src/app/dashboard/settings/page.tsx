import { auth } from '@/lib/auth';
import { Settings, User, Building2, Bell, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-500 mt-1">Управлявай профила и организацията</p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <User className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Профил</h2>
        </div>
        <div className="flex items-center gap-4 mb-6">
          {session?.user.image ? (
            <img src={session.user.image} alt="" className="h-16 w-16 rounded-full" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xl font-semibold text-indigo-700">
                {session?.user.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{session?.user.name}</p>
            <p className="text-sm text-gray-500">{session?.user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full capitalize">
              {session?.user.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Профилът се управлява чрез Google Workspace. За промени, свържи се с администратора на домейна.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Организация</h2>
        </div>
        <dl className="space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Домейн</dt>
            <dd className="font-medium text-gray-900">{session?.user.email?.split('@')[1] ?? '—'}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Org ID</dt>
            <dd className="font-mono text-xs text-gray-600">{session?.user.orgId ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Bell className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Известия</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Ученик се включи в сесия', enabled: true },
            { label: 'Устройство излезе офлайн', enabled: true },
            { label: 'Опит за достъп до блокиран сайт', enabled: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <div className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors ${
                item.enabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform m-0.5 ${
                  item.enabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Shield className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Сигурност</h2>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">Двуфакторна автентикация</p>
            <p className="text-xs text-gray-500">Управлява се от Google Workspace</p>
          </div>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Активна</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Активни сесии</p>
            <p className="text-xs text-gray-500">Текущ браузър</p>
          </div>
          <button className="text-sm text-red-600 hover:text-red-700 font-medium">Изход от всички</button>
        </div>
      </section>
    </div>
  );
}