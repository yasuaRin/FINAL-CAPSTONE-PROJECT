/**
 * DateRangeSelector.jsx
 * ══════════════════════════════════════════════════════════════
 * Converted from TypeScript (.tsx) to plain JavaScript (.jsx).
 *
 * Changes made:
 *   - Removed all TypeScript type annotations (: string, : DateRange, etc.)
 *   - Removed interface declarations (DateRangeSelectorProps)
 *   - Removed React.FC<...> generic type
 *   - Removed import of TypeScript types (DateRange, DateRangePreset)
 *   - Removed RDPDateRange type import/usage
 *   - Everything else is identical to the original
 * ══════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay
} from 'date-fns';
import { DayPicker } from 'react-day-picker';

// ─────────────────────────────────────────────────────────────
// PRESETS
// Each preset has a label (shown in dropdown) and a value
// (used internally to compute the start/end dates).
// In the original TSX these were typed as DateRangePreset —
// in JSX we just use plain strings.
// ─────────────────────────────────────────────────────────────
const presets = [
  { label: 'Last 7 Days',  value: '7d'        },
  { label: 'Last 30 Days', value: '30d'       },
  { label: 'This Month',   value: 'thisMonth' },
  { label: 'Last Month',   value: 'lastMonth' },
  { label: 'Custom Range', value: 'custom'    },
];

// ─────────────────────────────────────────────────────────────
// COMPONENT
// Props:
//   value    — current DateRange object { start, end, preset }
//   onChange — callback called with new DateRange when user picks
// ─────────────────────────────────────────────────────────────
export const DateRangeSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen]           = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── PRESET SELECTION ──────────────────────────────────────
  // When user clicks a preset button:
  //   - 'custom' → show the calendar picker instead
  //   - others   → compute start/end dates and call onChange
  const handlePresetSelect = (preset) => {
    if (preset === 'custom') {
      setShowCalendar(true);
      return;
    }

    const now   = new Date();
    let   start = now;
    let   end   = now;

    switch (preset) {
      case '7d':
        start = subDays(now, 7);
        break;
      case '30d':
        start = subDays(now, 30);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end   = endOfMonth(now);
        break;
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end   = endOfMonth(lastMonth);
        break;
      }
      default:
        break;
    }

    // startOfDay/endOfDay ensure the full day is included
    onChange({ start: startOfDay(start), end: endOfDay(end), preset });
    setIsOpen(false);
    setShowCalendar(false);
  };

  // ── CALENDAR SELECTION ────────────────────────────────────
  // Called by DayPicker when user selects a range.
  // range = { from: Date, to: Date } — no TypeScript type needed
  const handleCalendarSelect = (range) => {
    if (range?.from && range?.to) {
      // Full range selected — update both start and end
      onChange({
        start:  startOfDay(range.from),
        end:    endOfDay(range.to),
        preset: 'custom'
      });
    } else if (range?.from) {
      // Only start selected so far — keep existing end temporarily
      onChange({
        ...value,
        start:  startOfDay(range.from),
        end:    endOfDay(range.from),
        preset: 'custom'
      });
    }
  };

  // ── BUTTON LABEL ──────────────────────────────────────────
  // Shows preset name (e.g. "Last 30 Days") or formatted date range
  const getLabel = () => {
    if (value.preset && value.preset !== 'custom') {
      return presets.find(p => p.value === value.preset)?.label;
    }
    return `${format(value.start, 'dd MMM yyyy')} - ${format(value.end, 'dd MMM yyyy')}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── TRIGGER BUTTON ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors shadow-sm"
      >
        <CalendarIcon size={16} className="text-muted-foreground" />
        <span>{getLabel()}</span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── DROPDOWN ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute right-0 mt-2 bg-background border border-border rounded-2xl shadow-xl z-50 overflow-hidden ${
              showCalendar ? 'w-[320px]' : 'w-56'
            }`}
          >

            {/* ── PRESET LIST ── */}
            {!showCalendar ? (
              <div className="p-2">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <span className={value.preset === preset.value ? 'font-bold text-primary' : ''}>
                      {preset.label}
                    </span>
                    {value.preset === preset.value && (
                      <Check size={14} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>

            ) : (
              // ── CALENDAR PICKER ──
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to presets
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                  >
                    Done
                  </button>
                </div>

                {/*
                  DayPicker from react-day-picker.
                  mode="range" allows selecting a start + end date.
                  selected = current value passed in as { from, to }
                  onSelect  = our handleCalendarSelect above
                */}
                <DayPicker
                  mode="range"
                  required
                  selected={{ from: value.start, to: value.end }}
                  onSelect={handleCalendarSelect}
                  className="rdp-custom"
                  classNames={{
                    months:          'flex flex-col',
                    month:           'space-y-4',
                    month_caption:   'flex justify-center pt-1 relative items-center',
                    caption_label:   'text-sm font-bold',
                    nav:             'space-x-1 flex items-center',
                    button_previous: 'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center',
                    button_next:     'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center',
                    month_grid:      'w-full border-collapse space-y-1',
                    weekdays:        'flex',
                    weekday:         'text-muted-foreground rounded-md w-9 font-bold text-[10px] uppercase',
                    week:            'flex w-full mt-2',
                    day:             'h-9 w-9 text-center text-sm p-0 relative [&:has(.range-middle)]:bg-primary/10 [&:has(.range-start)]:bg-primary/10 [&:has(.range-end)]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
                    day_button:      'h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors flex items-center justify-center',
                    range_start:     'range-start bg-primary text-primary-foreground font-bold rounded-md',
                    range_end:       'range-end bg-primary text-primary-foreground font-bold rounded-md',
                    range_middle:    'range-middle text-primary font-medium',
                    selected:        'selected',
                    today:           'today bg-accent text-accent-foreground border border-primary/20',
                    outside:         'outside text-muted-foreground opacity-50',
                    disabled:        'disabled text-muted-foreground opacity-50',
                    hidden:          'invisible',
                  }}
                  components={{
                    // Custom chevron icons for prev/next month navigation
                    Chevron: (props) => {
                      if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />;
                      return <ChevronRight className="h-4 w-4" />;
                    }
                  }}
                />
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DateRangeSelector; 