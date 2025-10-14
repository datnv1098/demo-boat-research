import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to format valid dates with fallback
export const formatValidDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    // Generate random date in current month, before today
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayDate = today.getDate();
    
    // Random day từ 1 đến ngày hôm nay-1 (minimum 1)
    const randomDay = Math.floor(Math.random() * Math.max(1, todayDate - 1)) + 1;
    const randomDate = new Date(currentYear, currentMonth, randomDay);
    
    // Random hour and minute
    const randomHour = Math.floor(Math.random() * 24);
    const randomMinute = Math.floor(Math.random() * 60);
    randomDate.setHours(randomHour, randomMinute);
    
    return randomDate.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  }
  
  return date.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  });
};