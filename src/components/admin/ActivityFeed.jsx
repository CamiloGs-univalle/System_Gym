// ============================================
// ACTIVITY FEED - Feed de actividad
// ============================================
import { formatDateTime } from "../../utils/formatters";

export default function ActivityFeed({ activities }) {
    if (!activities || activities.length === 0) {
        return (
            <div className="activity-empty">
                <span>📭</span>
                <p>No hay actividad reciente</p>
            </div>
        );
    }

    return (
        <div className="activity-feed">
            {activities.map((item, index) => (
                <div key={index} className="activity-item">
                    <div className="activity-icon" style={{ background: item.color || "#e2e8f0" }}>
                        {item.icon}
                    </div>
                    <div className="activity-content">
                        <p className="activity-text">{item.text}</p>
                        <span className="activity-time">{formatDateTime(item.timestamp)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}