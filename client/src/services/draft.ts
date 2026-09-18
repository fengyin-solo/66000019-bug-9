// 未完成的「新建白板」请求草稿，持久化到 localStorage，
// 使失败/中断的提交在关闭弹窗或刷新页面后仍可继续提交。

export interface CreateBoardDraft {
  name: string;
  templateId?: string;
  templateName?: string;
  error: string;
  savedAt: string;
}

const DRAFT_KEY_PREFIX = 'whiteboard-create-draft:';

const draftKey = (userId: string): string => `${DRAFT_KEY_PREFIX}${userId}`;

export const loadCreateDraft = (userId: string): CreateBoardDraft | null => {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<CreateBoardDraft>;
    if (typeof draft.name !== 'string' || typeof draft.error !== 'string') {
      return null;
    }
    return draft as CreateBoardDraft;
  } catch {
    return null;
  }
};

export const saveCreateDraft = (userId: string, draft: CreateBoardDraft): void => {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to persist create-board draft:', error);
  }
};

export const clearCreateDraft = (userId: string): void => {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    // 忽略清理失败
  }
};
