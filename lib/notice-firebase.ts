import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

const NOTES_COLLECTION = 'notes';

/**
 * 교사별 알림장 문서 ID 생성
 * 교사 UID가 있으면 교사별 분리, 없으면 레거시 호환
 */
function noteDocId(dateStr: string, teacherUid?: string): string {
    return teacherUid ? `${teacherUid}_${dateStr}` : dateStr;
}

// Save or Update a note (교사별 분리 저장)
export const saveNote = async (dateStr: string, originalContent: string, summary: string, teacherUid?: string) => {
    try {
        const docId = noteDocId(dateStr, teacherUid);
        const noteRef = doc(db, NOTES_COLLECTION, docId);
        await setDoc(noteRef, {
            date: dateStr,
            originalContent,
            summary,
            teacherUid: teacherUid || null,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving note:", error);
        throw error;
    }
};

// Get a single note by date (교사별 분리 조회)
export const getNoteByDate = async (dateStr: string, teacherUid?: string) => {
    try {
        const docId = noteDocId(dateStr, teacherUid);
        const noteRef = doc(db, NOTES_COLLECTION, docId);
        const docSnap = await getDoc(noteRef);

        if (docSnap.exists()) {
            return docSnap.data();
        }

        // teacherUid로 조회 실패 시 레거시(날짜만) 문서도 확인
        if (teacherUid) {
            const legacyRef = doc(db, NOTES_COLLECTION, dateStr);
            const legacySnap = await getDoc(legacyRef);
            if (legacySnap.exists()) {
                return legacySnap.data();
            }
        }

        return null;
    } catch (error) {
        console.error("Error getting note:", error);
        throw error;
    }
};

// Get all notes (교사별 필터링)
export const getAllNotes = async (teacherUid?: string) => {
    try {
        const notesRef = collection(db, NOTES_COLLECTION);
        let q;

        if (teacherUid) {
            // orderBy를 제거하여 복합 인덱스 오류 방지 (클라이언트에서 정렬)
            q = query(notesRef, where('teacherUid', '==', teacherUid));
        } else {
            q = query(notesRef);
        }

        const querySnapshot = await getDocs(q);

        const notes: { date: string; originalContent?: string; summary?: string; updatedAt?: string; teacherUid?: string }[] = [];
        querySnapshot.forEach((docSnap) => {
            notes.push(docSnap.data() as { date: string; originalContent?: string; summary?: string; updatedAt?: string; teacherUid?: string });
        });

        // 최신 날짜순 정렬 (클라이언트 단 수행)
        return notes.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
        console.error("Error getting all notes:", error);
        throw error;
    }
};

// Delete a note (교사별 분리 삭제)
export const deleteNote = async (dateStr: string, teacherUid?: string) => {
    try {
        const docId = noteDocId(dateStr, teacherUid);
        await deleteDoc(doc(db, NOTES_COLLECTION, docId));
        return true;
    } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
    }
};
