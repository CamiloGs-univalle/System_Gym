export default function Button({ 
  children, 
  onClick, 
  variant = "primary", 
  className = "",
  disabled = false 
}) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    success: "btn-success",
    danger: "btn-danger",
    warning: "btn-warning"
  };

  return (
    <button
      className={`btn ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}