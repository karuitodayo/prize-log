import "./AmountInput.css";

interface AmountInputProps {
  value: number | "";
  onChange: (value: number | "") => void;
  label?: string;
  steps?: number[];
}

export function AmountInput({
  value,
  onChange,
  label,
  steps = [100, 200, 500, 1000],
}: AmountInputProps) {
  const handleStep = (step: number) => {
    const current = typeof value === "number" ? value : 0;
    onChange(current + step);
  };

  const handleDirectInput = (raw: string) => {
    if (raw === "") {
      onChange("");
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      onChange(Math.floor(n));
    }
  };

  return (
    <div className="amount-input">
      {label && <label className="field-label">{label}</label>}
      <div className="amount-field-row">
        <input
          className="amount-field"
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => handleDirectInput(e.target.value)}
          placeholder="0"
        />
        <span className="amount-field-suffix">円</span>
      </div>
      <div className="amount-step-row">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            className="amount-step-btn"
            onClick={() => handleStep(s)}
          >
            +{s.toLocaleString("ja-JP")}
          </button>
        ))}
      </div>
    </div>
  );
}
