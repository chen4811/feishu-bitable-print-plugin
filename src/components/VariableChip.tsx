'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VariableChipProps {
  fieldName: string;
  value: string;
  className?: string;
}

/**
 * 动态变量芯片组件
 * 显示带样式的变量值，并显示字段名提示
 */
export const VariableChip: React.FC<VariableChipProps> = ({
  fieldName,
  value,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center
        bg-blue-50 border border-blue-200
        text-blue-700
        px-1.5 py-0.5
        rounded-md
        text-sm font-medium
        cursor-default
        mx-0.5
        select-none
        transition-colors
        hover:bg-blue-100 hover:border-blue-300
        ${className}
      `}
      data-field-name={fieldName}
      title={`字段：${fieldName}`}
    >
      {value}
    </span>
  );
};

/**
 * 带工具提示的变量芯片组件
 */
export const VariableChipWithTooltip: React.FC<VariableChipProps> = ({
  fieldName,
  value,
  className = '',
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <VariableChip
          fieldName={fieldName}
          value={value}
          className={className}
        />
      </TooltipTrigger>
      <TooltipContent>
        字段：{fieldName}
      </TooltipContent>
    </Tooltip>
  );
};

export default VariableChip;
