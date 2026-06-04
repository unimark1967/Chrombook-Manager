import { Users, Search, Monitor, BookOpen } from 'lucide-react';

const mockStudents = [
  { id: '1', name: 'Иван Петров', email: 'ivan.petrov@yovkovschoolvarna.bg', classroom: '10А', device: 'CB-2024-001', online: true },
  { id: '2', name: 'Мария Иванова', email: 'maria.ivanova@yovkovschoolvarna.bg', classroom: '10А', device: 'CB-2024-002', online: true },
  { id: '3', name: 'Георги Димитров', email: 'georgi.dimitrov@yovkovschoolvarna.bg', classroom: '9Б', device: 'CB-2024-003', online: false },
  { id: '4', name: 'Елена Стоянова', email: 'elena.stoyanova@yovkovschoolvarna.bg', classroom: '11В', device: 'CB-2024-004', online: true },
  { id: '5', name: 'Димитър Николов', email: 'dimitar.nikolov@yovkovschoolvarna.bg', classroom: '8А', device: 'CB-2024-006', online: true },
  { id: '6', name: 'Анна Христова', email: 'anna.hristova@yovkovschoolvarna.bg', classroom: '9Б', device: '—', online: false },
];

export default function StudentsPage() {
  const onlineCount = mockStudents.filter(s => s.online).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ученици</h1>
        <p className="text-sm text-gray-500 mt-1">{onlineCount} онлайн от {mockStudents.length} общо</p>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Търси ученик..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Ученик</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Клас</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Устройство</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-indigo-700">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                    <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                    {student.classroom}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 font-mono">
                    <Monitor className="h-3.5 w-3.5 text-gray-400" />
                    {student.device}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    student.online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${student.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {student.online ? 'Онлайн' : 'Офлайн'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}