// frontend/src/components/ui/DateRangeSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

const DateRangeSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presets = [
    { 
      label: 'Last 7 days', 
      value: '7d',
      getRange: () => ({
        start: subDays(new Date(), 7),
        end: new Date(),
        preset: '7d'
      })
    },
    { 
      label: 'Last 30 days', 
      value: '30d',
      getRange: () => ({
        start: subDays(new Date(), 30),
        end: new Date(),
        preset: '30d'
      })
    },
    { 
      label: 'Last 90 days', 
      value: '90d',
      getRange: () => ({
        start: subDays(new Date(), 90),
        end: new Date(),
        preset: '90d'
      })
    },
    { 
      label: 'This Month', 
      value: 'month',
      getRange: () => ({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
        preset: 'month'
      })
    },
    { 
      label: 'Last Month', 
      value: 'lastMonth',
      getRange: () => ({
        start: startOfMonth(subMonths(new Date(), 1)),
        end: endOfMonth(subMonths(new Date(), 1)),
        preset: 'lastMonth'
      })
    },
    { 
      label: 'This Week', 
      value: 'week',
      getRange: () => ({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
        preset: 'week'
      })
    },
    { 
      label: 'Year to Date', 
      value: 'ytd',
      getRange: () => ({
        start: new Date(new Date().getFullYear(), 0, 1),
        end: new Date(),
        preset: 'ytd'
      })
    }
  ];

  const handlePresetClick = (preset) => {
    const range = preset.getRange();
    onChange(range);
    setIsOpen(false);
  };

  // Get display text for current selection
  const getDisplayText = () => {
    const { start, end, preset } = value;
    
    if (preset) {
      const presetItem = presets.find(p => p.value === preset);
      if (presetItem) return presetItem.label;
    }
    
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-muted/20 border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all h-10 px-4"
      >
        <Calendar size={14} />
        {getDisplayText()}
        <ChevronDown 
          size={12} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-56 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-4 pt-3 pb-1 border-b border-border">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Quick Select
              </span>
            </div>
            
            <div className="py-1">
              {presets.map((preset, idx) => {
                const isActive = value.preset === preset.value;
                return (
                  <button
                    key={idx}
                    onClick={() => handlePresetClick(preset)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-primary bg-primary/8'
                        : 'text-foreground hover:bg-muted/10'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isActive && <Check size={11} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/5">
              <p className="text-[9px] text-muted-foreground font-medium">
                Range: <span className="text-foreground font-bold">{getDisplayText()}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DateRangeSelector;