import { Alert, Card, Descriptions, Empty, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/api/endpoints';

/**
 * 声誉主页 /users/:id
 * - 通过路由参数 id 调 api.reputation(userId) 拉取声誉档案
 * - 展示：声誉值、可用积分、冻结积分、徽章墙
 */
export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const profileQuery = useQuery({
    queryKey: ['reputation', userId] as const,
    queryFn: () => api.reputation(userId),
    enabled: Number.isFinite(userId),
  });

  if (profileQuery.isError) {
    return (
      <Card title="用户声誉">
        <Alert type="error" showIcon message={profileQuery.error?.message ?? '加载失败'} />
      </Card>
    );
  }

  const profile = profileQuery.data;

  return (
    <Card title={profile?.displayName ?? '用户声誉'} loading={profileQuery.isLoading}>
      {profile && (
        <>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="声誉值">
              <Typography.Text strong style={{ fontSize: 20 }}>
                {profile.reputation}
              </Typography.Text>
            </Descriptions.Item>
            {typeof profile.availablePoints === 'number' && (
              <Descriptions.Item label="可用积分">{profile.availablePoints}</Descriptions.Item>
            )}
            {typeof profile.frozenPoints === 'number' && (
              <Descriptions.Item label="冻结积分">{profile.frozenPoints}</Descriptions.Item>
            )}
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 16 }}>
            徽章墙
          </Typography.Title>
          {profile.badges.length === 0 ? (
            <Empty description="暂无徽章" />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profile.badges.map((b) => (
                <Tag key={b.code} color="blue" style={{ padding: '4px 8px' }}>
                  {b.name}
                </Tag>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
