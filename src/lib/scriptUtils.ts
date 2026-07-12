import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import { Script, ScriptElement, ScriptElementType } from "../types/script";
import { nanoid } from "nanoid";

const SCRIPTS_COLLECTION = "scripts";

export const createScript = async (userId: string, userEmail: string, title: string, writtenBy: string = "", description: string = ""): Promise<string> => {
  const initialContent: ScriptElement[] = [
    { id: nanoid(), type: 'scene-heading', text: 'EXT. LOCATION - DAY' },
    { id: nanoid(), type: 'action', text: 'Start writing your script here...' }
  ];

  const scriptData: Omit<Script, 'id'> = {
    title,
    description,
    writtenBy: writtenBy || userEmail.split('@')[0],
    content: initialContent,
    ownerId: userId,
    ownerEmail: userEmail,
    collaborators: [],
    isPublic: false,
    publicPermission: 'view',
    shareId: nanoid(10),
    settings: {
      fontFamily: 'noto',
      showLabelsInPdf: true
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, SCRIPTS_COLLECTION), scriptData);
  return docRef.id;
};

export const updateScript = async (scriptId: string, data: Partial<Script>) => {
  const docRef = doc(db, SCRIPTS_COLLECTION, scriptId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteScript = async (scriptId: string) => {
  await deleteDoc(doc(db, SCRIPTS_COLLECTION, scriptId));
};

export const getScript = async (scriptId: string): Promise<Script | null> => {
  const docRef = doc(db, SCRIPTS_COLLECTION, scriptId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Script;
  }
  return null;
};

export const getUserScripts = async (userId: string): Promise<Script[]> => {
  const q = query(
    collection(db, SCRIPTS_COLLECTION), 
    where("ownerId", "==", userId),
    orderBy("updatedAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Script));
};

export const getScriptByShareId = async (shareId: string): Promise<Script | null> => {
  const q = query(collection(db, SCRIPTS_COLLECTION), where("shareId", "==", shareId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Script;
  }
  return null;
};

export const subscribeToScript = (scriptId: string, callback: (script: Script | null) => void) => {
  return onSnapshot(doc(db, SCRIPTS_COLLECTION, scriptId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Script);
    } else {
      callback(null);
    }
  });
};

export const exportToPDF = async (script: Script) => {
  try {
    const response = await fetch('/api/scripts/export-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(script),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.title.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};

export const getNextElementType = (currentType: ScriptElementType): ScriptElementType => {
  switch (currentType) {
    case 'scene-heading': return 'action';
    case 'character': return 'dialogue';
    case 'dialogue': return 'character';
    case 'parenthetical': return 'dialogue';
    case 'transition': return 'scene-heading';
    default: return 'action';
  }
};
