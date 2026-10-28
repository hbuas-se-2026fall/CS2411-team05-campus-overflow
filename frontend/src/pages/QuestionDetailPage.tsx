import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useQuestion, useQuestionMutations, useRelatedQuestions } from '@/features/questions/detailHooks';
import { formatDate } from '@/shared/format';
import type { Comment } from '@/shared/types';

export function QuestionDetailPage() {
  const { id } = useParams();
  const questionId = Number(id);
  const navigate = useNavigate();
  const { me } = useAuth();

  const questionQuery = useQuestion(questionId);
  const relatedQuery = useRelatedQuestions(questionId);
  const q = questionQuery.data;
  const mutations = useQuestionMutations(questionId);
  const [draft, setDraft] = useState('');
  const [editQ, setEditQ] = useState(false);
  const [editA, setEditA] = useState<{ answerId: number; body: string } | null>(null);

  if (questionQuery.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (questionQuery.isError || !q) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载失败"
        description={questionQuery.error?.message ?? '问题不存在或已删除'}
      />
    );
  }

  const toggleVote = (current: number, next: number) =>
    mutations.vote.mutateAsync(current === next ? 0 : next);
  const toggleAnswerVote = (answerId: number, current: number, next: number) =>
    mutations.answerVote.mutateAsync({ answerId, value: current === next ? 0 : next });

  const openBounty = () => {
    Modal.confirm({
      title: '发起悬赏',
      content: <BountyInput onOk={(points) => mutations.bounty.mutateAsync({ points, days: 7 })} />,
      okText: '发起',
    });
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          {q.title}
        </Typography.Title>
        <Space wrap>
          <Typography.Text type="secondary">
            {q.author.displayName} · {formatDate(q.createdAt)} · {q.viewCount} 次浏览
          </Typography.Text>
          {q.course && <Tag color="geekblue">课程 {q.course.name}</Tag>}
        </Space>

        <Divider />

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Space direction="vertical" align="center" size={4}>
            <Button
              type={q.myVote === 1 ? 'primary' : 'default'}
              size="small"
              disabled={!me}
              onClick={() => toggleVote(q.myVote, 1)}
            >
              ▲
            </Button>
            <Typography.Text strong>{q.score}</Typography.Text>
            <Button
              type={q.myVote === -1 ? 'primary' : 'default'}
              size="small"
              disabled={!me}
              onClick={() => toggleVote(q.myVote, -1)}
            >
              ▼
            </Button>
          </Space>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 正文由后端渲染并经 commonmark + OWASP Sanitizer 双重净化 */}
            <div className="post-body" dangerouslySetInnerHTML={{ __html: q.bodyHtml }} />
            <div style={{ marginTop: 12 }}>
              {q.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
            <CommentList
              comments={q.comments}
              onAdd={(body, parentId) => mutations.comment.mutateAsync({ body, parentId })}
              canComment={!!me}
            />
            {q.permissions.canManage && (
              <Button type="link" style={{ paddingLeft: 0 }} onClick={openBounty}>
                发起悬赏
              </Button>
            )}
            {q.permissions.canEdit && (
              <Button type="link" style={{ paddingLeft: 0 }} onClick={() => setEditQ(true)}>
                编辑问题
              </Button>
            )}
            {q.permissions.canDelete && (
              <Popconfirm
                title="确定删除这个问题吗？"
                onConfirm={async () => {
                  await mutations.remove.mutateAsync();
                  message.success('问题已删除');
                  navigate('/questions');
                }}
              >
                <Button type="link" danger style={{ paddingLeft: 0 }}>
                  删除问题
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </Card>

      <Typography.Title level={4}>{q.answerCount} 个回答</Typography.Title>
      {q.answers.map((a) => (
        <Card
          key={a.id}
          style={q.acceptedAnswerId === a.id ? { borderColor: '#2da44e' } : undefined}
          styles={{ body: { padding: 16 } }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Space direction="vertical" align="center" size={4}>
              <Button
                type={a.myVote === 1 ? 'primary' : 'default'}
                size="small"
                disabled={!me}
                onClick={() => toggleAnswerVote(a.id, a.myVote, 1)}
              >
                ▲
              </Button>
              <Typography.Text strong>{a.score}</Typography.Text>
              <Button
                type={a.myVote === -1 ? 'primary' : 'default'}
                size="small"
                disabled={!me}
                onClick={() => toggleAnswerVote(a.id, a.myVote, -1)}
              >
                ▼
              </Button>
              {q.acceptedAnswerId === a.id && (
                <Tag color="green" style={{ marginInlineEnd: 0 }}>
                  已采纳
                </Tag>
              )}
            </Space>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="post-body" dangerouslySetInnerHTML={{ __html: a.bodyHtml }} />
              <Space style={{ marginTop: 8 }}>
                <Typography.Text type="secondary">{a.author.displayName}</Typography.Text>
                {a.endorsedBy && <Tag color="purple">教师认证 · {a.endorsedBy.displayName}</Tag>}
                <Typography.Text type="secondary">{formatDate(a.createdAt)}</Typography.Text>
              </Space>
              <Space style={{ marginTop: 4 }}>
                {q.permissions.canAccept && !q.acceptedAnswerId && (
                  <Button size="small" onClick={() => mutations.accept.mutateAsync(a.id)}>
                    采纳此回答
                  </Button>
                )}
                {q.permissions.canManage && !a.endorsedBy && (
                  <Button size="small" onClick={() => mutations.endorse.mutateAsync(a.id)}>
                    教师认证
                  </Button>
                )}
                {a.canEdit && (
                  <>
                    <Button size="small" onClick={() => setEditA({ answerId: a.id, body: a.body })}>
                      编辑回答
                    </Button>
                    <Popconfirm
                      title="确定删除这条回答吗？"
                      onConfirm={async () => {
                        await mutations.deleteAnswer.mutateAsync(a.id);
                        message.success('回答已删除');
                      }}
                    >
                      <Button size="small" danger>
                        删除回答
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
              <CommentList
                comments={a.comments}
                onAdd={(body, parentId) =>
                  mutations.answerComment.mutateAsync({ answerId: a.id, body, parentId })
                }
                canComment={!!me}
              />
            </div>
          </div>
        </Card>
      ))}

      {me ? (
        <Card title="写回答" style={{ maxWidth: 800 }}>
          <Input.TextArea
            rows={8}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'支持 Markdown，代码请使用 ``` 包裹'}
          />
          <Button
            type="primary"
            style={{ marginTop: 12 }}
            loading={mutations.answer.isPending}
            onClick={async () => {
              if (!draft.trim()) {
                message.warning('回答内容不能为空');
                return;
              }
              await mutations.answer.mutateAsync(draft.trim());
              setDraft('');
              message.success('回答已提交');
            }}
          >
            提交回答
          </Button>
        </Card>
      ) : (
        <Typography.Text type="secondary">
          <Link to="/login">登录</Link> 后可以回答与投票。
        </Typography.Text>
      )}

      <Card title="相关问题" style={{ maxWidth: 800 }}>
        {(relatedQuery.data ?? []).length === 0 ? (
          <Typography.Text type="secondary">暂无</Typography.Text>
        ) : (
          <Space direction="vertical">
            {relatedQuery.data?.map((r) => (
              <Link key={r.id} to={`/questions/${r.id}`}>
                {r.title}
              </Link>
            ))}
          </Space>
        )}
      </Card>

      <EditQuestionModal
        open={editQ}
        initial={q ? { title: q.title, body: q.body, tags: q.tags } : { title: '', body: '', tags: [] }}
        submitting={mutations.editQuestion.isPending}
        onCancel={() => setEditQ(false)}
        onOk={async (v) => {
          await mutations.editQuestion.mutateAsync(v);
          message.success('问题已更新');
          setEditQ(false);
        }}
      />
      {editA && (
        <EditAnswerModal
          open={!!editA}
          initial={editA.body}
          submitting={mutations.editAnswer.isPending}
          onCancel={() => setEditA(null)}
          onOk={async (body) => {
            await mutations.editAnswer.mutateAsync({ answerId: editA.answerId, body });
            message.success('回答已更新');
            setEditA(null);
          }}
        />
      )}
    </Space>
  );
}

function CommentList({
  comments,
  onAdd,
  canComment,
}: {
  comments: Comment[];
  onAdd: (body: string, parentId?: number) => Promise<unknown>;
  canComment: boolean;
}) {
  const [replyingParent, setReplyingParent] = useState<number | 'top' | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roots = comments.filter((c) => !c.parentId);

  const submit = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(replyText.trim(), replyingParent === 'top' ? undefined : (replyingParent ?? undefined));
      setReplyText('');
      setReplyingParent(null);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = (body: string) =>
    body.split(/(@[^\s@]+)/g).map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} style={{ color: '#1677ff' }}>
          {part}
        </span>
      ) : (
        part
      ),
    );

  const replyInput = (target: number | 'top') =>
    replyingParent === target && canComment ? (
      <Space.Compact style={{ marginTop: 4, display: 'flex' }}>
        <Input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="回复，可用 @昵称 提醒"
          onPressEnter={submit}
        />
        <Button loading={submitting} onClick={submit}>
          发表
        </Button>
      </Space.Compact>
    ) : null;

  if (roots.length === 0) {
    return (
      <div style={{ marginTop: 12 }}>
        {canComment ? (
          <>
            <Button
              type="link"
              style={{ paddingLeft: 0 }}
              onClick={() => setReplyingParent(replyingParent === 'top' ? null : 'top')}
            >
              {replyingParent === 'top' ? '取消' : '添加评论'}
            </Button>
            {replyInput('top')}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      {roots.map((root) => (
        <div key={root.id}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 2 }}>
            {renderBody(root.body)} — {root.author.displayName}
          </Typography.Paragraph>
          {canComment && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => setReplyingParent(replyingParent === root.id ? null : root.id)}
            >
              {replyingParent === root.id ? '取消回复' : '回复'}
            </Button>
          )}
          {replyInput(root.id)}
          {comments
            .filter((r) => r.parentId === root.id)
            .map((r) => (
              <div key={r.id} style={{ paddingLeft: 20, borderLeft: '2px solid #f0f0f0', marginTop: 4 }}>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {renderBody(r.body)} — {r.author.displayName}
                </Typography.Paragraph>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function BountyInput({ onOk }: { onOk: (points: number) => void }) {
  const [points, setPoints] = useState('50');
  return (
    <Space>
      <span>悬赏积分（10–500）</span>
      <Input
        type="number"
        min={10}
        max={500}
        value={points}
        style={{ width: 120 }}
        onChange={(e) => setPoints(e.target.value)}
        onBlur={() => {
          const v = Number(points);
          if (v >= 10 && v <= 500) onOk(v);
        }}
      />
    </Space>
  );
}

function EditQuestionModal({
  open,
  initial,
  submitting,
  onCancel,
  onOk,
}: {
  open: boolean;
  initial: { title: string; body: string; tags: string[] };
  submitting: boolean;
  onCancel: () => void;
  onOk: (v: { title: string; body: string; tags: string[] }) => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [tags, setTags] = useState(initial.tags.join(', '));

  useEffect(() => {
    if (open) {
      setTitle(initial.title);
      setBody(initial.body);
      setTags(initial.tags.join(', '));
    }
  }, [open, initial]);

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      message.warning('标题和正文不能为空');
      return;
    }
    onOk({
      title: title.trim(),
      body: body.trim(),
      tags: tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <Modal
      open={open}
      title="编辑问题"
      okText="保存"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={submit}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" maxLength={150} />
        <Input.TextArea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="正文，支持 Markdown"
        />
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签，用逗号分隔" />
      </Space>
    </Modal>
  );
}

function EditAnswerModal({
  open,
  initial,
  submitting,
  onCancel,
  onOk,
}: {
  open: boolean;
  initial: string;
  submitting: boolean;
  onCancel: () => void;
  onOk: (body: string) => void;
}) {
  const [body, setBody] = useState(initial);

  useEffect(() => {
    if (open) setBody(initial);
  }, [open, initial]);

  const submit = () => {
    if (!body.trim()) {
      message.warning('回答内容不能为空');
      return;
    }
    onOk(body.trim());
  };

  return (
    <Modal
      open={open}
      title="编辑回答"
      okText="保存"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={submit}
    >
      <Input.TextArea
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="回答内容，支持 Markdown"
      />
    </Modal>
  );
}
