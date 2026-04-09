export interface DateRange {
  start: Date;
  end: Date;
  preset?: DateRangePreset;
}

export type DateRangePreset = '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'custom';