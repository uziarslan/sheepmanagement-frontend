import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineClock,
  HiOutlineUserCircle,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineDesktopComputer,
  HiOutlineGlobeAlt
} from 'react-icons/hi';
import { auditAPI } from '../../services/api';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  SearchInput,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  PageLoader,
  Badge
} from '../../components/common';

// Default page size — small enough to be readable, large enough to be useful.
const DEFAULT_LIMIT = 25;
const LIMIT_OPTIONS = [10, 25, 50, 100];

const EMPTY_FILTERS = {
  userId: '',
  action: '',
  entityType: '',
  startDate: '',
  endDate: '',
  search: ''
};

/**
 * Audit log viewer (Admin-only).
 *
 * Features:
 *  - Filter by user / action / entity type / date range / free-text search.
 *  - Server-side pagination.
 *  - Expandable rows to show full metadata, IP, user-agent.
 *  - Auto-refresh on filter change with debounce on the search field.
 *
 * Distinct values for the user/action/entityType dropdowns come from
 * GET /api/audit-logs/facets so the dropdowns only show values that
 * actually exist in the audit log.
 */
const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [facets, setFacets] = useState({ actions: [], entityTypes: [], users: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [pendingSearch, setPendingSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => v && String(v).trim() !== '').length;
  }, [filters]);

  // ── Data fetchers ────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const params = { page, limit };
      for (const [k, v] of Object.entries(filters)) {
        if (v && String(v).trim() !== '') params[k] = v;
      }
      const result = await auditAPI.getAll(params);
      if (result && Array.isArray(result.data)) {
        setLogs(result.data);
        if (result.meta) {
          setMeta({
            total: result.meta.total || 0,
            totalPages: result.meta.totalPages || 1
          });
        }
      } else {
        setLogs([]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, filters]);

  const fetchFacets = useCallback(async () => {
    try {
      const result = await auditAPI.getFacets();
      if (result?.data) {
        setFacets({
          actions: result.data.actions || [],
          entityTypes: result.data.entityTypes || [],
          users: result.data.users || []
        });
      }
    } catch {
      // Non-fatal — filters still work via free-text and date.
    }
  }, []);

  useEffect(() => {
    fetchFacets();
  }, [fetchFacets]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search — wait 400ms after the last keystroke before firing.
  useEffect(() => {
    const t = setTimeout(() => {
      if (pendingSearch !== filters.search) {
        setFilters((prev) => ({ ...prev, search: pendingSearch }));
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [pendingSearch, filters.search]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPendingSearch('');
    setPage(1);
  };

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onLimitChange = (e) => {
    setLimit(Number(e.target.value) || DEFAULT_LIMIT);
    setPage(1);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const actionVariant = (action = '') => {
    const a = action.toLowerCase();
    if (a.includes('delete') || a.includes('terminat')) return 'danger';
    if (a.includes('updat') || a.includes('edit')) return 'warning';
    if (a.includes('creat') || a.includes('add') || a.includes('register')) return 'success';
    if (a.includes('login') || a.includes('logout')) return 'info';
    return 'default';
  };

  if (loading && logs.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle={`${meta.total.toLocaleString()} entries across ${facets.actions.length} action types`}
        breadcrumbs={[
          { label: 'Admin', path: '/dashboard' },
          { label: 'Audit Logs' }
        ]}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={HiOutlineFilter}
              onClick={() => setShowFilters((v) => !v)}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button
              variant="ghost"
              icon={HiOutlineRefresh}
              onClick={() => fetchLogs()}
              loading={refreshing}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Quick free-text search */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1">
            <SearchInput
              value={pendingSearch}
              onChange={setPendingSearch}
              placeholder="Search action, entity, IP, user agent..."
            />
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              icon={HiOutlineX}
              onClick={clearFilters}
              className="text-red-600 hover:text-red-700"
            >
              Clear all filters
            </Button>
          )}
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 pt-5 border-t">
            <Select
              label="User"
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              placeholder="All users"
            >
              {facets.users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}{u.email ? ` (${u.email})` : ''}
                </option>
              ))}
            </Select>

            <Select
              label="Action"
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              placeholder="All actions"
            >
              {facets.actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>

            <Select
              label="Entity Type"
              name="entityType"
              value={filters.entityType}
              onChange={handleFilterChange}
              placeholder="All entity types"
            >
              {facets.entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>

            <Input
              label="From"
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />

            <Input
              label="To"
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />

            <Select
              label="Rows per page"
              name="limit"
              value={limit}
              onChange={onLimitChange}
              placeholder="25"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {/* Results */}
      <Card>
        <Table>
          <TableHead>
            <TableHeader className="w-8" />
            <TableHeader>Time</TableHeader>
            <TableHeader>User</TableHeader>
            <TableHeader>Action</TableHeader>
            <TableHeader>Entity</TableHeader>
            <TableHeader>Source</TableHeader>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableEmpty
                message={
                  activeFilterCount > 0
                    ? 'No audit logs match the current filters'
                    : 'No audit logs recorded yet'
                }
                colSpan={6}
              />
            ) : (
              logs.map((log) => {
                const isOpen = expanded.has(log._id);
                return (
                  <React.Fragment key={log._id}>
                    <TableRow>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(log._id)}
                          className="p-1 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100"
                          aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                        >
                          {isOpen
                            ? <HiOutlineChevronUp className="w-4 h-4" />
                            : <HiOutlineChevronDown className="w-4 h-4" />
                          }
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <HiOutlineClock className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(log.createdAt).toISOString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <HiOutlineUserCircle className="w-5 h-5 text-gray-400" />
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">
                              {log.user?.name || 'System'}
                            </p>
                            {log.user?.email && (
                              <p className="text-xs text-gray-500">{log.user.email}</p>
                            )}
                            {log.user?.role && (
                              <Badge size="sm" variant="info" className="mt-1">
                                {log.user.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={actionVariant(log.action)}
                          className="uppercase tracking-wide"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">
                          {log.entityType || '—'}
                          {log.entityId && (
                            <div className="text-xs text-gray-400 font-mono mt-0.5">
                              {String(log.entityId).slice(0, 12)}…
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {log.ip && (
                            <div className="flex items-center gap-1">
                              <HiOutlineGlobeAlt className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-mono">{log.ip}</span>
                            </div>
                          )}
                          {log.userAgent && (
                            <div
                              className="flex items-center gap-1 max-w-[200px] truncate"
                              title={log.userAgent}
                            >
                              <HiOutlineDesktopComputer className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{log.userAgent}</span>
                            </div>
                          )}
                          {!log.ip && !log.userAgent && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50">
                          <div className="px-2 py-3 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-semibold text-gray-700 mb-1">Log ID</p>
                                <p className="font-mono text-gray-600 break-all">{log._id}</p>
                              </div>
                              {log.entityId && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">Entity ID</p>
                                  <p className="font-mono text-gray-600 break-all">{log.entityId}</p>
                                </div>
                              )}
                              {log.ip && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">IP Address</p>
                                  <p className="font-mono text-gray-600">{log.ip}</p>
                                </div>
                              )}
                              {log.userAgent && (
                                <div className="md:col-span-2">
                                  <p className="font-semibold text-gray-700 mb-1">User Agent</p>
                                  <p className="text-gray-600 break-words">{log.userAgent}</p>
                                </div>
                              )}
                            </div>
                            {log.metadata ? (
                              <div>
                                <p className="font-semibold text-gray-700 mb-1 text-xs">
                                  Metadata
                                </p>
                                <pre className="text-xs bg-white border rounded p-3 overflow-x-auto whitespace-pre-wrap break-words text-gray-700">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No metadata recorded.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Page <span className="font-medium">{page}</span> of{' '}
              <span className="font-medium">{meta.totalPages}</span> · {meta.total.toLocaleString()} total entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page <= 1 || refreshing}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || refreshing}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages || refreshing}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(meta.totalPages)}
                disabled={page >= meta.totalPages || refreshing}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
