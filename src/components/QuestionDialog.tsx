import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Check, LoaderCircle, Plus, X } from 'lucide-react';
import type { Interview, Question, QuestionType } from '../types';

type QuestionGroup = 'text' | 'choice' | 'rating';
type FormValues = { text: string; group: QuestionGroup; type: QuestionType; category: string; description: string; required: boolean; options: string; followUps: string };
type Props = {
  mode: 'add' | 'edit';
  question?: Question;
  sections: Interview['sections'];
  onSave: (question: Question, category: string) => Promise<void>;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const groupFor = (type: QuestionType): QuestionGroup => type === 'rating' ? 'rating' : ['choice', 'multi', 'dropdown', 'yesno'].includes(type) ? 'choice' : 'text';
const initialValues = (question: Question | undefined, sections: Interview['sections']): FormValues => ({
  text: question?.text ?? '',
  group: question ? groupFor(question.type) : 'text',
  type: question?.type ?? 'long',
  category: sections.find(section => section.id === question?.sectionId)?.heading ?? sections[0]?.heading ?? 'أسئلة مخصصة',
  description: question?.description ?? '',
  required: question?.required ?? false,
  options: question?.options?.join('\n') ?? '',
  followUps: question?.followUps.join('\n') ?? '',
});

const typeLabels: Record<QuestionType, string> = { long: 'إجابة نصية طويلة', short: 'إجابة قصيرة', choice: 'اختيار واحد', multi: 'اختيارات متعددة', dropdown: 'قائمة منسدلة', yesno: 'نعم أو لا', number: 'رقم', date: 'تاريخ', rating: 'تقييم من 1 إلى 5', notes: 'ملاحظات' };

export default function QuestionDialog({ mode, question, sections, onSave, onClose, onSuccess }: Props) {
  const [values, setValues] = useState(() => initialValues(question, sections));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialValues(question, sections)));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [savedAnother, setSavedAnother] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dirty = JSON.stringify(values) !== baseline;
  const isChoice = values.group === 'choice';

  useLayoutEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    textareaRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [values.text]);

  const closeDialog = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 160);
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) setDiscardPrompt(true);
    else closeDialog();
  };

  const resumeEditing = () => {
    setDiscardPrompt(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (discardPrompt) resumeEditing();
        else requestClose();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !discardPrompt) {
        event.preventDefault();
        dialogRef.current?.querySelector<HTMLFormElement>('form')?.requestSubmit();
        return;
      }
      if (event.key !== 'Tab') return;
      const activeDialog = dialogRef.current?.querySelector<HTMLElement>('[role="alertdialog"]') ?? dialogRef.current;
      if (!activeDialog) return;
      const focusable = [...activeDialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [discardPrompt, requestClose]);

  const update = (patch: Partial<FormValues>) => { setValues(current => ({ ...current, ...patch })); setError(''); setSavedAnother(false); };
  const selectGroup = (group: QuestionGroup) => {
    if (group === values.group) return;
    const type: QuestionType = group === 'rating' ? 'rating' : group === 'choice' ? 'choice' : 'long';
    update({ group, type, options: group === 'choice' ? values.options : '' });
  };

  const submit = async (addAnother: boolean) => {
    const text = values.text.trim();
    if (!text) { setError('اكتب نص السؤال قبل الحفظ.'); textareaRef.current?.focus(); return; }
    if (isChoice && values.type !== 'yesno' && !values.options.split('\n').some(option => option.trim())) { setError('أضف خياراً واحداً على الأقل لهذا السؤال.'); return; }
    const savedQuestion: Question = {
      id: question?.id ?? crypto.randomUUID(),
      text,
      type: values.type,
      sectionId: question?.sectionId ?? '',
      required: values.required,
      description: values.description.trim() || undefined,
      options: isChoice ? values.options.split('\n').map(option => option.trim()).filter(Boolean) : undefined,
      followUps: values.followUps.split('\n').map(item => item.trim()).filter(Boolean),
    };
    setSaving(true);
    setError('');
    try {
      await onSave(savedQuestion, values.category.trim() || 'أسئلة مخصصة');
      if (addAnother && mode === 'add') {
        onSuccess('تمت إضافة السؤال.');
        const nextValues = { ...values, text: '', description: '', required: false, options: '', followUps: '' };
        setValues(nextValues);
        setBaseline(JSON.stringify(nextValues));
        setSavedAnother(true);
        requestAnimationFrame(() => textareaRef.current?.focus());
      } else {
        onSuccess(mode === 'edit' ? 'تم حفظ تعديلات السؤال.' : 'تمت إضافة السؤال.');
        closeDialog();
      }
    } catch {
      setError('تعذر حفظ السؤال. تحقق من التخزين المحلي ثم حاول مجدداً.');
    } finally { setSaving(false); }
  };

  return <div className={`question-dialog-backdrop${closing ? ' is-closing' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <div className="question-dialog" role="dialog" aria-modal="true" aria-labelledby="question-dialog-title" ref={dialogRef}>
      <header className="question-dialog-header"><div><span className="question-dialog-kicker">{mode === 'edit' ? 'إدارة الأسئلة' : 'بناء المقابلة'}</span><h2 id="question-dialog-title">{mode === 'edit' ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h2><p>{mode === 'edit' ? 'حدّث صياغة السؤال وإعداداته.' : 'أضف سؤالاً واضحاً، ويمكنك متابعة إضافة أسئلة أخرى.'}</p></div><button className="question-dialog-close" type="button" onClick={requestClose} aria-label="إغلاق نافذة السؤال"><X size={19}/></button></header>
      <form onSubmit={event => { event.preventDefault(); void submit(false); }} noValidate>
        <div className="question-dialog-body">
          <label className="qd-field" htmlFor="question-text"><span className="qd-label">نص السؤال <b aria-hidden="true">*</b></span><textarea ref={textareaRef} id="question-text" rows={2} maxLength={300} value={values.text} onChange={event => update({ text: event.target.value })} placeholder="اكتب السؤال بوضوح…" aria-invalid={Boolean(error && !values.text.trim())} aria-describedby={`question-count${error ? ' question-error' : ''}`}/><span className="qd-count" id="question-count" aria-live="polite">{values.text.length}/300</span>{error && !values.text.trim() && <span className="qd-error" id="question-error"><AlertCircle size={15}/>{error}</span>}</label>
          <fieldset className="qd-fieldset"><legend className="qd-label">نوع السؤال</legend><div className="qd-segmented" role="group" aria-label="نوع السؤال"><button type="button" aria-pressed={values.group === 'text'} className={values.group === 'text' ? 'is-selected' : ''} onClick={() => selectGroup('text')}>نصي</button><button type="button" aria-pressed={values.group === 'choice'} className={values.group === 'choice' ? 'is-selected' : ''} onClick={() => selectGroup('choice')}>اختيار من متعدد</button><button type="button" aria-pressed={values.group === 'rating'} className={values.group === 'rating' ? 'is-selected' : ''} onClick={() => selectGroup('rating')}>تقييم</button></div></fieldset>
          {isChoice && <div className="qd-choice-fields"><label className="qd-field" htmlFor="question-choice-type"><span className="qd-label">طريقة الاختيار</span><select id="question-choice-type" value={values.type} onChange={event => update({ type: event.target.value as QuestionType })}>{(['choice', 'multi', 'dropdown', 'yesno'] as QuestionType[]).map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>{values.type !== 'yesno' && <label className="qd-field" htmlFor="question-options"><span className="qd-label">الخيارات <small>خيار واحد في كل سطر</small></span><textarea id="question-options" rows={3} value={values.options} onChange={event => update({ options: event.target.value })} placeholder={'الخيار الأول\nالخيار الثاني'} aria-describedby={error && isChoice ? 'question-error' : undefined}/></label>}</div>}
          {values.group === 'text' && <label className="qd-field" htmlFor="question-text-type"><span className="qd-label">صيغة الإجابة</span><select id="question-text-type" value={values.type} onChange={event => update({ type: event.target.value as QuestionType })}>{(['long', 'short', 'notes', 'number', 'date'] as QuestionType[]).map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>}
          <label className="qd-field" htmlFor="question-category"><span className="qd-label">الفئة <small>اختياري</small></span><input id="question-category" value={values.category} maxLength={80} onChange={event => update({ category: event.target.value })} placeholder="مثال: الخبرة المهنية"/></label>
          <label className="qd-field" htmlFor="question-description"><span className="qd-label">توضيح للمشارك <small>اختياري</small></span><textarea id="question-description" rows={2} value={values.description} onChange={event => update({ description: event.target.value })} placeholder="أضف إرشادات قصيرة للإجابة"/></label>
          <label className="qd-field" htmlFor="question-followups"><span className="qd-label">أسئلة متابعة مقترحة <small>اختياري · سؤال في كل سطر</small></span><textarea id="question-followups" rows={2} value={values.followUps} onChange={event => update({ followUps: event.target.value })} placeholder="ما المثال الذي يوضح ذلك؟"/></label>
          <label className="qd-checkbox"><input type="checkbox" checked={values.required} onChange={event => update({ required: event.target.checked })}/><span><b>سؤال مطلوب</b><small>تمييزه بوضوح عند مراجعة المقابلة.</small></span></label>
          {error && !(!values.text.trim()) && <p className="qd-error qd-form-error" id="question-error" role="alert"><AlertCircle size={15}/>{error}</p>}
          {savedAnother && <p className="qd-success" role="status"><Check size={15}/>تمت إضافة السؤال، يمكنك كتابة السؤال التالي.</p>}
        </div>
        <footer className="question-dialog-footer"><button className="button outline qd-cancel" type="button" onClick={requestClose}>إلغاء</button><div className="qd-save-actions"><button className="button outline qd-add-another" type="button" disabled={mode === 'edit' || saving} onClick={() => void submit(true)}><Plus size={16}/>حفظ وإضافة آخر</button><button className="button primary qd-save" type="submit" disabled={saving}>{saving && <LoaderCircle className="qd-spinner" size={16}/>} {!saving && <Check size={16}/>} {saving ? 'جارٍ الحفظ…' : mode === 'edit' ? 'حفظ التعديلات' : 'حفظ وإضافة'}</button></div></footer>
      </form>
      {discardPrompt && <div className="qd-confirm-layer"><section className="qd-confirm" role="alertdialog" aria-modal="true" aria-labelledby="qd-confirm-title" aria-describedby="qd-confirm-description"><h3 id="qd-confirm-title">تجاهل التغييرات؟</h3><p id="qd-confirm-description">لديك تغييرات لم تُحفظ. هل تريد إغلاق النافذة وفقدانها؟</p><div><button className="button outline" type="button" autoFocus onClick={resumeEditing}>متابعة التعديل</button><button className="button qd-discard" type="button" onClick={closeDialog}>إغلاق دون حفظ</button></div></section></div>}
    </div>
  </div>;
}
