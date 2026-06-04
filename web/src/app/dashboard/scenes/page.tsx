import { Shield, Plus, Globe, Lock, Gauge } from 'lucide-react';

const mockScenes = [
  {
    id: '1',
    name: 'Контролно',
    rules: [
      { type: 'lock', label: 'Заключи всички сайтове', icon: Lock },
      { type: 'url_allow', label: 'Разреши: docs.google.com', icon: Globe },
    ],
    isGlobal: true,
    usedIn: 3,
  },
  {
    id: '2',
    name: 'Свободна работа',
    rules: [
      { type: 'url_block', label: 'Блокирай: youtube.com', icon: Globe },
      { type: 'url_block', label: 'Блокирай: tiktok.com', icon: Globe },
      { type: 'tab_limit', label: 'Макс. 5 таба', icon: Gauge },
    ],
    isGlobal: false,
    usedIn: 1,
  },
  {
    id: '3',
    name: 'Изпит',
    rules: [
      { type: 'lock', label: 'Заключи всички сайтове', icon: Lock },
      { type: 'url_allow', label: 'Разреши: classroom.google.com', icon: Globe },
      { type: 'tab_limit', label: 'Макс. 2 таба', icon: Gauge },
    ],
    isGlobal: true,
    usedIn: 5,
  },
];

export default function ScenesPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Сцени</h1>
          <p className="text-sm text-gray-500 mt-1">Управлявай правила за достъп до интернет</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" />
          Нова сцена
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockScenes.map((scene) => (
          <div key={scene.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{scene.name}</h3>
                  <p className="text-xs text-gray-500">Използва се в {scene.usedIn} сесии</p>
                </div>
              </div>
              {scene.isGlobal && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
                  Глобална
                </span>
              )}
            </div>

            <div className="space-y-2">
              {scene.rules.map((rule, i) => {
                const Icon = rule.icon;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span>{rule.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button className="flex-1 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                Редактирай
              </button>
              <button className="flex-1 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                Приложи
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}