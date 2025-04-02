import { useState, useEffect } from 'react';

export function useSidebarState() {
  const [isOpen, setIsOpen] = useState(() => {
    // Initialize from localStorage if available, default to true on desktop and false on mobile
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      return savedState === 'true';
    }
    return window.innerWidth >= 768;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isOpen.toString());
  }, [isOpen]);

  // Close sidebar on small screens when navigating
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isOpen) {
        setIsOpen(false);
      } else if (window.innerWidth >= 768 && !isOpen) {
        setIsOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  return { isOpen, toggleSidebar };
}
