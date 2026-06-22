export default function Card({ children, title, icon, className = "" }) {
    return (
        <div className={`card ${className}`}>
            {title && (
                <div className="card-header">
                    {icon && <span className="card-icon">{icon}</span>}
                    <h3>{title}</h3>
                </div>
            )}
            <div className="card-body">
                {children}
            </div>
        </div>
    );
}