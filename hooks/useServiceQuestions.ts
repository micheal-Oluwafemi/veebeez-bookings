"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCartItem } from "@/lib/booking/cart";
import type { CartAnswer, CartContext, Option, Question, ServiceDetail, ServiceListItem } from "@/types/booking";

export function useServiceQuestions(
  detail: ServiceDetail | undefined,
  service: ServiceListItem,
  context: CartContext,
  onConfirm: (item: ReturnType<typeof buildCartItem>) => void,
) {
  const validQuestions = useMemo(() => {
    if (!detail?.questions) return [];
    return detail.questions.filter((q) => q.prompt && Array.isArray(q.options) && q.options.length > 0);
  }, [detail]);

  const hasQuestions = detail ? validQuestions.length > 0 : !!service.has_questions;

  const [phase, setPhase] = useState<"details" | "questions">("details");
  const [queue, setQueue] = useState<Question[]>([]);
  const [history, setHistory] = useState<Array<{ question: Question; option: Option }>>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  // Keep queue in sync with fetched detail
  useEffect(() => {
    if (detail) {
      setQueue(validQuestions);
      setHistory([]);
      setSelectedOptionId(null);
      setPhase("details");
    }
  }, [detail, validQuestions]);

  const currentQuestion = queue[0] ?? null;

  const runningExtra = useMemo(() => {
    const histExtra = history.reduce((t, h) => t + (h.option.extra_cost ?? 0), 0);
    const pendingOpt = currentQuestion?.options.find((o) => o.option_id === selectedOptionId);
    return histExtra + (selectedOptionId ? (pendingOpt?.extra_cost ?? 0) : 0);
  }, [history, currentQuestion, selectedOptionId]);

  const histExtraOnly = useMemo(() => history.reduce((t, h) => t + (h.option.extra_cost ?? 0), 0), [history]);

  const priceNumber = useMemo(() => {
    const raw = detail ? detail.price : service.price;
    return typeof raw === "string" ? Number(raw) : (raw as number);
  }, [detail, service.price]);

  const currentTotal = priceNumber + runningExtra;
  const committedTotal = priceNumber + histExtraOnly;

  const totalQuestions = history.length + queue.length;
  const currentStep = history.length + 1;
  const showProgress = totalQuestions > 1;
  const isLast = queue.length === 1;
  const canGoNext = selectedOptionId !== null;
  const canGoPrev = history.length > 0;
  const isSingleToggle = currentQuestion?.options.length === 1 && currentQuestion !== null && !currentQuestion.is_required;
  const effectiveDetail: ServiceDetail | null = detail ?? null;

  const handleSelect = (id: number) => {
    if (isSingleToggle) setSelectedOptionId((prev) => (prev === id ? null : id));
    else setSelectedOptionId(id);
  };

  const handleNext = () => {
    if (!currentQuestion || selectedOptionId === null || !effectiveDetail) return;
    const opt = currentQuestion.options.find((o) => o.option_id === selectedOptionId);
    if (!opt) return;
    const newHistory = [...history, { question: currentQuestion, option: opt }];
    const remaining = queue.slice(1);
    const newQueue = opt.follow_up_question ? [opt.follow_up_question, ...remaining] : remaining;
    if (newQueue.length === 0) {
      const answers: CartAnswer[] = newHistory.map((h) => ({
        option_id: h.option.option_id,
        label: h.option.label,
        value: h.option.value,
        extra_cost: h.option.extra_cost,
      }));
      onConfirm(buildCartItem(effectiveDetail, answers, context));
      return;
    }
    setHistory(newHistory);
    setQueue(newQueue);
    setSelectedOptionId(null);
  };

  const handlePrevious = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    let newQueue = [...queue];
    if (last.option.follow_up_question && newQueue[0]?.question_id === last.option.follow_up_question.question_id)
      newQueue = newQueue.slice(1);
    newQueue = [last.question, ...newQueue];
    setHistory(newHistory);
    setQueue(newQueue);
    setSelectedOptionId(last.option.option_id);
  };

  const reset = () => {
    setPhase("details");
    setHistory([]);
    setQueue(validQuestions);
    setSelectedOptionId(null);
  };

  return {
    detail,
    validQuestions,
    hasQuestions,
    phase,
    setPhase,
    queue,
    history,
    selectedOptionId,
    setSelectedOptionId,
    currentQuestion,
    runningExtra,
    histExtraOnly,
    priceNumber,
    currentTotal,
    committedTotal,
    totalQuestions,
    currentStep,
    showProgress,
    isLast,
    canGoNext,
    canGoPrev,
    isSingleToggle,
    effectiveDetail,
    handleSelect,
    handleNext,
    handlePrevious,
    reset,
    initialQueue: validQuestions,
  };
}
