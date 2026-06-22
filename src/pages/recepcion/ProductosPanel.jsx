import { useState } from "react";
import { categorias } from "../../mock/productos";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function ProductosPanel() {
  const [categoriasList, setCategoriasList] = useState(categorias);
  const [nuevaCategoria, setNuevaCategoria] = useState("");

  const agregarCategoria = () => {
    if (nuevaCategoria.trim()) {
      setCategoriasList([
        ...categoriasList,
        {
          id: Date.now(),
          nombre: nuevaCategoria,
          productos: []
        }
      ]);
      setNuevaCategoria("");
    }
  };

  return (
    <Card title="Inventario" icon="📦">
      <div className="inventario-toolbar">
        <div className="nueva-categoria">
          <input
            type="text"
            placeholder="📁 Nueva categoría"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
          />
          <Button onClick={agregarCategoria}>➕ Agregar</Button>
        </div>
        <Button variant="primary">➕ Nuevo Producto</Button>
      </div>

      <div className="categorias-container categorias-lista">
        {categoriasList.map((categoria) => (
          <div key={categoria.id} className="categoria-section">
            <h4 className="categoria-titulo">📂 {categoria.nombre}</h4>
            <div className="productos-mini-grid">
              {categoria.productos.map((producto) => (
                <div key={producto.id} className="producto-mini-card">
                  <span className="producto-mini-nombre">{producto.nombre}</span>
                  <span className="producto-mini-precio">
                    ${producto.precio.toLocaleString()}
                  </span>
                  <span
                    className={`producto-mini-stock ${
                      producto.stock <= producto.stockMinimo ? "stock-bajo" : ""
                    }`}
                  >
                    Stock: {producto.stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}