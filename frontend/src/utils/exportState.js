// exportState.js
let _trigger = null;
let _dismiss = null;

export const setExportHandlers = (trigger, dismiss) => {
  _trigger = trigger;
  _dismiss = dismiss;
};

export const triggerExportRender = () => {
  console.log(' triggerExportRender called');
  if (_trigger) {
    _trigger();
  } else {
    console.warn('❌ _trigger is not set');
  }
};

export const dismissExportRender = () => {
  console.log(' dismissExportRender called');
  if (_dismiss) {
    _dismiss();
  } else {
    console.warn('❌ _dismiss is not set');
  }
};