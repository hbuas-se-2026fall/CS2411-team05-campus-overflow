import { Alert, Button, Card, List, Tabs, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/endpoints';
import type { Course } from '@/shared/types';

/** 课程列表（全部课程 / 我的课程共用）：显示课程信息 + 加入按钮或已加入标签 */
function CourseList({
  courses,
  onJoin,
  joining,
}: {
  courses: Course[];
  onJoin: (id: number) => void;
  joining?: number;
}) {
  return (
    <List
      dataSource={courses}
      locale={{ emptyText: <Typography.Text type="secondary">暂无课程。</Typography.Text> }}
      renderItem={(c) => (
        <List.Item
          actions={[
            c.myRole ? (
              <Tag key="joined" color="green">
                {c.myRole === 'TEACHER' ? '我创建的' : '已加入'}
              </Tag>
            ) : (
              <Button
                key="join"
                type="primary"
                size="small"
                loading={joining === c.id}
                onClick={() => onJoin(c.id)}
              >
                加入
              </Button>
            ),
          ]}
        >
          <List.Item.Meta
            title={
              <span>
                {c.name} <Typography.Text type="secondary">({c.code})</Typography.Text>
              </span>
            }
            description={`${c.term} · 教师：${c.teacherName}`}
          />
        </List.Item>
      )}
    />
  );
}

export function CoursesPage() {
  const queryClient = useQueryClient();

  const all = useQuery({ queryKey: ['courses'], queryFn: () => api.courses() });
  const mine = useQuery({ queryKey: ['myCourses'], queryFn: () => api.myCourses() });

  const joinMutation = useMutation({
    mutationFn: (courseId: number) => api.joinCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['myCourses'] });
    },
  });

  return (
    <Card title="课程">
      {all.isError && (
        <Alert type="error" showIcon message={all.error?.message ?? '加载失败'} />
      )}
      <Tabs
        items={[
          {
            key: 'all',
            label: '全部课程',
            children: (
              <CourseList
                courses={all.data ?? []}
                onJoin={(id) => joinMutation.mutate(id)}
                joining={joinMutation.variables}
              />
            ),
          },
          {
            key: 'mine',
            label: '我的课程',
            children: (
              <CourseList
                courses={mine.data ?? []}
                onJoin={(id) => joinMutation.mutate(id)}
                joining={joinMutation.variables}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
