'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import { adminApi, type AuditLogEntry } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

const KNOWN_ENTITIES = [
  'users',
  'invoices',
  'employees',
  'contractors',
  'contracts',
  'absences',
  'payrolls',
  'ksef',
  'credentials',
  'conversations',
  'audit-log',
];

const KNOWN_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];

function actionBadgeClass(action: string): string {
  if (action.startsWith('CREATE'))
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (action.startsWith('DELETE'))
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
}

interface AuditLogRowProps {
  log: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  t: typeof enTranslations.admin.auditLog;
}

function AuditLogRow({ log, isExpanded, onToggle, t }: AuditLogRowProps) {
  const userLabel = log.user
    ? `${log.user.email}${log.user.firstName ? ` (${log.user.firstName}${log.user.lastName ? ` ${log.user.lastName}` : ''})` : ''}`
    : log.userId ?? t.table.system;

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
          {new Date(log.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[180px] truncate">
          {userLabel}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionBadgeClass(log.action)}`}
          >
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
          {log.entity}
          {log.entityId ? `/${log.entityId.slice(0, 8)}` : ''}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
          {log.ip ?? '-'}
        </td>
        <td className="px-4 py-3">
          {log.changes ? (
            <button
              onClick={onToggle}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isExpanded ? t.table.hideChanges : t.table.showChanges}
            </button>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>
      </tr>
      {isExpanded && log.changes && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
            <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-48 font-mono">
              {JSON.stringify(log.changes, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditLogTable() {
  const { locale } = useLocale();
  const t = translations[locale].admin.auditLog;

  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-log', page, entity, action, dateFrom, dateTo],
    queryFn: () =>
      adminApi.fetchAuditLog({
        page,
        limit,
        entity: entity || undefined,
        action: action || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    staleTime: 60 * 1000,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const handleReset = () => {
    setPage(1);
    setEntity('');
    setAction('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.title}</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t.filters.allEntities}</option>
            {KNOWN_ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t.filters.allActions}</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t.filters.reset}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t.table.timestamp}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t.table.user}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t.table.action}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t.table.entity}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t.table.ip}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t.table.changes}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {t.loading}
                </td>
              </tr>
            ) : data?.logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {t.noLogs}
                </td>
              </tr>
            ) : (
              data?.logs.map((log) => (
                <AuditLogRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedId === log.id}
                  onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  t={t}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t.pagination.page} {page} {t.pagination.of} {totalPages} ({data?.total}{' '}
            {t.pagination.entries})
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t.pagination.previous}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t.pagination.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
