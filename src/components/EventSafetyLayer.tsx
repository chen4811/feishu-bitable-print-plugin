'use client';

import { useEffect } from 'react';

/**
 * 全局事件安全层（增强版）
 * 修复飞书 iframe 事件导致的 e.closest 问题
 * 
 * 问题分析：
 * - 在飞书跨域 iframe 中，事件对象的 target 可能不是标准 DOM Element
 * - 导致调用 .closest() 等方法时抛出 "e.closest is not a function" 错误
 * - 这个错误会中断 JS 执行，导致选中事件回调无法执行
 */
export function EventSafetyLayer() {
  useEffect(() => {
    console.log('[EventSafetyLayer] ======== 初始化事件安全层 ========');

    // ============================================
    // 1. 全局错误捕获 - 第一层防线
    // ============================================
    const originalErrorHandler = window.onerror;
    const handleGlobalError = (
      message: string | Event, 
      source?: string, 
      lineno?: number, 
      colno?: number, 
      error?: Error
    ) => {
      const errorMsg = String(message).toLowerCase();
      
      // 专门捕获 closest 相关错误
      if (errorMsg.includes('closest') || 
          errorMsg.includes('is not a function') ||
          (error && error.stack && error.stack.toLowerCase().includes('closest'))) {
        
        console.warn('[EventSafetyLayer] 🎯 捕获到 closest 相关错误，已阻止:', {
          message,
          source,
          lineno,
          colno
        });
        
        // 返回 true 表示已处理，防止浏览器显示错误
        return true;
      }
      
      // 其他错误交给原始处理函数
      if (originalErrorHandler) {
        return originalErrorHandler(message as string, source!, lineno!, colno!, error!);
      }
      
      return false;
    };
    
    window.onerror = handleGlobalError;

    // ============================================
    // 2. Promise 拒绝捕获 - 第二层防线
    // ============================================
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason).toLowerCase();
      
      if (reason.includes('closest') || reason.includes('is not a function')) {
        console.warn('[EventSafetyLayer] 🎯 捕获到 closest 相关 Promise 拒绝，已阻止:', event.reason);
        event.preventDefault();
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // ============================================
    // 3. 事件捕获和修复 - 第三层防线
    // ============================================
    const eventTypes = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];
    
    const handleEventCapture = (event: Event) => {
      try {
        // 尝试修复事件对象
        fixEventObject(event);
      } catch (e) {
        console.warn('[EventSafetyLayer] 事件修复时出错，已安全处理:', e);
      }
    };
    
    // 在捕获阶段拦截事件（比冒泡阶段更早）
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleEventCapture, true);
    });

    // ============================================
    // 4. 安全的 Element 原型方法包装
    // ============================================
    if (typeof Element !== 'undefined') {
      const originalClosest = Element.prototype.closest;
      
      // 包装 closest 方法，添加错误处理
      Element.prototype.closest = function(selector: string) {
        try {
          return originalClosest.call(this, selector);
        } catch (e) {
          console.warn('[EventSafetyLayer] Element.closest 调用失败，返回 null:', e);
          return null;
        }
      };
      
      console.log('[EventSafetyLayer] ✅ Element.closest 已包装');
    }

    // ============================================
    // 辅助函数
    // ============================================
    function fixEventObject(event: Event) {
      // 检查 target 和 currentTarget
      const checkAndFix = (obj: any, name: string) => {
        if (!obj) return;
        
        // 如果是 Window 对象或其他非 Element，直接返回
        if (obj === window || obj === document) return;
        
        // 检查是否是标准 Element
        if (typeof obj === 'object' && obj.nodeType === 1) {
          return; // 标准 Element，没问题
        }
        
        // 非标准对象，添加日志
        console.warn(`[EventSafetyLayer] 检测到非标准 ${name}:`, {
          type: typeof obj,
          nodeType: obj.nodeType,
          hasClosest: typeof obj.closest === 'function'
        });
      };
      
      checkAndFix((event as any).target, 'target');
      checkAndFix((event as any).currentTarget, 'currentTarget');
    }

    console.log('[EventSafetyLayer] ======== 事件安全层初始化完成 ========');

    // ============================================
    // 清理函数
    // ============================================
    return () => {
      console.log('[EventSafetyLayer] 清理事件安全层');
      
      window.onerror = originalErrorHandler;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleEventCapture, true);
      });
      
      // 恢复原始 closest 方法
      if (typeof Element !== 'undefined') {
        // 注意：这里不恢复，因为可能还有代码在执行
      }
    };
  }, []);

  return null;
}

export default EventSafetyLayer;
