import { NextRequest, NextResponse } from 'next/server';

const FIRESTORE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const MAX_FAILED_ATTEMPTS = 10;

async function findUserByEmail(email: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents:runQuery`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            structuredQuery: {
                from: [{ collectionId: 'users' }],
                where: {
                    fieldFilter: {
                        field: { fieldPath: 'email' },
                        op: 'EQUAL',
                        value: { stringValue: email },
                    },
                },
                limit: 1,
            },
        }),
    });

    if (!res.ok) return null;

    const results = await res.json();
    if (!results?.[0]?.document) return null;

    const doc = results[0].document;
    const fields = doc.fields;

    return {
        docPath: doc.name.split('/documents/')[1],
        uid: fields.uid?.stringValue || '',
        email: fields.email?.stringValue || '',
        isLocked: fields.isLocked?.booleanValue || false,
        failedLoginAttempts: parseInt(fields.failedLoginAttempts?.integerValue || '0', 10),
    };
}

async function updateUserFields(docPath: string, fields: Record<string, unknown>) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${docPath}`;

    const firestoreFields: Record<string, unknown> = {};
    const updateMask: string[] = [];

    for (const [key, value] of Object.entries(fields)) {
        updateMask.push(key);
        if (typeof value === 'boolean') {
            firestoreFields[key] = { booleanValue: value };
        } else if (typeof value === 'number') {
            firestoreFields[key] = { integerValue: String(value) };
        } else if (typeof value === 'string') {
            firestoreFields[key] = { stringValue: value };
        }
    }

    await fetch(`${url}?updateMask.fieldPaths=${updateMask.join('&updateMask.fieldPaths=')}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: firestoreFields }),
    });
}

export async function POST(request: NextRequest) {
    try {
        const { email, action } = await request.json();

        if (!email || !action) {
            return NextResponse.json(
                { error: '이메일과 액션이 필요합니다.' },
                { status: 400 }
            );
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return NextResponse.json({ isLocked: false, failedAttempts: 0 });
        }

        switch (action) {
            case 'check':
                return NextResponse.json({
                    isLocked: user.isLocked,
                    failedAttempts: user.failedLoginAttempts,
                });

            case 'increment': {
                const newCount = user.failedLoginAttempts + 1;
                const isLocked = newCount >= MAX_FAILED_ATTEMPTS;

                await updateUserFields(user.docPath, {
                    failedLoginAttempts: newCount,
                    isLocked,
                });

                return NextResponse.json({
                    isLocked,
                    failedAttempts: newCount,
                });
            }

            case 'reset': {
                await updateUserFields(user.docPath, {
                    failedLoginAttempts: 0,
                    isLocked: false,
                });

                return NextResponse.json({
                    isLocked: false,
                    failedAttempts: 0,
                });
            }

            default:
                return NextResponse.json(
                    { error: '잘못된 액션입니다.' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Auth check-lock error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
