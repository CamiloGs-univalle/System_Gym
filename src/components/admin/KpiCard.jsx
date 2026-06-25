// ============================================
// KPI CARD - Tarjeta de indicadores
// ============================================
import { COP } from "../../utils/formatters";

export default function KpiCard({ 
    icon, 
    value, 
    label, 
    subtitle, 
    trend, 
    trendValue,
    color = "#3b82f6",
    bg = "#eff6ff",
    onClick 
}) {
    const isCurrency = typeof value === "string" && value.startsWith("$");
    const displayValue = isCurrency ? value : value;

    return (
        <div 
            className="kpi-card"
            onClick={onClick}
            style={{ 
                cursor: onClick ? "pointer" : "default",
                borderLeft: `4px solid ${color}` 
            }}
        >
            <div className="kpi-card-icon" style={{ background: bg, color }}>
                {icon}
            </div>
            <div className="kpi-card-info">
                <span className="kpi-card-value">{displayValue}</span>
                <span className="kpi-card-label">{label}</span>
                {subtitle && <span className="kpi-card-subtitle">{subtitle}</span>}
                {trend && (
                    <span className={`kpi-card-trend ${trend === "up" ? "trend-up" : "trend-down"}`}>
                        {trend === "up" ? "↑" : "↓"} {trendValue}
                    </span>
                )}
            </div>
        </div>
    );
}