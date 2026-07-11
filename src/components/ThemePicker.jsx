import { memo } from "react";
import { THEME_GROUPS, THEME_OPTIONS, THEME_PREVIEW_COLORS } from "../lib/constants";
import CollapsibleSection from "./CollapsibleSection";

const ThemePicker = memo(function ThemePicker({ value, onChange, t }) {
  return THEME_GROUPS.map((group) => (
    <CollapsibleSection key={group.value} title={group.label} hint={t("setup.themeGroupCount", { count: THEME_OPTIONS.filter((th) => th.group === group.value).length })}>
      <div className="theme-picker__grid">
        {THEME_OPTIONS.filter((th) => th.group === group.value).map((theme) => {
          const colors = THEME_PREVIEW_COLORS[theme.value];
          return (
            <button
              key={theme.value}
              type="button"
              className={`theme-picker__card ${value === theme.value ? "theme-picker__card--active" : ""}`}
              onClick={() => onChange(theme.value)}
              aria-pressed={value === theme.value}
            >
              <span
                className="theme-picker__swatch"
                style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 50%, ${colors.accent} 100%)` }}
              >
                <span className="theme-picker__dot" style={{ background: colors.accent }} />
              </span>
              <span className="theme-picker__info">
                <span className="theme-picker__name">{theme.label}</span>
                <span className="theme-picker__hint">{theme.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </CollapsibleSection>
  ));
});

export default ThemePicker;
