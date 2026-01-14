import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

interface DateFilterProps {
    startDate: string;
    endDate: string;
    onFilterChange: (startDate: string, endDate: string) => void;
    color?: 'orange' | 'red' | 'green';
}

type DatePreset = 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Minggu Lalu' | 'Bulan Ini' | 'Bulan Lalu' | 'Kustom';

export default function DateFilter({ startDate, endDate, onFilterChange, color = 'orange' }: DateFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activePreset, setActivePreset] = useState<DatePreset>('Hari Ini');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const colorClasses = {
        orange: 'text-orange-500 bg-orange-500',
        red: 'text-red-500 bg-red-500',
        green: 'text-green-500 bg-green-500'
    };

    const activeColor = colorClasses[color].split(' ')[0];
    const activeBg = colorClasses[color].split(' ')[1];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getPresets = (): { label: DatePreset; getRange: () => [string, string] }[] => {
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        return [
            {
                label: 'Hari Ini',
                getRange: () => {
                    const d = new Date();
                    const datestr = formatDate(d);
                    return [datestr, datestr];
                }
            },
            {
                label: 'Kemarin',
                getRange: () => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    const datestr = formatDate(d);
                    return [datestr, datestr];
                }
            },
            {
                label: 'Minggu Ini',
                getRange: () => {
                    const d = new Date();
                    const day = d.getDay() || 7;
                    const start = new Date(d);
                    start.setDate(d.getDate() - day + 1);
                    return [formatDate(start), formatDate(d)];
                }
            },
            {
                label: 'Minggu Lalu',
                getRange: () => {
                    const d = new Date();
                    const day = d.getDay() || 7;
                    const start = new Date(d);
                    start.setDate(d.getDate() - day - 6);
                    const end = new Date(d);
                    end.setDate(d.getDate() - day);
                    return [formatDate(start), formatDate(end)];
                }
            },
            {
                label: 'Bulan Ini',
                getRange: () => {
                    const d = new Date();
                    const start = new Date(d.getFullYear(), d.getMonth(), 1);
                    return [formatDate(start), formatDate(d)];
                }
            },
            {
                label: 'Bulan Lalu',
                getRange: () => {
                    const d = new Date();
                    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
                    const end = new Date(d.getFullYear(), d.getMonth(), 0);
                    return [formatDate(start), formatDate(end)];
                }
            }
        ];
    };

    const handlePresetClick = (preset: typeof presets[0]) => {
        const [start, end] = preset.getRange();
        setActivePreset(preset.label);
        onFilterChange(start, end);
        setIsOpen(false);
    };

    const presets = getPresets();

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-200 dark:hover:border-slate-700 transition-all w-full sm:w-auto"
            >
                <Calendar className={`w-4 h-4 ${activeColor}`} />
                <div className="flex flex-col items-start truncate">
                    <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Periode</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {activePreset === 'Kustom' ? `${startDate} - ${endDate}` : activePreset}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-72 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-[100] p-6 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="space-y-2 mb-6">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => handlePresetClick(preset)}
                                className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activePreset === preset.label
                                    ? `${activeBg} text-white shadow-lg`
                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                                    }`}
                            >
                                {preset.label}
                                {activePreset === preset.label && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Custom Range</span>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Dari</label>
                                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            setActivePreset('Kustom');
                                            onFilterChange(e.target.value, endDate);
                                        }}
                                        className="bg-transparent text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Sampai</label>
                                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setActivePreset('Kustom');
                                            onFilterChange(startDate, e.target.value);
                                        }}
                                        className="bg-transparent text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
