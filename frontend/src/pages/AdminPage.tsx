import { Alert, Button, Card, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/endpoints';
import type { AdminUser, Page, ReconciliationMismatch, Role } from '@/shared/types';

const ADMIN_USERS_KEY = ['admin-users'] as const;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'STUDENT', label: '学生' },
  { value: 'TA', label: '助教' },
  { value: 'TEACHER', label: '教师' },
  { value: 'ADMIN', label: '管理员' },
];

export function AdminPage() {
  const queryClient = useQueryClient();
  const [verified, setVerified] = useState(false);

  const usersQuery = useQuery<Page<AdminUser>>({
    queryKey: [...ADMIN_USERS_KEY, verified] as const,
    queryFn: () => api.adminListUsers(verified),
  });

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => api.adminVerifyUser(id),
    onSuccess: refreshUsers,
  });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => api.adminChangeRole(id, role),
    onSuccess: refreshUsers,
  });
  const reconcileMutation = useMutation({
    mutationFn: () => api.adminReconcile(),
  });

  const columns: ColumnsType<AdminUser> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '昵称', dataIndex: 'displayName' },
    { title: '学号/工号', dataIndex: 'maskedUsername' },
    { title: '学院', dataIndex: 'college', render: (v?: string) => v || '-' },
    {
      title: '认证',
      dataIndex: 'verified',
      width: 140,
      render: (ok: boolean, r) =>
        ok ? (
          <Tag color="green">已认证</Tag>
        ) : (
          <Button size="small" loading={verifyMutation.isPending} onClick={() => verifyMutation.mutate(r.id)}>
            完成认证
          </Button>
        ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 160,
      render: (role: Role, r) => (
        <Select
          size="small"
          value={role}
          style={{ width: 120 }}
          options={ROLE_OPTIONS}
          onChange={(v) => roleMutation.mutate({ id: r.id, role: v })}
        />
      ),
    },
  ];

  return (
    <Card title="管理后台">
      <Tabs
        items={[
          {
            key: 'users',
            label: '用户管理',
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space>
                  <Typography.Text>认证状态：</Typography.Text>
                  <Select
                    value={verified}
                    style={{ width: 120 }}
                    onChange={(v) => setVerified(v)}
                    options={[
                      { value: false, label: '未认证' },
                      { value: true, label: '已认证' },
                    ]}
                  />
                </Space>
                {usersQuery.isError && (
                  <Alert type="error" showIcon message={usersQuery.error?.message ?? '加载失败'} />
                )}
                <Table
                  rowKey="id"
                  loading={usersQuery.isLoading}
                  columns={columns}
                  dataSource={usersQuery.data?.items ?? []}
                  pagination={false}
                />
              </Space>
            ),
          },
          {
            key: 'reconcile',
            label: '声誉对账',
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Button loading={reconcileMutation.isPending} onClick={() => reconcileMutation.mutateAsync()}>
                  立即执行对账
                </Button>
                {reconcileMutation.data && reconcileMutation.data.length === 0 && (
                  <Typography.Text type="success">对账通过，无不一致。</Typography.Text>
                )}
                {reconcileMutation.data && reconcileMutation.data.length > 0 && (
                  <Table<ReconciliationMismatch>
                    rowKey="userId"
                    pagination={false}
                    columns={[
                      { title: '用户 ID', dataIndex: 'userId' },
                      { title: '账户声誉', dataIndex: 'accountReputation' },
                      { title: '台账累计', dataIndex: 'ledgerSum' },
                    ]}
                    dataSource={reconcileMutation.data}
                  />
                )}
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
