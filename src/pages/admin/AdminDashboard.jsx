import useAuthStore from "../../store/authStore";

export default function AdminDashboard() {

    const usuario = useAuthStore(
        state => state.usuario
    );

    return (
        <div>

            <h1>
                Panel Administrativo
            </h1>

            <h2>
                Bienvenido {usuario.nombre}
            </h2>

            <p>
                Rol: {usuario.rol}
            </p>

        </div>
    );
}