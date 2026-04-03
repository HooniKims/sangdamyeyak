import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZ_sjK_CjOjF-Qd0x3J8KcELuPBshHJoo",
  authDomain: "sangdamyeyak-17d20.firebaseapp.com",
  projectId: "ysangdamyeyak-17d20",
  storageBucket: "sangdamyeyak-17d20.firebasestorage.app",
  messagingSenderId: "712215147695",
  appId: "1:712215147695:web:11a32cd80808d6fb54905a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    console.log("1. Testing matchTeacher query...");
    const q = query(
        collection(db, 'users'),
        where('role', 'in', ['teacher', 'admin']),
        where('schoolCode', '==', 'S0000000'),
        where('grade', '==', 1),
        where('classNum', '==', 1)
    );
    const snap = await getDocs(q);
    console.log("Query success! Found docs:", snap.size);
  } catch (err: unknown) {
    console.error(
      "matchTeacher query failed with:",
      err instanceof Error ? err.message : String(err),
    );
  }

  try {
    console.log("\n2. Testing addDoc nonHomeroomRequests...");
    const payload = {
      targetTeacherId: "direct_input_123456789",
      targetTeacherName: "홍길동 선생님",
      homeroomTeacherId: null,
      schoolCode: "S0000000",
      schoolName: "테스트학교",
      grade: 1,
      classNum: 1,
      studentName: "테스트학생",
      preferredDate: "2024-03-20",
      preferredTime: "14:00",
      preferredDateTime: "2024-03-20T14:00",
      content: "테스트",
      consultationType: "face",
      consultationTypeEtc: "",
      createdAt: Date.now()
    };
    const res = await addDoc(collection(db, 'nonHomeroomRequests'), payload);
    console.log("addDoc success! ID:", res.id);
  } catch (err: unknown) {
    console.error(
      "addDoc failed with:",
      err instanceof Error ? err.message : String(err),
    );
  }
  process.exit(0);
}

run();
