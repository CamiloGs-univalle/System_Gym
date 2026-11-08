import Button from "../ui/Button";
import "./LogoutConfirmModal.css";

export default function LogoutConfirmModal({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="logout-modal-overlay" onClick={onCancel}>
      <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="logout-modal-titulo">🚪 ¿Cerrar sesión?</h3>
        <p className="logout-modal-texto">
          Se cerrará la sesión actual del sistema. Podrá volver a ingresar con sus credenciales.
        </p>
        <div className="logout-modal-acciones">
          <Button variant="danger" onClick={onConfirm}>
            Sí, salir
          </Button>
          <button className="btn-cancelar" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}