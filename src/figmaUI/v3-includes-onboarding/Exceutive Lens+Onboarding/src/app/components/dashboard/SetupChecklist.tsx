import React, { useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export const SetupChecklist = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [items, setItems] = useState([
    { id: 1, label: "Connect calendar", completed: false },
    { id: 2, label: "Connect email", completed: false },
    { id: 3, label: "Add first watchlist", completed: true },
    { id: 4, label: "Run first deep research pack", completed: false },
    { id: 5, label: "Complete one live capture", completed: false },
    { id: 6, label: "Confirm autonomy settings", completed: true },
  ]);

  if (!isVisible) return null;

  const toggle = (id: number) => {
    setItems(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const progress = Math.round((items.filter(i => i.completed).length / items.length) * 100);

  return (
    null
  );
};
