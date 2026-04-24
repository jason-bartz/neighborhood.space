// useConfirm.jsx — promise-based confirm dialog hook.
//
// Usage:
//   const { requestConfirm, confirmDialog } = useConfirm();
//
//   async function handleDelete() {
//     const ok = await requestConfirm({
//       title: 'Delete user?',
//       message: 'This removes their Firestore profile. Cannot be undone.',
//       confirmLabel: 'Delete',
//       variant: 'danger',
//     });
//     if (!ok) return;
//     // ...actual delete
//   }
//
// Render `{confirmDialog}` anywhere inside the component that uses the hook.

import React, { useCallback, useState } from 'react';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function useConfirm() {
  const [state, setState] = useState(null);

  const requestConfirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        ...opts,
        onConfirm: () => {
          setState(null);
          resolve(true);
        },
        onCancel: () => {
          setState(null);
          resolve(false);
        },
      });
    });
  }, []);

  const confirmDialog = state ? <ConfirmDialog open {...state} /> : null;

  return { requestConfirm, confirmDialog };
}
