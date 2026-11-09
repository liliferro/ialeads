'use client';

import { createContext, useContext } from 'react';

export const PanelContext = createContext(null);
export const usePanel = () => useContext(PanelContext);
