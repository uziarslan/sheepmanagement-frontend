import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { HiOutlineClock, HiOutlineUserCircle, HiOutlineDocumentSearch } from 'react-icons/hi';
import { auditAPI } from '../../services/api';
import {
  PageHeader,
  Card,
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

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const result = await auditAPI.getAll({ page: 1, limit: 50 });
        if (result && Array.isArray(result.data)) {
          setLogs(result.data);
        } else if (Array.isArray(result)) {
          setLogs(result);
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Review recent actions performed by users across the system"
        breadcrumbs={[
          { label: 'Admin', path: '/dashboard' },
          { label: 'Audit Logs' }
        ]}
      />

      <Card>
        <Table>
          <TableHead>
            <TableHeader>Time</TableHeader>
            <TableHeader>User</TableHeader>
            <TableHeader>Action</TableHeader>
            <TableHeader>Entity</TableHeader>
            <TableHeader>Details</TableHeader>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableEmpty message="No audit logs recorded yet" colSpan={5} />
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <HiOutlineClock className="w-4 h-4 text-gray-400" />
                      {new Date(log.createdAt).toLocaleString()}
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
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-xs uppercase tracking-wide">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700">
                      {log.entityType || '-'}
                      {log.entityId && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({String(log.entityId).slice(0, 8)}…)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.metadata ? (
                      <div className="flex items-start gap-1 text-xs text-gray-600">
                        <HiOutlineDocumentSearch className="w-4 h-4 mt-0.5 text-gray-400" />
                        <pre className="max-w-xs whitespace-pre-wrap break-words bg-gray-50 px-2 py-1 rounded-md">
                          {JSON.stringify(log.metadata, null, 0)}
                        </pre>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AuditLogs;

