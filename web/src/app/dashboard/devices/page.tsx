import { Monitor, Search, Filter, Plus, Wifi, WifiOff } from 'lucide-react';

const mockDevices = [
  { id: '1', serial: 'CB-2024-001', model: 'Acer Chromebook 314', student: 'Иван Петров', status: 'active', lastSeen: 'преди 2 мин' },
  { id: '2', serial: 'CB-2024-002', model: 'HP Chromebook 11', student: 'Мария Иванова', status: 'active', lastSeen: 'преди 5 мин' },
  { id: '3', serial: 'CB-2024-003', model: 'Lenovo Chromebook 100e', student: 'Георги Димитров', status: 'offline', lastSeen: 'преди 1 час' },
  { id: '4', serial: 'CB-2024-004', model: 'Dell Chromebook 3100', student: 'Елена Стоянова', status: 'active', lastSeen: 'преди 1 мин' },
  { id: '5', serial: 'CB-2024-005', model: 'Acer Chromebook 314', student: '—', status: 'offline', lastSeen: 'преди 2 дни' },
  { id: '6', serial: 'CB-2024-006', model: 'HP Chromebook 11', student: 'Димитър Николов', status: 'active', lastSeen: 'преди 3 мин' },
];

export default function DevicesPage() {
  const activeCount = mockDevices.filter(d => d.status === 'active').length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Устройства</h1>
          <p className="text-sm text-gray-500 mt-1">{activeCount} активни от {mockDevices.length} общо</p>
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
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Устройство</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Сериен номер</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Ученик</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Статус</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Последно виждане</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockDevices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{device.model}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{device.serial}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{device.student}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {device.status === 'active' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {device.status === 'active' ? 'Онлайн' : 'Офлайн'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{device.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}