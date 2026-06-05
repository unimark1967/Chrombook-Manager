'use client';

import { useState, useTransition } from 'react';
import { Monitor, Wifi, WifiOff, FolderOpen, MoveRight } from 'lucide-react';
import { moveDevicesToOU } from './actions';

type Device = {
  id: string;
  serialNumber: string;
  status: string;
  lastSeen: Date | null;
  orgUnitPath: string | null;
  student: { name: string; email: string } | null;
};

const OU_OPTIONS = [
  '/Chrombooks - Ученици в Час/ИЗПИТ',
  '/Chrombooks - Ученици в Час/Изолация',
  '/Chrombooks - Ученици в Час/Работа_в_клас',
  '/Устройства',
];

function timeAgo(date: Date | null) {
  if (!date) return 'никога';
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `преди ${diff} сек`;
  if (diff < 3600) return `преди ${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `преди ${Math.floor(diff / 3600)} ч`;
  return `преди ${Math.floor(diff / 86400)} дни`;
}

export default function DevicesTable({ devices }: { devices: Device[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetOU, setTargetOU] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const allSelected = devices.length > 0 && selected.size === devices.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(devices.map((d) => d.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMove() {
    if (!targetOU || selected.size === 0) return;
    startTransition(async () => {
      const result = await moveDevicesToOU(Array.from(selected), targetOU);
      setMessage(result.message);
      setSelected(new Set());
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <span className="text-sm font-medium text-indigo-700">
            {selected.size} избрани
          </span>
          <select
            value={targetOU}
            onChange={(e) => setTargetOU(e.target.value)}
            className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">-- Избери OU --</option>
            {OU_OPTIONS.map((ou) => (
              <option key={ou} value={ou}>{ou}</option>
            ))}
          </select>
          <button
            onClick={handleMove}
            disabled={!targetOU || isPending}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <MoveRight className="h-4 w-4" />
            {isPending ? 'Преместване...' : 'Премести'}
          </button>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {message}
        </div>
      )}

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
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Сериен номер</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Ученик</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Организационна единица
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Статус</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Последно виждане</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.map((device) => (
                <tr key={device.id}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(device.id) ? 'bg-indigo-50' : ''}`}
                  onClick={() => toggleOne(device.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(device.id)} onChange={() => toggleOne(device.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Monitor className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 font-mono">{device.serialNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {device.student ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{device.student.name}</p>
                        <p className="text-xs text-gray-500">{device.student.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded">
                      {device.orgUnitPath ?? '/'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {device.status === 'active' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {device.status === 'active' ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
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