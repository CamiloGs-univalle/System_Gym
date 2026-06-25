// ============================================
// QUICK ACTIONS - Acciones rápidas
// ============================================
export default function QuickActions({ actions }) {
    return (
        <div className="quick-actions">
            {actions.map((action, index) => (
                <button 
                    key={index}
                    className="quick-action-btn"
                    onClick={action.onClick}
                >
                    <span className="quick-action-icon">{action.icon}</span>
                    <span className="quick-action-label">{action.label}</span>
                </button>
            ))}
        </div>
    );
}