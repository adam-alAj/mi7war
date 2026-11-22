import Dexie, { type Table } from 'dexie';
import type { Interview, Recording } from './types';
class InterviewDB extends Dexie {
  interviews!: Table<Interview, string>;
  recordings!: Table<Recording, string>;
  constructor() { super('mihwar-interviews'); this.version(1).stores({ interviews: 'id, updatedAt, status, participant', recordings: 'id, interviewId, questionId, createdAt, [interviewId+questionId]' }); }
}
export const db = new InterviewDB();
export const saveInterview = async (item: Interview) => db.interviews.put({ ...item, updatedAt: Date.now() });
