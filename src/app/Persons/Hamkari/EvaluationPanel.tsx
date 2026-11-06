"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { useCallback, useEffect, useState } from "react";
import { Plus, Eye, X, Save, Trash2 } from "lucide-react";
import styles from "./Hamkari.module.css";

type EvaluationRow = {
  EvaluationId: number;
  ElectionTitle: string;
  EvaluationType: string;
  CreateUserName: string;
  CreateDateTime: string;
  FinalResult: string;
};
type Question = {
  QuestionId: number;
  SortOrder: number;
  QuestionText: string;
  IsFinal: boolean;
  Score: number | null;
  Description: string;
};
type Template = { TemplateId: number; Title: string; ElectionTitle: string };

async function evaluationRequest(payload: Record<string, unknown>) {
  const response = await fetch("/Api/Hamkari/PersonEvaluations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.status !== 200) throw new Error(data.error || "خطا در دریافت اطلاعات ارزیابی");
  return data.data;
}

const SCORES = [
  { value: 1, label: "ضعیف" },
  { value: 2, label: "متوسط" },
  { value: 3, label: "خوب" },
  { value: 4, label: "عالی" },
];

export default function EvaluationPanel({ personId, userId }: { personId: number; userId: number }) {
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  const [evaluationId, setEvaluationId] = useState(0);
  const [template, setTemplate] = useState<Template | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadList = useCallback(async () => {
    if (!personId) return;
    setLoading(true);
    try {
      const list = await evaluationRequest({ action: "list", personId });
      setRows(Array.isArray(list) ? list : []);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "خطا در دریافت ارزیابی‌ها"); }
    finally { setLoading(false); }
  }, [personId]);

  useEffect(() => { void loadList(); }, [loadList]);

  const openForm = async (id: number) => {
    setEvaluationId(id);
    setFormError("");
    setFormLoading(true);
    setOpened(true);
    try {
      const data = await evaluationRequest({ action: "form", evaluationId: id });
      if (!data?.template || !Array.isArray(data.questions)) throw new Error("الگوی ارزیابی یافت نشد.");
      setTemplate(data.template);
      setQuestions(data.questions.map((q: Question) => ({ ...q, Score: q.Score ? Number(q.Score) : null, Description: q.Description || "" })));
    } catch (err) { setFormError(err instanceof Error ? err.message : "خطا در دریافت سؤالات"); }
    finally { setFormLoading(false); }
  };

  const updateQuestion = (questionId: number, patch: Partial<Question>) => {
    setQuestions((all) => all.map((q) => q.QuestionId === questionId ? { ...q, ...patch } : q));
  };

  const save = async () => {
    if (!template) return;
    if (questions.some((q) => !q.Score)) { setFormError("لطفاً به تمام سؤالات، از جمله نتیجه نهایی، پاسخ دهید."); return; }
    setFormError("");
    setSaving(true);
    try {
      await evaluationRequest({
        action: "save", evaluationId, personId, templateId: template.TemplateId, userId,
        answers: questions.map((q) => ({ questionId: q.QuestionId, score: q.Score, description: q.Description.trim() })),
      });
      setOpened(false);
      await loadList();
    } catch (err) { setFormError(err instanceof Error ? err.message : "ثبت ارزیابی انجام نشد."); }
    finally { setSaving(false); }
  };

  const deleteEvaluation = async (evaluationIdToDelete: number) => {
    if (!await meratConfirm("آیا از حذف این ارزیابی اطمینان دارید؟")) return;
    try {
      await evaluationRequest({ action: "delete", evaluationId: evaluationIdToDelete, personId, userId });
      await loadList();
    } catch (err) { setError(err instanceof Error ? err.message : "حذف ارزیابی انجام نشد."); }
  };

  return (
    <section className={styles.evaluationSection}>
      <div className={styles.evaluationToolbar}>
        <div><strong>ارزیابی‌های ثبت‌شده</strong><span>سؤالات و گزینه‌های امتیازدهی از پایگاه داده دریافت می‌شوند.</span></div>
        <button type="button" className={styles.evaluationAdd} onClick={() => openForm(0)}><Plus size={16} /> افزودن ارزیابی</button>
      </div>
      {loading ? <div className={styles.stateText}>در حال دریافت ارزیابی‌ها...</div> : error ? <div className={styles.errorBox}>{error}</div> : (
        <div className={styles.profileNewsScroll}>
          <table className={styles.profileNewsTable}>
            <thead><tr><th>انتخابات</th><th>نوع ارزیابی</th><th>ثبت‌کننده</th><th>نتیجه ارزیابی</th><th>عملیات</th></tr></thead>
            <tbody>
              {!rows.length ? (
                <tr className={styles.evaluationDefaultRow}>
                  <td>سراسری مجلس شورای اسلامی دوره ۱۲ مرحله ۱</td><td>محقق (پیش‌فرض)</td><td>—</td><td>ثبت نشده</td>
                  <td><button type="button" className={styles.evaluationView} onClick={() => openForm(0)}>شروع ارزیابی</button></td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.EvaluationId}>
                  <td>{row.ElectionTitle}</td><td>{row.EvaluationType}</td><td>{row.CreateUserName || "—"}</td>
                  <td><span className={styles.profileNewsStatus}>{row.FinalResult}</span></td>
                  <td><div className={styles.evaluationRowActions}><button type="button" className={styles.evaluationView} onClick={() => openForm(row.EvaluationId)}><Eye size={15} /> مشاهده / ویرایش</button><button type="button" className={styles.evaluationDelete} onClick={() => deleteEvaluation(row.EvaluationId)}><Trash2 size={14} /> حذف</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {opened ? (
        <div className={styles.evaluationOverlay} role="dialog" aria-modal="true" aria-label="فرم ارزیابی محقق">
          <div className={styles.evaluationDialog}>
            <header className={`${styles.evaluationDialogHeader} merat-modal-tone--neutral`}>
              <div><strong>{evaluationId ? "مشاهده و ویرایش ارزیابی" : "ثبت ارزیابی جدید"}</strong><span>{template?.ElectionTitle || "ارزیابی محقق"}</span></div>
              <button type="button" onClick={() => setOpened(false)} aria-label="بستن"><X size={19} /></button>
            </header>
            <div className={styles.evaluationDialogBody}>
              {formLoading ? <div className={styles.stateText}>در حال دریافت سؤالات...</div> : (
                questions.map((question) => (
                  <div className={`${styles.evaluationQuestion} ${question.IsFinal ? styles.evaluationFinalQuestion : ""}`} key={question.QuestionId}>
                    <div className={styles.evaluationQuestionTitle}>{question.SortOrder.toLocaleString("fa-IR")}. {question.QuestionText}</div>
                    <div className={styles.evaluationChoices}>
                      {SCORES.map((score) => (
                        <label key={score.value} className={`${styles.evaluationChoice} ${question.Score === score.value ? styles.evaluationChoiceSelected : ""}`}>
                          <input type="radio" name={`evaluation-q-${question.QuestionId}`} checked={question.Score === score.value} onChange={() => updateQuestion(question.QuestionId, { Score: score.value })} />
                          {score.label}
                        </label>
                      ))}
                    </div>
                    <textarea value={question.Description} maxLength={3000} rows={2} placeholder="توضیحات این سؤال (اختیاری)" onChange={(event) => updateQuestion(question.QuestionId, { Description: event.target.value })} />
                  </div>
                ))
              )}
              {formError ? <div className={styles.errorBox}>{formError}</div> : null}
            </div>
            <footer className={styles.evaluationDialogFooter}>
              <button type="button" className={styles.secondaryButton} onClick={() => setOpened(false)}>انصراف</button>
              <button type="button" className={styles.primaryButton} disabled={saving || formLoading || !template} onClick={save}><Save size={16} /> {saving ? "در حال ذخیره..." : "ثبت ارزیابی"}</button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
