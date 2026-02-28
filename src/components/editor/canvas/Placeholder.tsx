'use client';

interface PlaceholderProps {
  type: 'vertical' | 'horizontal' | 'full';
  targetId?: string;
  width?: string;
  height?: string;
}

export function Placeholder({ type, targetId, width, height = '60px' }: PlaceholderProps) {
  // 垂直模式：显示分割线
  if (type === 'vertical') {
    return (
      <div
        className="w-full flex items-center justify-center my-1"
        style={{ height: '8px' }}
      >
        <div className="w-full h-1 bg-primary rounded-full animate-pulse" />
      </div>
    );
  }

  // 水平模式：显示并排占位框
  if (type === 'horizontal') {
    return (
      <div
        className="flex items-center justify-center border-2 border-dashed border-blue-500 rounded-lg bg-blue-500/5 transition-all duration-200"
        style={{
          width: width || 'calc(50% - 4px)',
          minHeight: height,
        }}
      >
        <div className="text-sm font-medium text-blue-600 flex items-center gap-2">
          <div className="w-4 h-4 border-t-2 border-l-2 border-dashed border-blue-500 rounded-tl" />
          <span>并排插入</span>
          <div className="w-4 h-4 border-b-2 border-r-2 border-dashed border-blue-500 rounded-br" />
        </div>
      </div>
    );
  }

  // 完整模式：添加到末尾
  return (
    <div
      className="w-full flex items-center justify-center border-2 border-dashed border-green-500 rounded-lg bg-green-500/5 transition-all duration-200"
      style={{
        minHeight: height,
      }}
    >
      <div className="text-sm font-medium text-green-600 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-dashed border-green-500 rounded" />
        <span>添加到末尾</span>
      </div>
    </div>
  );
}
