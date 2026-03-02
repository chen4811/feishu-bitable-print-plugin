'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasComponentNode, PageConfig, StyleConfig } from '@/types/editor';
import { VariableTextRenderer } from '@/components/VariableTextRenderer';
import { parseVariables } from '@/utils/variableParser';

// 统一的样式上下文
interface StyleContext {
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  isPreview: boolean;
  isPrint: boolean;
  scale?: number;
}

// 获取基础文本样式 - 确保各状态一致
function getBaseTextStyles(styleConfig: StyleConfig, textStyle?: any): React.CSSProperties {
  return {
    fontFamily: styleConfig.fontFamily,
    fontSize: `${textStyle?.fontSize || styleConfig.fontSize}px`,
    lineHeight: textStyle?.lineHeight || styleConfig.lineHeight,
    color: textStyle?.color || '#000000',
    textAlign: (textStyle?.align as any) || 'left',
    fontWeight: textStyle?.bold ? 'bold' : textStyle?.fontWeight || 'normal',
    fontStyle: textStyle?.italic ? 'italic' : 'normal',
    textDecoration: textStyle?.underline ? 'underline' : textStyle?.lineThrough ? 'line-through' : 'none',
  };
}

// 渲染文本组件 - 统一渲染逻辑
function renderTextComponent(
  component: any,
  context: StyleContext,
  previewRecord?: any,
  fields?: any[]
) {
  const { styleConfig, isPreview, isPrint } = context;
  const { content = '', textStyle = {} } = component;
  
  const baseStyles = getBaseTextStyles(styleConfig, textStyle);
  
  // 处理变量替换
  const displayContent = isPreview && previewRecord 
    ? parseVariables(content, previewRecord, fields || [])
    : content;

  // 处理特殊样式
  if (textStyle.headingLevel) {
    const headingSizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 };
    const headingStyle = {
      ...baseStyles,
      fontSize: `${headingSizes[textStyle.headingLevel] || 18}px`,
      fontWeight: 'bold',
      marginBottom: '0.5em',
      marginTop: '0.5em',
    };
    
    const headingContent = (
      <VariableTextRenderer
        text={displayContent || (isPrint ? '' : '显示')}
        records={previewRecord ? [previewRecord] : []}
        fields={fields || []}
        tagName="span"
      />
    );
    
    switch (textStyle.headingLevel) {
      case 1: return <h1 style={headingStyle}>{headingContent}</h1>;
      case 2: return <h2 style={headingStyle}>{headingContent}</h2>;
      case 3: return <h3 style={headingStyle}>{headingContent}</h3>;
      case 4: return <h4 style={headingStyle}>{headingContent}</h4>;
      case 5: return <h5 style={headingStyle}>{headingContent}</h5>;
      case 6: return <h6 style={headingStyle}>{headingContent}</h6>;
      default: return <h1 style={headingStyle}>{headingContent}</h1>;
    }
  }

  // 列表样式
  if (textStyle.listType === 'unordered') {
    return (
      <ul style={{ 
        ...baseStyles,
        marginLeft: '1.5rem',
        listStyleType: 'disc',
      }}>
        <li>
          <VariableTextRenderer
            text={displayContent || (isPrint ? '' : '显示')}
            records={previewRecord ? [previewRecord] : []}
            fields={fields || []}
            tagName="span"
          />
        </li>
      </ul>
    );
  }

  if (textStyle.listType === 'ordered') {
    return (
      <ol style={{ 
        ...baseStyles,
        marginLeft: '1.5rem',
        listStyleType: 'decimal',
      }}>
        <li>
          <VariableTextRenderer
            text={displayContent || (isPrint ? '' : '显示')}
            records={previewRecord ? [previewRecord] : []}
            fields={fields || []}
            tagName="span"
          />
        </li>
      </ol>
    );
  }

  // 链接样式
  if (textStyle.linkUrl) {
    return (
      <a 
        href={textStyle.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...baseStyles,
          color: '#3b82f6',
          textDecoration: 'underline',
        }}
      >
        <VariableTextRenderer
          text={displayContent || (isPrint ? '' : '显示')}
          records={previewRecord ? [previewRecord] : []}
          fields={fields || []}
          tagName="span"
        />
      </a>
    );
  }

  // 普通文本
  return (
    <span style={baseStyles}>
      <VariableTextRenderer
        text={displayContent || (isPrint ? '' : '显示')}
        records={previewRecord ? [previewRecord] : []}
        fields={fields || []}
        tagName="span"
      />
    </span>
  );
}

// 渲染标题组件
function renderHeadingComponent(
  component: any,
  context: StyleContext,
  previewRecord?: any,
  fields?: any[]
) {
  const { content = '', level = 1, textStyle = {} } = component;
  const { styleConfig, isPreview } = context;
  
  const displayContent = isPreview && previewRecord
    ? parseVariables(content, previewRecord, fields || [])
    : content;

  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize || (level === 1 ? 24 : level === 2 ? 20 : level === 3 ? 18 : 16),
    fontWeight: textStyle.bold !== false ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'center',
    lineHeight: textStyle.lineHeight || 1.5,
    margin: '0 0 16px 0',
    padding: '8px 0',
  };
  
  const headingContent = (
    <VariableTextRenderer
      text={displayContent || ''}
      records={previewRecord ? [previewRecord] : []}
      fields={fields || []}
      tagName="span"
    />
  );
  
  switch (level) {
    case 1: return <h1 style={style}>{headingContent}</h1>;
    case 2: return <h2 style={style}>{headingContent}</h2>;
    case 3: return <h3 style={style}>{headingContent}</h3>;
    case 4: return <h4 style={style}>{headingContent}</h4>;
    case 5: return <h5 style={style}>{headingContent}</h5>;
    case 6: return <h6 style={style}>{headingContent}</h6>;
    default: return <h1 style={style}>{headingContent}</h1>;
  }
}

// 渲染段落组件
function renderParagraphComponent(
  component: any,
  context: StyleContext,
  previewRecord?: any,
  fields?: any[]
) {
  const { content = '', indent = 2, textStyle = {} } = component;
  const { styleConfig, isPreview } = context;
  
  const displayContent = isPreview && previewRecord
    ? parseVariables(content, previewRecord, fields || [])
    : content;

  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize || styleConfig.fontSize,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'justify',
    lineHeight: textStyle.lineHeight || 1.8,
    textIndent: `${indent * 2}em`,
    margin: '0 0 12px 0',
    padding: '4px 0',
  };

  // 处理换行
  const lines = displayContent.split('\n');
  return (
    <p style={style}>
      {lines.map((line: string, index: number) => (
        <React.Fragment key={index}>
          <VariableTextRenderer
            text={line}
            records={previewRecord ? [previewRecord] : []}
            fields={fields || []}
            tagName="span"
          />
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
}

// 渲染列表组件
function renderListComponent(
  component: any,
  context: StyleContext,
  previewRecord?: any,
  fields?: any[]
) {
  const { items = [], listType = 'unordered', textStyle = {} } = component;
  const { styleConfig, isPreview } = context;

  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize || styleConfig.fontSize,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    lineHeight: textStyle.lineHeight || 1.8,
    margin: '0 0 12px 0',
    paddingLeft: '2em',
  };

  const itemStyle: React.CSSProperties = {
    marginBottom: '4px',
  };

  const ListTag = listType === 'ordered' ? 'ol' : 'ul';
  
  return (
    <ListTag style={style}>
      {items.map((item: string, index: number) => {
        const displayItem = isPreview && previewRecord
          ? parseVariables(item, previewRecord, fields || [])
          : item;
        return (
          <li key={index} style={itemStyle}>
            <VariableTextRenderer
              text={displayItem}
              records={previewRecord ? [previewRecord] : []}
              fields={fields || []}
              tagName="span"
            />
          </li>
        );
      })}
    </ListTag>
  );
}

// 统一渲染器接口
interface UnifiedComponentRendererProps {
  component: CanvasComponentNode;
  context: StyleContext;
  previewRecord?: any;
  fields?: any[];
}

// 统一组件渲染器
export function UnifiedComponentRenderer({
  component,
  context,
  previewRecord,
  fields,
}: UnifiedComponentRendererProps) {
  switch (component.type) {
    case 'text':
      return renderTextComponent(component, context, previewRecord, fields);
    case 'heading':
      return renderHeadingComponent(component, context, previewRecord, fields);
    case 'paragraph':
      return renderParagraphComponent(component, context, previewRecord, fields);
    case 'list':
      return renderListComponent(component, context, previewRecord, fields);
    default:
      return null;
  }
}

export default UnifiedComponentRenderer;
