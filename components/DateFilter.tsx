import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

interface DateFilterProps {
    startDate: string;
    endDate: string;
    onFilterChange: (startDate: string, endDate: string) => void;
    color?: 'orange' | 'red' | 'green';
}

type DatePreset = 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Minggu Lalu' | 'Bulan Ini' | 'Bulan Lalu' | 'Kustom' | string;

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function DateFilter({ startDate, endDate, onFilterChange, color = 'orange' }: DateFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activePreset, setActivePreset] = useState<DatePreset>('Bulan Ini');

    // Month & Year state
    const todayDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(todayDate.getMonth()); // 0-indexed
    const [selectedYear, setSelectedYear] = useState<number>(todayDate.getFullYear());

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

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPresets = (): { label: string; getRange: () => [string, string] }[] => {
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
            },
            {
                label: 'Tahun Ini (Semua Data)',
                getRange: () => {
                    const year = new Date().getFullYear();
                    return [`${year}-01-01`, `${year}-12-31`];
                }
            }
        ];
    };

    const handlePresetClick = (preset: { label: string; getRange: () => [string, string] }) => {
        const [start, end] = preset.getRange();
        setActivePreset(preset.label);
        onFilterChange(start, end);
        setIsOpen(false);
    };

    // Apply specific Month & Year selection
    const handleMonthYearChange = (monthIdx: number, yearNum: number) => {
        setSelectedMonth(monthIdx);
        setSelectedYear(yearNum);

        const start = new Date(yearNum, monthIdx, 1);
        const end = new Date(yearNum, monthIdx + 1, 0);

        const startStr = formatDate(start);
        const endStr = formatDate(end);

        const label = `${MONTH_NAMES[monthIdx]} ${yearNum}`;
        setActivePreset(label);
        onFilterChange(startStr, endStr);
        setIsOpen(false);
    };

    const presets = getPresets();

    // Available years for dropdown
    const yearOptions = [2024, 2025, 2026, 2027];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-200 dark:hover:border-slate-700 transition-all w-full sm:w-auto"
            >
                <Calendar className={`w-4 h-4 ${activeColor}`} />
                <div className="flex flex-col items-start truncate">
                    <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Periode</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[160px]">
                        {activePreset === 'Kustom' ? `${startDate} - ${endDate}` : activePreset}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-[100] p-6 animate-in fade-in zoom-in duration-200 origin-top-right">
                    
                    {/* QUICK MONTH & YEAR SELECTOR */}
                    <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            🗓️ Pilih Bulan & Tahun
                        </span>

                        {/* Month & Year Dropdowns */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <select
                                value={selectedMonth}
                                onChange={(e) => handleMonthYearChange(Number(e.target.value), selectedYear)}
                                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                            >
                                {MONTH_NAMES.map((name, idx) => (
                                    <option key={name} value={idx}>{name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedYear}
                                onChange={(e) => handleMonthYearChange(selectedMonth, Number(e.target.value))}
                                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                            >
                                {yearOptions.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Quick 1-Click Month Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {MONTH_NAMES.map((name, idx) => {
                                const shortName = name.substring(0, 3);
                                const isSelected = activePreset === `${name} ${selectedYear}`;
                                return (
                                    <button
                                        key={name}
                                        onClick={() => handleMonthYearChange(idx, selectedYear)}
                                        className={`py-2 px-1 text-[10px] font-extrabold uppercase rounded-xl transition-all ${
                                            isSelected
                                                ? `${activeBg} text-white shadow-md scale-105`
                                                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {shortName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* STANDARD PRESETS */}
                    <div className="space-y-1.5 mb-6">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preset Lainnya</span>
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => handlePresetClick(preset)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activePreset === preset.label
                                        ? `${activeBg} text-white shadow-md`
                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                                }`}
                            >
                                {preset.label}
                                {activePreset === preset.label && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>

                    {/* CUSTOM RANGE */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Kustom Tanggal</span>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1">Dari</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setActivePreset('Kustom');
                                        onFilterChange(e.target.value, endDate);
                                    }}
                                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1">Sampai</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setActivePreset('Kustom');
                                        onFilterChange(startDate, e.target.value);
                                    }}
                                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
