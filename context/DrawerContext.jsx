import React, { createContext, useCallback, useMemo, useState } from 'react';

export const DrawerContext = createContext({
  open: () => {},
  close: () => {},
  visible: false,
});

export function DrawerProvider({ children }) {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({ open, close, visible }), [open, close, visible]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

export default DrawerProvider;
