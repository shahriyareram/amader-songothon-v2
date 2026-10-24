import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Wallet,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Plus,
  Eye,
  Edit3,
  ShieldCheck,
  Building,
  Info,
  Clock,
  Sparkles,
  DollarSign,
  Trash2,
} from 'lucide-react';
import { Member, OrganizationSettings, AnnualExpense } from '../types';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  getBengaliDate,
} from '../utils/bengali';

interface ReportPageProps {
  members: Member[];
  settings: OrganizationSettings;
  annualExpenses: AnnualExpense[];
  isAdmin: boolean;
  onSaveAnnualExpense: (expense: AnnualExpense) => Promise<void>;
  onDeleteAnnualExpense?: (id: string) => Promise<void>;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  members,
  settings,
  annualExpenses,
  isAdmin,
  onSaveAnnualExpense,
  onDeleteAnnualExpense,
}) => {
  // Current Year
  const currentYear = settings.currentYear || 2026;

  // Selected year for viewing/managing annual expenses
  const [selectedExpenseYear, setSelectedExpenseYear] = useState<number>(currentYear);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AnnualExpense | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<AnnualExpense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<AnnualExpense | null>(null);

  // Form state
  const [formYear, setFormYear] = useState<number>(currentYear);
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expenseNotes, setExpenseNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Today's Bengali Date
  const todayBengali = useMemo(() => getBengaliDate(), []);

  // Helper to format fiscal year label consistently (e.g. 2026 -> '২০২৬-২০২৭')
  const getFiscalYearLabel = (yr: number) => {
    if (yr === 2026) return '২০২৬-২০২৭';
    return `${toBengaliNumber(yr)}-${toBengaliNumber(yr + 1)}`;
  };

  // Available years that have expenses, plus currentYear and selectedYear
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    yearsSet.add(selectedExpenseYear);
    annualExpenses.forEach((e) => {
      const y = Number(e.year);
      if (!isNaN(y) && y >= 2020 && y <= 2099) {
        yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [annualExpenses, currentYear, selectedExpenseYear]);

  // Expenses for the selected year
  const selectedYearExpenses = useMemo(() => {
    return annualExpenses
      .filter((e) => Number(e.year) === selectedExpenseYear)
      .sort((a, b) => {
        if (a.date && b.date && a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [annualExpenses, selectedExpenseYear]);

  // Total annual expense for the selected year (dynamic sum of all records)
  const totalSelectedYearExpense = useMemo(() => {
    return selectedYearExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [selectedYearExpenses]);

  // Current year expenses for the top net remaining fund card
  const currentYearExpenses = useMemo(() => {
    return annualExpenses.filter((e) => Number(e.year) === currentYear);
  }, [annualExpenses, currentYear]);

  const totalCurrentYearExpense = useMemo(() => {
    return currentYearExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [currentYearExpenses]);

  // A. Total dynamic calculations
  // 1. Total Fund collected across all members from their actual weekly records
  // Counts records that have been actually paid (paidAmount > 0 and paymentDate/paid status)
  // Ensures future unpaid placeholder records are never counted
  const totalFundCollected = useMemo(() => {
    return members.reduce((acc, m) => {
      const memberPaid = (m.weeklyRecords || []).reduce((sum, r) => {
        if (!r) return sum;
        const isPaid = (r.status === 'paid' || r.status === 'advance' || (Number(r.paidAmount) > 0 && Boolean(r.paymentDate)));
        if (!isPaid) return sum;
        const actualPaid = typeof r.paidAmount === 'number' ? (r.paidAmount === 200 ? 100 : r.paidAmount) : 0;
        return sum + actualPaid;
      }, 0);
      return acc + memberPaid;
    }, 0);
  }, [members]);

  // 2. This week deposited sum
  const thisWeekDeposited = useMemo(() => {
    return members.reduce((acc, m) => {
      const rec = m.weeklyRecords?.find(
        (r) => r && r.weekNumber === settings.currentWeek
      );
      return acc + (rec?.paidAmount || 0);
    }, 0);
  }, [members, settings.currentWeek]);

  // 3. This week paid members count
  const thisWeekPaidCount = useMemo(() => {
    return members.filter((m) => {
      const rec = m.weeklyRecords?.find(
        (r) => r && r.weekNumber === settings.currentWeek
      );
      return (rec?.paidAmount || 0) > 0 && Boolean(rec?.paymentDate);
    }).length;
  }, [members, settings.currentWeek]);

  // 4. This week due / remaining
  const thisWeekDueAmount = useMemo(() => {
    return members.reduce((acc, m) => {
      const rec = m.weeklyRecords?.find(
        (r) => r && r.weekNumber === settings.currentWeek
      );
      const paid = rec?.paidAmount || 0;
      const target = rec?.targetAmount || settings.weeklyTarget || 100;
      return acc + Math.max(0, target - paid);
    }, 0);
  }, [members, settings.currentWeek, settings.weeklyTarget]);

  const thisWeekDueCount = members.length - thisWeekPaidCount;

  // 5. Net Available Fund = Total Fund - Current Year Total Annual Expenses
  const netRemainingFund = Math.max(0, totalFundCollected - totalCurrentYearExpense);

  // Helper date formatter: formats YYYY-MM-DD to DD/MM/YYYY with Bengali digits
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const clean = dateStr.trim();
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const [y, m, d] = parts;
        return `${toBengaliNumber(d.padStart(2, '0'))}/${toBengaliNumber(m.padStart(2, '0'))}/${toBengaliNumber(y)}`;
      } else if (parts[2].length === 4) {
        const [d, m, y] = parts;
        return `${toBengaliNumber(d.padStart(2, '0'))}/${toBengaliNumber(m.padStart(2, '0'))}/${toBengaliNumber(y)}`;
      }
    }
    return toBengaliNumber(clean);
  };

  // Handlers for Annual Expense Modal
  const handleOpenAddExpense = (presetYear?: number) => {
    if (!isAdmin) return;
    setEditingExpense(null);
    setFormYear(presetYear || selectedExpenseYear || currentYear);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditExpense = (expense: AnnualExpense) => {
    if (!isAdmin) return;
    setEditingExpense(expense);
    setFormYear(Number(expense.year) || currentYear);
    setExpenseAmount(String(expense.amount));
    setExpenseDescription(expense.description);
    setExpenseDate(expense.date || new Date().toISOString().split('T')[0]);
    setExpenseNotes(expense.notes || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setFormError('শুধুমাত্র অনুমোদিত অ্যাডমিন বার্ষিক ব্যয় যোগ বা পরিবর্তন করতে পারবেন।');
      return;
    }

    const numAmount = parseFloat(expenseAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('অনুগ্রহ করে সঠিক ব্যয়ের পরিমাণ লিখুন।');
      return;
    }

    if (!expenseDescription.trim()) {
      setFormError('অনুগ্রহ করে ব্যয়ের বিবরণ লিখুন।');
      return;
    }

    const y = Number(formYear);
    if (isNaN(y) || y < 2020 || y > 2099) {
      setFormError('অনুগ্রহ করে সঠিক অর্থবছর নির্বাচন করুন।');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: AnnualExpense = {
        id:
          editingExpense?.id ||
          `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        year: y,
        amount: numAmount,
        description: expenseDescription.trim(),
        date: expenseDate || new Date().toISOString().split('T')[0],
        notes: expenseNotes.trim() || undefined,
        recordedBy: editingExpense?.recordedBy || 'সংগঠন অ্যাডমিন',
        createdAt: editingExpense?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await onSaveAnnualExpense(payload);
      setSelectedExpenseYear(y);
      setModalOpen(false);
      setEditingExpense(null);
    } catch (err: any) {
      setFormError(err.message || 'ব্যয় সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmExpense || !onDeleteAnnualExpense) return;
    setIsDeleting(true);
    try {
      await onDeleteAnnualExpense(deleteConfirmExpense.id);
      setDeleteConfirmExpense(null);
    } catch (err: any) {
      alert(err.message || 'ব্যয় মুছে ফেলতে সমস্যা হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-24 font-sans">
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
        {/* ============================================================ */}
        {/* 1. Today's Date / Current Week / Total Week summary          */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-[#d6e8f6] shadow-xs">
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
            {/* আজকের তারিখ */}
            <div className="px-1 space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                আজকের তারিখ
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-800 leading-tight">
                {todayBengali}
              </p>
            </div>

            {/* চলতি সপ্তাহ */}
            <div className="px-1 space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                চলতি সপ্তাহ
              </span>
              <p className="text-xs sm:text-sm font-black text-emerald-800 leading-tight">
                সপ্তাহ {toBengaliNumber(settings.currentWeek)}
              </p>
            </div>

            {/* মোট সপ্তাহের সংখ্যা */}
            <div className="px-1 space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                মোট সপ্তাহ
              </span>
              <p className="text-xs sm:text-sm font-black text-sky-800 leading-tight">
                {toBengaliNumber(52)} সপ্তাহ
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. "সর্বমোট সংগ্রহ" green card                                */}
        {/* ============================================================ */}
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 rounded-2xl sm:rounded-3xl p-4 text-white shadow-md shadow-emerald-900/15 border border-emerald-600/30 space-y-2.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600/60 text-emerald-100 text-[11px] font-bold backdrop-blur-xs border border-emerald-500/40">
                <Wallet className="w-3.5 h-3.5" />
                <span>সর্বমোট সংগ্রহ</span>
              </span>
              <h2 className="text-base sm:text-lg font-bold text-emerald-50 mt-1">
                মোট ফান্ড জমা হয়েছে
              </h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
              <Building className="w-5 h-5 text-white" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatBengaliCurrency(totalFundCollected)}
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              সংগঠনের {toBengaliNumber(members.length)} জন সদস্যের চলতি সপ্তাহ পর্যন্ত প্রকৃত আদায়কৃত জমার যোগফল
            </p>
          </div>

          {/* Separation indicator: Fund vs Annual Expense */}
          {totalCurrentYearExpense > 0 && (
            <div className="pt-2 border-t border-emerald-600/50 flex items-center justify-between text-xs">
              <span className="text-emerald-200 font-medium">
                বার্ষিক ব্যয় বাদে নীট ফান্ড:
              </span>
              <span className="font-black text-white text-xs sm:text-sm bg-emerald-600/70 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                {formatBengaliCurrency(netRemainingFund)}
              </span>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 3. "সদস্যদের সাপ্তাহিক জমার সারাংশ" section                   */}
        {/* 4. Three summary cards: মোট সদস্য, এ সপ্তাহে জমা, এ সপ্তাহে বাকি */}
        {/* ============================================================ */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-600 px-1 uppercase tracking-wider">
            সদস্যদের সাপ্তাহিক জমার সারাংশ
          </h3>

          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {/* 1. মোট সদস্য */}
            <div className="bg-white rounded-2xl p-3 border border-[#d6e8f6] shadow-xs flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-slate-600 block">
                  মোট সদস্য
                </span>
                <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 leading-tight">
                  {toBengaliNumber(members.length)} জন
                </p>
              </div>
            </div>

            {/* 2. এ সপ্তাহে জমা */}
            <div className="bg-white rounded-2xl p-3 border border-[#d6e8f6] shadow-xs flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-emerald-900 block">
                  এ সপ্তাহে জমা
                </span>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 leading-tight">
                  {formatBengaliCurrency(thisWeekDeposited)}
                </p>
                <span className="text-[11px] font-bold text-slate-500 block mt-0.5">
                  {toBengaliNumber(thisWeekPaidCount)} জনের
                </span>
              </div>
            </div>

            {/* 3. এ সপ্তাহে বাকি */}
            <div className="bg-white rounded-2xl p-3 border border-[#d6e8f6] shadow-xs flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-rose-900 block">
                  এ সপ্তাহে বাকি
                </span>
                <p className="text-base sm:text-lg font-black text-rose-600 mt-0.5 leading-tight">
                  {formatBengaliCurrency(thisWeekDueAmount)}
                </p>
                <span className="text-[11px] font-bold text-slate-500 block mt-0.5">
                  {toBengaliNumber(thisWeekDueCount)} জনের
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. "বার্ষিক ব্যয় — ২০২৬-২০২৭" section/card                  */}
        {/* 6. Detailed annual expense records remain BELOW and scrollable */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs space-y-3.5 sm:space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">
                  বার্ষিক ব্যয় — {getFiscalYearLabel(selectedExpenseYear)}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {getFiscalYearLabel(selectedExpenseYear)} অর্থবছরের বার্ষিক ব্যয় ব্যবস্থাপনা ও হিসাব
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Year Switcher */}
              <div className="flex items-center bg-slate-100 rounded-xl px-2 py-1 border border-slate-200 text-xs font-bold text-slate-700">
                <span className="text-[11px] text-slate-500 mr-1.5 font-semibold">অর্থবছর:</span>
                <select
                  value={selectedExpenseYear}
                  onChange={(e) => setSelectedExpenseYear(Number(e.target.value))}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {getFiscalYearLabel(yr)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Expense Button (Admin only) - NO "বিস্তারিত দেখুন" button/link! */}
              {isAdmin && (
                <button
                  type="button"
                  id="add-annual-expense-btn"
                  onClick={() => handleOpenAddExpense(selectedExpenseYear)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>নতুন ব্যয় যোগ করুন</span>
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Total Banner for the Selected Year */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl p-3 sm:p-3.5 border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                মোট বার্ষিক ব্যয় ({getFiscalYearLabel(selectedExpenseYear)}):
              </span>
              <p className="text-xl sm:text-2xl font-black text-amber-950 mt-0.5">
                {formatBengaliCurrency(totalSelectedYearExpense)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold bg-amber-100/90 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300 inline-block">
                {toBengaliNumber(selectedYearExpenses.length)} টি খরচ
              </span>
            </div>
          </div>

          {/* 6. Detailed annual expense records - remain BELOW and scrollable */}
          {selectedYearExpenses.length > 0 ? (
            <div className="space-y-2.5">
              {selectedYearExpenses.map((exp) => (
                <div
                  key={exp.id}
                  id={`annual-expense-item-${exp.id}`}
                  className="bg-slate-50/90 hover:bg-slate-50 rounded-2xl p-3.5 border border-slate-200 transition-colors flex items-start justify-between gap-3"
                >
                  {/* Left: Description, Amount, Date, Notes */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {exp.description}
                    </h4>

                    <div className="text-base font-black text-amber-900">
                      {formatBengaliCurrency(exp.amount)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDisplayDate(exp.date)}</span>
                      </span>

                      {exp.notes && (
                        <span className="text-slate-400 italic truncate max-w-[200px] sm:max-w-xs">
                          • {exp.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions (Edit & Delete for Admin, View for Members) */}
                  {isAdmin ? (
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <button
                        type="button"
                        id={`edit-expense-btn-${exp.id}`}
                        onClick={() => handleOpenEditExpense(exp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="ব্যয় পরিবর্তন করুন"
                      >
                        <Edit3 className="w-3 h-3 text-amber-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        id={`delete-expense-btn-${exp.id}`}
                        onClick={() => setDeleteConfirmExpense(exp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="ব্যয় মুছে ফেলুন"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewingExpense(exp)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="বিবরণ দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* No Expenses in Selected Year */
            <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-100">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {getFiscalYearLabel(selectedExpenseYear)} অর্থবছরের জন্য কোনো ব্যয় নির্ধারিত নেই
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  id="add-annual-expense-empty-btn"
                  onClick={() => handleOpenAddExpense(selectedExpenseYear)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>নতুন ব্যয় যোগ করুন</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Other Years Overview (if records exist for other years) */}
        {availableYears.filter((y) => y !== selectedExpenseYear).length > 0 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 border border-[#d6e8f6] shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              অন্যান্য অর্থবছরের বার্ষিক ব্যয়
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {availableYears
                .filter((y) => y !== selectedExpenseYear)
                .map((yr) => {
                  const yrSum = annualExpenses
                    .filter((e) => Number(e.year) === yr)
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const count = annualExpenses.filter((e) => Number(e.year) === yr).length;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedExpenseYear(yr)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-slate-800">
                        অর্থবছর {getFiscalYearLabel(yr)}:
                      </span>
                      <span className="font-black text-amber-900">
                        {formatBengaliCurrency(yrSum)}
                      </span>
                      {count > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({toBengaliNumber(count)})
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* Modal: Add or Edit Annual Expense (Admin only)                */}
      {/* ============================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-[#d6e8f6] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingExpense ? 'ব্যয় পরিবর্তন করুন' : 'নতুন ব্যয় যোগ করুন'}
                </h3>
                <p className="text-xs font-bold text-amber-700">
                  অর্থবছর: {getFiscalYearLabel(formYear)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingExpense(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpenseSubmit} className="space-y-3.5">
              {/* Year (Editable / Switchable) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  অর্থবছর: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2099"
                  required
                  value={formYear}
                  onChange={(e) => setFormYear(parseInt(e.target.value, 10) || currentYear)}
                  className="w-full bg-white border border-[#d6e8f6] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ব্যয়ের পরিমাণ (টাকা): <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="যেমন: ১২০০"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-[#d6e8f6] rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ব্যয়ের বিবরণ: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: গাড়ি ভাড়া, অফিস খরচ, মাইক ভাড়া"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6e8f6] rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  তারিখ: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6e8f6] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  অতিরিক্ত নোট (ঐচ্ছিক):
                </label>
                <textarea
                  rows={2}
                  placeholder="ব্যয় সম্পর্কিত কোনো মন্তব্য থাকলে লিখুন..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6e8f6] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingExpense(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Modal: Delete Confirmation Dialog                             */}
      {/* ============================================================ */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-[#d6e8f6] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  ব্যয় মুছে ফেলুন
                </h3>
                <p className="text-xs text-slate-500">
                  আপনি কি এই ব্যয়টি মুছে ফেলতে চান?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">ব্যয়ের বিবরণ:</span>
                <span className="font-bold text-slate-900">{deleteConfirmExpense.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">পরিমাণ:</span>
                <span className="font-black text-rose-600 text-sm">
                  {formatBengaliCurrency(deleteConfirmExpense.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">তারিখ:</span>
                <span className="font-semibold text-slate-700">
                  {formatDisplayDate(deleteConfirmExpense.date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">অর্থবছর:</span>
                <span className="font-semibold text-slate-700">
                  {getFiscalYearLabel(deleteConfirmExpense.year)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-xl border border-amber-200/70">
              ⚠️ শুধুমাত্র এই ব্যয়ের রেকর্ডটি মুছে ফেলা হবে। সংগঠনের অন্য কোনো তথ্য বা সদস্য হিসাব পরিবর্তিত হবে না।
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>মুছে ফেলা হচ্ছে...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছে ফেলুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Modal: View Expense Details                                  */}
      {/* ============================================================ */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-[#d6e8f6] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                ব্যয়ের বিবরণ
              </h3>
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">অর্থবছর:</span>
                <span className="font-black text-slate-900">
                  {getFiscalYearLabel(viewingExpense.year)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">ব্যয়ের পরিমাণ:</span>
                <span className="font-black text-amber-800 text-sm">
                  {formatBengaliCurrency(viewingExpense.amount)}
                </span>
              </div>

              <div className="py-1.5 border-b border-slate-100 space-y-1">
                <span className="text-slate-500 font-bold block">ব্যয়ের বিবরণ:</span>
                <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                  {viewingExpense.description}
                </p>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">তারিখ:</span>
                <span className="font-semibold text-slate-800">
                  {formatDisplayDate(viewingExpense.date)}
                </span>
              </div>

              {viewingExpense.notes && (
                <div className="py-1.5 border-b border-slate-100 space-y-1">
                  <span className="text-slate-500 font-bold block">নোট:</span>
                  <p className="font-semibold text-slate-700 text-xs">
                    {viewingExpense.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-between py-1.5 text-[11px] text-slate-400">
                <span>লিপিবদ্ধকারী:</span>
                <span>{viewingExpense.recordedBy || 'সংগঠন অ্যাডমিন'}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
