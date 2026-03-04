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
}

export default function SchoolSearch({ value, onSelect, placeholder = '학교명을 입력하세요' }: SchoolSearchProps) {
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

    // 외부 클릭 시 드롭다운 닫기
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

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => !isConfirmed && results.length > 0 && setShowDropdown(true)}
                placeholder={t('schoolSearchPlaceholder')}
                className={`w-full pl-11 pr-12 py-3 bg-white/10 ${isConfirmed ? 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-emerald-100' : 'border-white/20 text-white'} rounded-xl placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all`}
            />

            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isConfirmed ? 'text-emerald-500/70' : 'text-white/40'}`} />

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

            {/* 검색 결과 드롭다운 */}
            {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {results.length > 0 ? (
                        results.map((school, idx) => (
                            <button
                                key={`${school.schoolCode}-${idx}`}
                                type="button"
                                onClick={() => handleSelect(school)}
                                className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                            >
                                <div className="text-white font-medium text-sm">{school.schoolName}</div>
                                <div className="text-white/50 text-xs mt-0.5">
                                    {school.schoolType && <span className="mr-2">{school.schoolType}</span>}
                                    {school.address}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-white/50 text-sm">
                            검색 결과가 없습니다.
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
