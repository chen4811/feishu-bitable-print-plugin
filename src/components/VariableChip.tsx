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
        text-blue-700
        text-sm font-medium
        cursor-default
        select-none
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
