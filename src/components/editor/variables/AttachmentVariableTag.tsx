'use client';

import React, { useState } from 'react';
import { FileImage, Pencil, Trash2 } from 'lucide-react';

interface AttachmentVariableTagProps {
  fieldName: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * 附件变量标签组件
 * 编辑状态下显示的简单标签，如 [照片]
 */
export const AttachmentVariableTag: React.FC<AttachmentVariableTagProps> = ({
  fieldName,
  isEditing = false,
  onEdit,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span
      className={`
        inline-flex items-center gap-1 relative
        px-2 py-0.5 rounded
        bg-amber-100 border border-amber-300
        text-amber-700 text-sm
        ${isEditing ? 'cursor-pointer' : 'cursor-default'}
      `}
      onMouseEnter={() => isEditing && setIsHovered(true)}
      onMouseLeave={(e) => {
        // 检查鼠标是否移动到了弹窗上
        const target = e.relatedTarget as HTMLElement;
        if (!target?.closest('.attachment-variable-popup')) {
          setIsHovered(false);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (isEditing) {
          onEdit?.();
        }
      }}
      title={isEditing ? `附件字段：${fieldName}。点击编辑` : `附件字段：${fieldName}`}
    >
      <FileImage className="w-3.5 h-3.5" />
      <span>[{fieldName}]</span>
      
      {/* 悬停编辑/删除按钮 - 仅在编辑状态下显示 */}
      {isEditing && isHovered && (
        <span 
          className="attachment-variable-popup absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800 rounded px-2 py-1 shadow-lg z-[60]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="p-1 hover:bg-gray-700 rounded text-white"
            title="编辑"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1 hover:bg-red-600 rounded text-white"
            title="删除"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </span>
      )}
    </span>
  );
};

export default AttachmentVariableTag;
