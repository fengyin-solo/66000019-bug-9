import React, { useState, useEffect, useCallback } from 'react';
import { Board } from '../types';
import { boardApi, templateApi } from '../services/api';
import { useWhiteboardStore } from '../store/whiteboard';
import { TemplateCenter } from './TemplateCenter';
import {
  CreateBoardDraft,
  loadCreateDraft,
  saveCreateDraft,
  clearCreateDraft,
} from '../services/draft';

interface DashboardProps {
  onBoardSelect: (board: Board) => void;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
};

const getRandomGradient = (index: number): string => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ];
  return gradients[index % gradients.length];
};

const BoardCard: React.FC<{
  board: Board;
  index: number;
  onClick: () => void;
}> = ({ board, index, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
      }}
    >
      <div
        style={{
          height: '120px',
          background: board.backgroundColor || getRandomGradient(index),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: '24px',
            fontWeight: 600,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          {board.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div style={{ padding: '16px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#1a1a1a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {board.name}
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          <span>{formatDate(board.updatedAt)}</span>
          {board.collaborators.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{board.collaborators.length + 1}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onBoardSelect }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  // 列表请求失败与「确实没有记录」分开表示，避免渲染成同一种结果
  const [listError, setListError] = useState<string | null>(null);
  const [isTemplateCenterOpen, setIsTemplateCenterOpen] = useState(false);
  // 上次未完成的新建请求，刷新后仍可继续提交
  const [pendingDraft, setPendingDraft] = useState<CreateBoardDraft | null>(null);
  const [retrying, setRetrying] = useState(false);
  const username = useWhiteboardStore((state) => state.username);

  const userId = 'user-1';

  useEffect(() => {
    loadBoards();
    setPendingDraft(loadCreateDraft(userId));
  }, []);

  const loadBoards = async () => {
    try {
      setLoading(true);
      setListError(null);
      const data = await boardApi.getBoards(userId);
      setBoards(data);
    } catch (error) {
      console.error('Failed to load boards:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : '白板列表加载失败，请重试';
      setListError(message);
    } finally {
      setLoading(false);
    }
  };

  // 仅在请求成功时返回新白板；失败时抛出，由弹窗保留内容并标记错误
  const createBoardRequest = async (name: string, templateId?: string): Promise<Board> => {
    if (templateId) {
      const board = await templateApi.createBoardFromTemplate(templateId, { name, ownerId: userId });
      if (!board) throw new Error('创建白板失败，请重试');
      return board;
    }
    const board = await boardApi.createBoard({ name, ownerId: userId });
    if (!board) throw new Error('创建白板失败，请重试');
    return board;
  };

  const handleCreateBoard = async (name: string, templateId?: string): Promise<Board> => {
    const newBoard = await createBoardRequest(name, templateId);
    clearCreateDraft(userId);
    setPendingDraft(null);
    // 成功后刷新列表，确保新白板按更新时间/归属进入正确分类；
    // 即使刷新失败也先进入白板，返回工作台时会重新拉取
    await loadBoards().catch(() => undefined);
    onBoardSelect(newBoard);
    return newBoard;
  };

  const handleRetryDraft = async () => {
    if (!pendingDraft || retrying) return;
    setRetrying(true);
    try {
      const newBoard = await createBoardRequest(pendingDraft.name, pendingDraft.templateId);
      clearCreateDraft(userId);
      setPendingDraft(null);
      await loadBoards().catch(() => undefined);
      onBoardSelect(newBoard);
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : '创建白板失败，请重试';
      const updated: CreateBoardDraft = { ...pendingDraft, error: message, savedAt: new Date().toISOString() };
      saveCreateDraft(userId, updated);
      setPendingDraft(updated);
    } finally {
      setRetrying(false);
    }
  };

  const handleDiscardDraft = () => {
    clearCreateDraft(userId);
    setPendingDraft(null);
  };

  // 从弹窗返回时同步草稿（弹窗内失败会更新错误信息）
  const handleTemplateCenterClose = useCallback(() => {
    setIsTemplateCenterOpen(false);
    setPendingDraft(loadCreateDraft(userId));
  }, []);

  const myBoards = boards.filter((b) => b.ownerId === userId);
  const sharedBoards = boards.filter((b) => b.ownerId !== userId);
  const recentBoards = [...boards].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const SectionHeader: React.FC<{ title: string; count?: number }> = ({ title, count }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: '#1a1a1a',
        }}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span
          style={{
            fontSize: '13px',
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          {count}
        </span>
      )}
    </div>
  );

  const ErrorBlock: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 16px',
        background: '#fef2f2',
        border: '1px dashed #fecaca',
        borderRadius: '12px',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#dc2626"
        strokeWidth="1.5"
        style={{ margin: '0 auto 16px', opacity: 0.7 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#b91c1c' }}>
        加载失败
      </p>
      <p style={{ margin: '8px 0 16px', fontSize: '13px', color: '#dc2626' }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 18px',
          fontSize: '13px',
          fontWeight: 500,
          color: '#fff',
          background: '#dc2626',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        重新加载
      </button>
    </div>
  );

  const BoardGrid: React.FC<{ boardList: Board[] }> = ({ boardList }) => {
    const showSkeleton = loading && boards.length === 0 && !listError;

    if (showSkeleton) {
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: '12px',
                height: '200px',
                background: '#e5e7eb',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      );
    }

    // 请求失败且没有已缓存数据：显示错误态，而不是「暂无白板」
    if (listError && boardList.length === 0) {
      return <ErrorBlock message={listError} onRetry={loadBoards} />;
    }

    if (boardList.length === 0) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: '#6b7280',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ margin: '0 auto 16px', opacity: 0.5 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          <p style={{ margin: 0, fontSize: '14px' }}>暂无白板</p>
          <p style={{ margin: '8px 0 0', fontSize: '13px' }}>点击「新建白板」开始创建</p>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        {boardList.map((board, index) => (
          <BoardCard
            key={board._id}
            board={board}
            index={index}
            onClick={() => onBoardSelect(board)}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1a1a1a',
              }}
            >
              协作白板
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setIsTemplateCenterOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
                background: '#667eea',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5a67d8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新建白板
            </button>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '40px',
            color: '#fff',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            欢迎回来，{username}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
            继续你的创作，或者开始一个新的白板
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => setIsTemplateCenterOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#667eea',
                background: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新建白板
            </button>
          </div>
        </div>

        {/* 未完成的新建请求：持久标出错误并可重新提交，区别于空列表 */}
        {pendingDraft && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: '#fff',
              border: '1px solid #fecaca',
              borderLeft: '4px solid #dc2626',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '32px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
              flexWrap: 'wrap',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                白板「{pendingDraft.name || pendingDraft.templateName || '未命名白板'}」尚未创建成功
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                布局：{pendingDraft.templateName || '空白白板'} · {pendingDraft.error}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRetryDraft}
                disabled={retrying}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#fff',
                  background: '#667eea',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: retrying ? 'not-allowed' : 'pointer',
                  opacity: retrying ? 0.7 : 1,
                }}
              >
                {retrying ? '提交中...' : '重新提交'}
              </button>
              <button
                onClick={() => setIsTemplateCenterOpen(true)}
                disabled={retrying}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#374151',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                继续编辑
              </button>
              <button
                onClick={handleDiscardDraft}
                disabled={retrying}
                style={{
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#6b7280',
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                放弃
              </button>
            </div>
          </div>
        )}

        <section style={{ marginBottom: '40px' }}>
          <SectionHeader title="最近编辑" count={loading || listError ? undefined : recentBoards.length} />
          <BoardGrid boardList={recentBoards.slice(0, 8)} />
        </section>

        <section style={{ marginBottom: '40px' }}>
          <SectionHeader title="我创建的" count={loading || listError ? undefined : myBoards.length} />
          <BoardGrid boardList={myBoards} />
        </section>

        <section>
          <SectionHeader title="我参与的" count={loading || listError ? undefined : sharedBoards.length} />
          <BoardGrid boardList={sharedBoards} />
        </section>
      </main>

      <TemplateCenter
        isOpen={isTemplateCenterOpen}
        onClose={handleTemplateCenterClose}
        onCreate={handleCreateBoard}
        userId={userId}
      />
    </div>
  );
};
