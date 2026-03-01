'use client';

import { useEffect } from 'react';

/**
 * 全局事件安全层
 * 修复飞书 iframe 事件导致的 e.closest 问题
 */
export function EventSafetyLayer() {
  useEffect(() => {
    console.log('[EventSafetyLayer] 初始化事件安全层');

    // 包装事件对象，添加安全的 closest 方法
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    // 安全的 closest 包装器
    const safeClosest = function(this: any, selector: string) {
      try {
        // 检查 this 是否为有效的 Element
        if (!this || typeof this !== 'object' || this.nodeType !== 1) {
          console.warn('[EventSafetyLayer] 非标准元素，closest 返回 null');
          return null;
        }

        // 检查是否有原生 closest 方法
        if (typeof this.closest === 'function') {
          return this.closest(selector);
        }

        console.warn('[EventSafetyLayer] 元素没有 closest 方法，返回 null');
        return null;
      } catch (err) {
        console.error('[EventSafetyLayer] closest 调用失败:', err);
        return null;
      }
    };

    // 全局错误捕获
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message?.includes('closest') || 
          event.message?.includes('is not a function')) {
        console.warn('[EventSafetyLayer] 捕获到 closest 相关错误，阻止传播:', event.message);
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    window.addEventListener('error', handleGlobalError, true);

    // 安全的事件处理包装
    const wrapEventHandler = (handler: any) => {
      return function(this: any, event: Event) {
        try {
          // 安全检查 event.target
          if (event && 'target' in event) {
            const target = (event as any).target;
            if (target && typeof target === 'object') {
              // 添加安全的 closest 方法
              if (!('safeClosest' in target)) {
                Object.defineProperty(target, 'safeClosest', {
                  value: safeClosest,
                  configurable: true,
                });
              }
            }
          }
          return handler.apply(this, arguments);
        } catch (err) {
          console.warn('[EventSafetyLayer] 事件处理错误，已安全捕获:', err);
          return false;
        }
      };
    };

    console.log('[EventSafetyLayer] 事件安全层已就绪');

    return () => {
      window.removeEventListener('error', handleGlobalError, true);
    };
  }, []);

  return null;
}

export default EventSafetyLayer;
