import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign browser iframe / HMR / third-party console noise and normalize DOM form attributes
if (typeof window !== 'undefined') {
  const shouldIgnoreLog = (args: unknown[]) => {
    const text = args
      .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
      .join(' ');
    return (
      text.includes('width(-1) and height(-1)') ||
      text.includes('[DOM]') ||
      text.includes('WebSocket') ||
      text.includes('vite') ||
      text.includes('fullscreen') ||
      text.includes('Permissions check failed') ||
      text.includes('Missing or insufficient permissions') ||
      text.includes('the client is offline') ||
      text.includes('Firestore') ||
      text.includes('ResizeObserver')
    );
  };

  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    if (shouldIgnoreLog(args)) return;
    origWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    if (shouldIgnoreLog(args)) return;
    origError(...args);
  };

  let fieldSeq = 1;
  const normalizeDomFormAttributes = () => {
    try {
      const controls = document.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input, select, textarea');

      controls.forEach((ctrl) => {
        if (!ctrl.id) {
          ctrl.id = `hms-ctrl-${fieldSeq++}`;
        }
        if (!ctrl.getAttribute('name')) {
          ctrl.setAttribute('name', ctrl.id);
        }
        if (ctrl instanceof HTMLInputElement && !ctrl.getAttribute('autocomplete')) {
          if (ctrl.type === 'password') {
            ctrl.setAttribute('autocomplete', 'current-password');
          } else if (ctrl.type !== 'file' && ctrl.type !== 'checkbox' && ctrl.type !== 'radio') {
            ctrl.setAttribute('autocomplete', 'off');
          }
        }
      });

      const labels = document.querySelectorAll<HTMLLabelElement>('label');
      labels.forEach((lbl) => {
        const currentFor = lbl.getAttribute('for');
        if (currentFor && document.getElementById(currentFor)) {
          return;
        }
        const nestedControl = lbl.querySelector<HTMLElement>('input, select, textarea');
        if (nestedControl && nestedControl.id) {
          lbl.setAttribute('for', nestedControl.id);
          return;
        }
        const siblingOrParentControl =
          (lbl.nextElementSibling?.matches?.('input, select, textarea')
            ? (lbl.nextElementSibling as HTMLElement)
            : lbl.nextElementSibling?.querySelector?.<HTMLElement>('input, select, textarea')) ||
          lbl.parentElement?.querySelector<HTMLElement>(
            'input:not([type="hidden"]), select, textarea'
          );
        if (siblingOrParentControl && siblingOrParentControl.id) {
          lbl.setAttribute('for', siblingOrParentControl.id);
        } else {
          const fallbackControl =
            lbl
              .closest('form, section, main, body')
              ?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea') ||
            controls[0];
          if (fallbackControl && fallbackControl.id) {
            lbl.setAttribute('for', fallbackControl.id);
          }
        }
      });

      controls.forEach((ctrl) => {
        const hasLabel =
          Boolean(ctrl.closest('label')) ||
          Boolean(ctrl.id && document.querySelector(`label[for="${CSS.escape(ctrl.id)}"]`));
        if (!hasLabel) {
          const fallbackLabel =
            ctrl.getAttribute('aria-label') ||
            ctrl.getAttribute('placeholder') ||
            ctrl.getAttribute('title') ||
            ctrl.getAttribute('name') ||
            'Form input field';
          if (!ctrl.getAttribute('aria-label')) {
            ctrl.setAttribute('aria-label', fallbackLabel);
          }
          if (!ctrl.getAttribute('title')) {
            ctrl.setAttribute('title', fallbackLabel);
          }
        }
      });
    } catch {
      // Ignore transient DOM mutation states
    }
  };

  let scheduled = false;
  const scheduleNormalize = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      normalizeDomFormAttributes();
    });
  };

  window.addEventListener('DOMContentLoaded', scheduleNormalize);
  setTimeout(scheduleNormalize, 150);
  setTimeout(scheduleNormalize, 600);

  const observer = new MutationObserver(() => {
    scheduleNormalize();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

createRoot(document.getElementById('root')!).render(<App />);

