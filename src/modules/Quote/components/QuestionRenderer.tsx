import { useRef } from "react";
import type { ReactNode } from "react";
import { RadioCard } from "@/shared/components/RadioCard";
import { Toggle } from "@/shared/components/Toggle";
import { TextInput } from "@/shared/components/TextInput";
import { TextArea } from "@/shared/components/TextArea";
import { Icon } from "@/shared/components/Icon";
import { InfoBox } from "@/shared/components/InfoBox";
import { BRAND, RED } from "@/shared/constants";
import { fmtDate, formatDate, toMdY } from "@/shared/utils/dateHelpers";
import {
  isYesNoQuestionType,
  normalizeQuestionType,
  sortedOptions,
} from "@/modules/Quote/api/questionsApi";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const DATE_ICON_ZONE = 42;

/**
 * `DATE_PICKER` answer field — a typed MM/DD/YYYY box plus the OS-native
 * picker, the same pattern the landing page's effective-date field uses:
 * rather than call `showPicker()` on a hidden input (unsupported on iOS
 * Safari, flaky on Android), a real transparent `<input type="date">` is
 * overlaid on the calendar-icon zone, so tapping the icon IS tapping the date
 * input. The answer is stored as MM/DD/YYYY text — the shape
 * `buildFullGroupSavePayload` / `buildOptionImpactsPayload` send to `ins`.
 */
function DateAnswerInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const dateRef = useRef<HTMLInputElement>(null);
  // Saved answers can come back ISO; anything mid-typing stays as typed.
  const text = ISO_DATE_RE.test(value) ? toMdY(value) : value;
  const iso = (() => {
    const complete = fmtDate(text); // "" until all 8 digits are present
    if (!complete) return "";
    const [mm, dd, yyyy] = complete.split("/");
    return `${yyyy}-${mm}-${dd}`;
  })();

  return (
    <div style={{ position: "relative" }}>
      <TextInput
        value={text}
        onChange={(v) => onChange(formatDate(v))}
        placeholder="MM/DD/YYYY"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        aria-label={label}
        style={{ paddingRight: DATE_ICON_ZONE }}
      />
      {/* Calendar glyph — visual only, sits behind the transparent overlay. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          right: 12,
          transform: "translateY(-50%)",
          display: "inline-flex",
          pointerEvents: "none",
        }}
      >
        <Icon
          size={18}
          d={
            <>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </>
          }
        />
      </span>
      <input
        ref={dateRef}
        type="date"
        value={iso}
        aria-label={label ? `Open date picker for ${label}` : "Open date picker"}
        onChange={(e) => onChange(toMdY(e.target.value))}
        onClick={() => {
          const el = dateRef.current;
          if (el && typeof el.showPicker === "function") {
            try {
              el.showPicker();
            } catch {
              /* already opening via the native tap */
            }
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: DATE_ICON_ZONE,
          margin: 0,
          padding: 0,
          border: 0,
          background: "transparent",
          color: "transparent",
          opacity: 0,
          cursor: "pointer",
          WebkitAppearance: "none",
          appearance: "none",
        }}
      />
    </div>
  );
}

/**
 * One generic, reusable question row — RADIO_BUTTON/YES_NO/CHECKBOX/
 * TEXTBOX/TEXT_AREA/NUMBER_INPUT/DATE_PICKER — shared across every
 * tree-driven page in this app (PracticeDetailsPage, LicenseScopePage,
 * UnderwritingPage).
 *
 * Every type in `FREE_TEXT_QUESTION_TYPES` must have a branch here: the data
 * layer (hydrate / required-check / save payload) already treats all four as
 * one text answer on the question's first option, so a type missing from this
 * switch renders as a label with no field and can never be answered.
 *
 * Q2BNfy hand-rolls this same switch per-page rather than sharing a
 * component; this app needs the identical pattern on every question page,
 * so one shared component is the better call here — same rendering logic,
 * not a new abstraction.
 *
 */
interface QuestionRendererProps {
  question: any;
  answer?: string | string[];
  onSetRadio: (question: any, optionId: string | number) => void;
  onToggleCheckbox: (question: any, optionId: string | number) => void;
  onSetText: (question: any, value: string) => void;
  note?: ReactNode;
  /**
   * Draw single-choice AND checkbox options as compact label pills that sit
   * side by side and wrap (UnderwritingPage's layout) instead of stacked
   * full-width cards / toggles — saves vertical space. Selection is shown in
   * the brand colour only; no per-option or row highlight.
   */
  inlineOptions?: boolean;
}

export function QuestionRenderer({
  question: q,
  answer,
  onSetRadio,
  onToggleCheckbox,
  onSetText,
  note,
  inlineOptions = false,
}: QuestionRendererProps) {
  const opts = sortedOptions(q.options);
  const qType = normalizeQuestionType(q.questionType);
  const isSingle = isYesNoQuestionType(q.questionType);
  const isNumber = qType === "NUMBER_INPUT";
  const isCheckbox = qType === "CHECKBOX";
  const checked: string[] = Array.isArray(answer) ? answer : [];
  const questionLabel = typeof q.questionText === "string" ? q.questionText : undefined;

  return (
    <div style={{ marginBottom: 12 }}>
      {/* The question in the sentence case `ins` supplies — same treatment as
          UnderwritingPage's questions. Not `SectionTitle`: that's the small
          uppercase eyebrow for short section headers ("About you"), and it
          turned whole question sentences into hard-to-read capitals. */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#333",
          lineHeight: 1.45,
          marginTop: 4,
          marginBottom: 8,
          fontFamily: "var(--font-body)",
        }}
      >
        {q.questionText}
        {q.isRequired && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
      </div>
      {q.questionDescription && (
        <div style={{ fontSize: 11, color: "#595959", marginTop: -6, marginBottom: 8 }}>
          {q.questionDescription}
        </div>
      )}

      {(isSingle || isCheckbox) && inlineOptions && (
        <div
          role="group"
          aria-label={questionLabel}
          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {opts.map((o) => {
            const sel = isCheckbox
              ? checked.includes(String(o.id))
              : String(answer) === String(o.id);
            return (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  maxWidth: "100%",
                }}
              >
                <button
                  type="button"
                  aria-pressed={sel}
                  onClick={() => (isCheckbox ? onToggleCheckbox(q, o.id) : onSetRadio(q, o.id))}
                  style={{
                    padding: "6px 14px",
                    minWidth: 60,
                    maxWidth: "100%",
                    textAlign: "center",
                    lineHeight: 1.4,
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    border: "none",
                    background: sel ? BRAND : "#e8e8e6",
                    color: sel ? "#fff" : "#595959",
                    transition: "all 0.15s",
                  }}
                >
                  {o.optionLabel}
                </button>
                {o.optionDescription && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#595959",
                      lineHeight: 1.4,
                      paddingLeft: 2,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {o.optionDescription}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isSingle &&
        !inlineOptions &&
        opts.map((o) => (
          <RadioCard
            key={o.id}
            selected={String(answer) === String(o.id)}
            onClick={() => onSetRadio(q, o.id)}
            title={o.optionLabel}
            subtitle={o.optionDescription || null}
          />
        ))}

      {isCheckbox &&
        !inlineOptions &&
        opts.map((o) => {
          const cur = Array.isArray(answer) ? answer : [];
          return (
            <Toggle
              key={o.id}
              value={cur.includes(String(o.id))}
              onChange={() => onToggleCheckbox(q, o.id)}
              label={o.optionLabel}
              description={o.optionDescription || null}
            />
          );
        })}

      {(qType === "TEXTBOX" || isNumber) && (
        <TextInput
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onSetText(q, isNumber ? v.replace(/\D/g, "") : v)}
          placeholder={opts[0]?.optionLabel || ""}
          inputMode={isNumber ? "numeric" : undefined}
          aria-label={questionLabel}
        />
      )}

      {qType === "TEXT_AREA" && (
        <TextArea
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onSetText(q, v)}
          placeholder={opts[0]?.optionLabel || ""}
          aria-label={questionLabel}
        />
      )}

      {qType === "DATE_PICKER" && (
        <DateAnswerInput
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onSetText(q, v)}
          label={questionLabel}
        />
      )}

      {note && (
        <div style={{ marginTop: 8 }}>
          <InfoBox color="orange">{note}</InfoBox>
        </div>
      )}
    </div>
  );
}
