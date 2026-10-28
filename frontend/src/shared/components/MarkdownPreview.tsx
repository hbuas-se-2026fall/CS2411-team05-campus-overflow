import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Typography } from 'antd';

/** 行内渲染：粗体 `**x**` 与行内代码 `` `x` ``（其余原样输出，React 渲染天然防 XSS）。 */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) {
      return <code key={i}>{p.slice(1, -1)}</code>;
    }
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** 轻量 Markdown 实时预览（无第三方依赖）。渲染：代码块/行内代码/标题/列表/引用/段落。 */
export function MarkdownPreview({ source }: { source: string }) {
  const lines = source.split('\n');
  const out: ReactNode[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  const keyBase = out.length;

  const flushCode = (k: number) => {
    if (codeBuf.length > 0) {
      out.push(
        <pre key={k} style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
          <code>{codeBuf.join('\n')}</code>
        </pre>,
      );
      codeBuf = [];
    }
  };

  lines.forEach((line, idx) => {
    const key = keyBase + idx;
    if (line.trim().startsWith('```')) {
      if (inCode) {
        inCode = false;
        flushCode(key);
      } else {
        inCode = true;
        codeBuf = [];
      }
      return;
    }
    if (inCode) {
      codeBuf.push(line);
      return;
    }
    const t = line.trim();
    if (t.startsWith('### ')) {
      out.push(
        <Typography.Title key={key} level={4}>
          {renderInline(t.slice(4))}
        </Typography.Title>,
      );
    } else if (t.startsWith('## ')) {
      out.push(
        <Typography.Title key={key} level={3}>
          {renderInline(t.slice(3))}
        </Typography.Title>,
      );
    } else if (t.startsWith('# ')) {
      out.push(
        <Typography.Title key={key} level={2}>
          {renderInline(t.slice(2))}
        </Typography.Title>,
      );
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      out.push(
        <li key={key} style={{ marginLeft: 20 }}>
          {renderInline(t.slice(2))}
        </li>,
      );
    } else if (t.startsWith('> ')) {
      out.push(
        <blockquote
          key={key}
          style={{ borderLeft: '3px solid #d9d9d9', paddingLeft: 8, margin: '4px 0', color: 'rgba(0,0,0,0.65)' }}
        >
          {renderInline(t.slice(2))}
        </blockquote>,
      );
    } else if (t === '') {
      out.push(<div key={key} style={{ height: 8 }} />);
    } else {
      out.push(
        <Typography.Paragraph key={key} style={{ marginBottom: 0 }}>
          {renderInline(line)}
        </Typography.Paragraph>,
      );
    }
  });
  flushCode(lines.length + keyBase);

  if (out.length === 0) {
    return <Typography.Text type="secondary">（暂无内容）</Typography.Text>;
  }
  return <div>{out}</div>;
}
