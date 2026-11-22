export type QuestionType = 'long' | 'short' | 'choice' | 'multi' | 'dropdown' | 'yesno' | 'number' | 'date' | 'rating' | 'notes';
export interface Question { id: string; text: string; followUps: string[]; sectionId: string; type: QuestionType; required: boolean; description?: string; options?: string[]; }
export interface InterviewSection { id: string; heading: string; questions: { id: string; text: string; followUps: string[] }[]; }
export interface Library { source: string; language: string; sections: InterviewSection[]; }
export interface Answer { value: string; originalTranscript?: string; notes?: string; status: 'pending' | 'answered' | 'skipped'; }
export interface Interview { id: string; title: string; participant: string; age: string; occupation: string; education: string; location: string; interviewer: string; date: string; notes: string; metadata: {key:string;value:string}[]; sections: {id:string;heading:string}[]; questions: Question[]; answers: Record<string,Answer>; status: 'draft'|'in-progress'|'completed'; createdAt: number; updatedAt: number; }
export interface Recording { id: string; interviewId: string; questionId: string; blob: Blob; mimeType: string; duration: number; createdAt: number; }
