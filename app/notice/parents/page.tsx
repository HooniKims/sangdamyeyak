'use client';

import { useState, useEffect } from 'react';
import ReactCalendar from 'react-calendar';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { MessageCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import 'react-calendar/dist/Calendar.css';
import { getNoteByDate } from '@/lib/notice-firebase';
import { useAuth } from '@/components/AuthContext';
import { NoticeMarkdown } from '@/components/NoticeMarkdown';
import { useLanguage } from '@/lib/i18n';

export default function NoticeParentsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { t, language } = useLanguage();
    const [date, setDate] = useState<Date>(new Date());
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [matchedTeacherId, setMatchedTeacherId] = useState<string | null>(null);
    const [matchLoading, setMatchLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [authLoading, user, router]);

    // profile에서 매칭된 교사 ID 직접 가져오기
    useEffect(() => {
        if (profile?.role === 'parent') {
            const parentProfile = profile as import('@/types/auth').ParentProfile;
            setMatchedTeacherId(parentProfile.matchedTeacherId || null);
            setMatchLoading(false);
        } else if (profile?.role === 'teacher' || profile?.role === 'admin') {
            setMatchedTeacherId(user?.uid || null); // 교사는 본인 ID
            setMatchLoading(false);
        }
    }, [profile, user]);

    useEffect(() => {
        if (!user || matchLoading) return;

        // 교사 역할이면 자신의 알림장을 봄
        const teacherUid = profile?.role === 'teacher' ? user.uid : matchedTeacherId;
        if (!teacherUid) return;

        const loadNote = async () => {
            setIsLoading(true);
            setSummary('');

            try {
                const dateStr = format(date, 'yyyy-MM-dd');
                const data = await getNoteByDate(dateStr, teacherUid);
                if (data) {
                    setSummary(data.summary || data.originalContent || '');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadNote();
    }, [date, user, matchedTeacherId, matchLoading, profile]);

    return (
        <div className="notice-page min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 transition-colors duration-300">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-4 h-4 mr-1" /> {t('backToMain')}
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">{t('noticeTitle')}</h1>
                    <div />
                </div>

                {/* 매칭 안 된 경우 안내 */}
                {!matchLoading && !matchedTeacherId && profile?.role === 'parent' && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium text-amber-800">{t('teacherNotMatched')}</p>
                            <p className="text-sm text-amber-700 mt-1">
                                {t('teacherNotMatchedDesc')}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                            <ReactCalendar
                                onChange={(value) => setDate(value as Date)}
                                value={date}
                                locale={language === 'ko' ? 'ko-KR' : 'en-US'}
                                calendarType="gregory"
                                className="!w-full !border-none !font-sans"
                            />
                            <p className="text-center text-sm text-gray-400 mt-3">
                                {t('selectDateNotice')}
                            </p>
                        </div>
                    </div>

                    {/* Note Display */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 min-h-[400px]">
                            <h2 className="text-xl font-bold text-emerald-600 mb-4 pb-3 border-b-2 border-gray-100">
                                {format(date, language === 'ko' ? 'yyyy년 M월 d일 (EEE)' : 'MMM d, yyyy (EEE)', { locale: language === 'ko' ? ko : enUS })} {t('notice')}
                            </h2>

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
                                    <p>{t('loadingNotice')}</p>
                                </div>
                            ) : summary ? (
                                <div className="prose prose-sm max-w-none">
                                    <NoticeMarkdown content={summary} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
                                    <MessageCircle size={48} className="mb-4 opacity-50" />
                                    <p className="font-medium">{t('noNoticeForDate')}</p>
                                    <p className="text-sm">{t('tryAnotherDate')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
