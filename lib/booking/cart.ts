import type {
  CartAnswer,
  CartContext,
  CartLineItem,
  Option,
  Question,
  ServiceDetail,
  ServiceListItem,
} from "@/types/booking";

function toNumber(price: number | string): number {
  if (typeof price === "number") return price;
  return Number(price);
}

export function buildCartItem(
  service: ServiceDetail | ServiceListItem,
  answers: CartAnswer[],
  context: CartContext,
): CartLineItem {
  const unitPrice = toNumber(service.price);
  const extraCost = answers.reduce((total, a) => total + (a.extra_cost ?? 0), 0);

  return {
    service_id: service.service_id,
    service_slug: service.slug,
    service_name: service.name,
    quantity: 1, // API supports quantity >1 but UI is single-select today
    unit_price: unitPrice,
    currency: service.currency,
    duration_minutes: service.duration_minutes,
    category_id: context.categoryId,
    category_name: context.categoryName,
    collection_id: context.collectionId,
    collection_name: context.collectionName,
    answers,
    stylist_id: null,
    scheduled_at: null,
  };
}

export function recordAnswer(question: Question, optionId: number) {
  const selected = question.options.find((o) => o.option_id === optionId);
  if (!selected) return null;

  const answered: CartAnswer = {
    option_id: selected.option_id,
    label: selected.label,
    value: selected.value,
    extra_cost: selected.extra_cost,
  };

  return {
    answered,
    nextQuestion: selected.follow_up_question ?? null,
  };
}

export function computeCartTotals(cart: CartLineItem[]) {
  const subtotal = cart.reduce(
    (total, item) =>
      total + item.unit_price + item.answers.reduce((s, a) => s + (a.extra_cost ?? 0), 0),
    0,
  );
  const totalDurationMinutes = cart.reduce((total, item) => total + item.duration_minutes, 0);
  // NOTE: totalDurationMinutes is for display only ("3 services, 2h total").
  // Do NOT use it to size per-service calendar slots — each service's
  // availability query + slot generation uses its own duration_minutes.
  return {
    subtotal,
    totalDurationMinutes,
    hasDeposit: false,
  };
}
