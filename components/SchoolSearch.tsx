'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Edit3 } from 'lucide-react';
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
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualSchoolName, setManualSchoolName] = useState('');
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
        onSelect(school);
    };

    const handleManualSubmit = () => {
        if (manualSchoolName.trim()) {
            const manualSchool: SchoolInfo = {
                schoolName: manualSchoolName.trim(),
                schoolCode: '',
                address: '',
                schoolType: '',
                eduOfficeCode: '',
            };
            onSelect(manualSchool);
            setQuery(manualSchoolName.trim());
            setIsManualMode(false);
        }
    };

    if (isManualMode) {
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={manualSchoolName}
                    onChange={(e) => setManualSchoolName(e.target.value)}
                    placeholder={t('manualInputPlaceholder')}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                />
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleManualSubmit}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {t('confirm')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsManualMode(false)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg text-sm transition-colors"
                    >
                        {t('backToSearch')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                placeholder={t('schoolSearchPlaceholder')}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />

            {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
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

            {/* 수동 입력 전환 버튼 */}
            <button
                type="button"
                onClick={() => setIsManualMode(true)}
                className="mt-1.5 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
            >
                학교를 찾을 수 없나요? 직접 입력하기
            </button>
        </div>
    );
}
