'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle } from 'lucide-react';
import { searchSchools } from '@/lib/school-api';
import { SchoolInfo } from '@/types/auth';
import { useLanguage } from '@/lib/i18n';

interface SchoolSearchProps {
    value: string;
    onSelect: (school: SchoolInfo) => void;
    placeholder?: string;
    variant?: 'glass' | 'solid';
}

export default function SchoolSearch({
    value,
    onSelect,
    placeholder,
    variant = 'glass',
}: SchoolSearchProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<SchoolInfo[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (isConfirmed) {
            setIsConfirmed(false);
            onSelect({ schoolName: val, schoolCode: '', address: '', schoolType: '', eduOfficeCode: '' });
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (val.trim().length >= 2) {
            debounceTimer.current = setTimeout(async () => {
                setIsLoading(true);
                const schools = await searchSchools(val);
                setResults(schools);
                setShowDropdown(true);
                setIsLoading(false);
            }, 400);
        } else {
            setResults([]);
            setShowDropdown(false);
        }
    };

    const handleSelect = (school: SchoolInfo) => {
        setQuery(school.schoolName);
        setShowDropdown(false);
        setIsConfirmed(true);
        onSelect(school);
    };

    const isSolid = variant === 'solid';
    const inputClassName = isSolid
        ? `w-full pl-11 pr-12 py-3 border ${isConfirmed ? 'border-emerald-500 bg-emerald-50/70 text-gray-900 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]' : 'border-gray-300 bg-white text-gray-900'} rounded-lg placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`
        : `w-full pl-11 pr-12 py-3 border bg-white/10 ${isConfirmed ? 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-emerald-100' : 'border-white/20 text-white'} rounded-xl placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all`;
    const searchIconClassName = isSolid
        ? `${isConfirmed ? 'text-emerald-500/70' : 'text-gray-400'}`
        : `${isConfirmed ? 'text-emerald-500/70' : 'text-white/40'}`;
    const dropdownClassName = isSolid
        ? 'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto'
        : 'absolute z-50 w-full mt-1 bg-slate-800/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto';
    const resultItemClassName = isSolid
        ? 'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0'
        : 'w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0';
    const resultTitleClassName = isSolid ? 'text-gray-900 font-medium text-sm' : 'text-white font-medium text-sm';
    const resultMetaClassName = isSolid ? 'text-gray-500 text-xs mt-0.5' : 'text-white/50 text-xs mt-0.5';
    const emptyClassName = isSolid ? 'px-4 py-3 text-gray-500 text-sm' : 'px-4 py-3 text-white/50 text-sm';

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => !isConfirmed && results.length > 0 && setShowDropdown(true)}
                placeholder={placeholder || t('schoolSearchPlaceholder')}
                className={inputClassName}
            />

            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${searchIconClassName}`} />

            {isConfirmed && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400 animate-in zoom-in duration-300" />
                </div>
            )}

            {isLoading && !isConfirmed && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
                </div>
            )}

            {showDropdown && (
                <div className={dropdownClassName}>
                    {results.length > 0 ? (
                        results.map((school, idx) => (
                            <button
                                key={`${school.schoolCode}-${idx}`}
                                type="button"
                                onClick={() => handleSelect(school)}
                                className={resultItemClassName}
                            >
                                <div className={resultTitleClassName}>{school.schoolName}</div>
                                <div className={resultMetaClassName}>
                                    {school.schoolType && <span className="mr-2">{school.schoolType}</span>}
                                    {school.address}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className={emptyClassName}>
                            {t('noSearchResults')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
