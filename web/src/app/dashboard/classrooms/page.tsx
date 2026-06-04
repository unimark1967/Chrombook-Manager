import { BookOpen, Plus, Users, Play, Square } from 'lucide-react';

const mockClassrooms = [
  { id: '1', name: '10А — Математика', teacher: 'Мариан Денчев', students: 24, activeSession: true, scene: 'Контролно' },
  { id: '2', name: '9Б — Информатика', teacher: 'Мариан Денчев', students: 18, activeSession: false, scene: null },
  { id: '3', name: '11В — Физика', teacher: 'Мариан Денчев', students: 22, activeSession: true, scene: 'Свободна работа' },
  { id: '4', name: '8А — Биология', teacher: 'Мариан Денчев', students: 26, activeSession: false, scene: null },
];

export default function ClassroomsPage() {
  const activeCount = mockClassrooms.filter(c => c.activeSession).length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Класни стаи</h1>
          <p className="text-sm text-gray-500 mt-1">{activeCount} активни сесии в момента</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" />
          Нова класна стая
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockClassrooms.map((classroom) => (
          <div key={classroom.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  classroom.activeSession ? 'bg-indigo-100' : 'bg-gray-100'
                }`}>
                  <BookOpen className={`h-5 w-5 ${classroom.activeSession ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
                  <p className="text-xs text-gray-500">{classroom.teacher}</p>
                </div>
              </div>
              {classroom.activeSession && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Активна
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {classroom.students} ученика
              </span>
              {classroom.scene && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-md">
                  {classroom.scene}
                </span>
              )}
            </div>

            <button className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              classroom.activeSession
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}>
              {classroom.activeSession
                ? <><Square className="h-3.5 w-3.5" /> Спри сесията</>
                : <><Play className="h-3.5 w-3.5" /> Стартирай сесия</>
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}