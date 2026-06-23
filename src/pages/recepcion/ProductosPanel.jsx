import { useState, useMemo } from "react";
import { categorias as categoriasIniciales } from "../../mock/productos";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

// Función para formatear moneda
const COP = (v) => {
    if (v === undefined || v === null || isNaN(v)) return "$0";
    return "$" + Math.round(v).toLocaleString("es-CO");
};

export default function ProductosPanel() {
    const [categoriasList, setCategoriasList] = useState(categoriasIniciales);
    const [nuevaCategoria, setNuevaCategoria] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoEditando, setProductoEditando] = useState(null);
    const [soloStockBajo, setSoloStockBajo] = useState(false);

    // Estado para nuevo producto
    const [nuevoProducto, setNuevoProducto] = useState({
        nombre: "",
        codigo: "",
        precio: "",
        costo: "",
        stock: "",
        stockMinimo: "",
        categoriaId: ""
    });

    // Calcular estadísticas
    const totalProductos = useMemo(() => {
        return categoriasList.reduce((acc, cat) => acc + cat.productos.length, 0);
    }, [categoriasList]);

    const totalStock = useMemo(() => {
        return categoriasList.reduce((acc, cat) => {
            return acc + cat.productos.reduce((sum, p) => sum + p.stock, 0);
        }, 0);
    }, [categoriasList]);

    const productosBajoStock = useMemo(() => {
        return categoriasList.reduce((acc, cat) => {
            const bajos = cat.productos.filter(p => p.stock <= p.stockMinimo);
            return acc + bajos.length;
        }, 0);
    }, [categoriasList]);

    const valorInventario = useMemo(() => {
        return categoriasList.reduce((acc, cat) => {
            return acc + cat.productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
        }, 0);
    }, [categoriasList]);

    // Filtrar productos
    const productosFiltrados = useMemo(() => {
        let resultados = [];
        categoriasList.forEach(cat => {
            if (categoriaSeleccionada !== "todas" && cat.id !== parseInt(categoriaSeleccionada)) return;
            
            let productos = cat.productos.filter(p => {
                const busca = busqueda.toLowerCase();
                const coincide = p.nombre.toLowerCase().includes(busca) || p.codigo.toLowerCase().includes(busca);
                if (!coincide) return false;
                if (soloStockBajo) {
                    return p.stock <= p.stockMinimo;
                }
                return true;
            });
            
            if (productos.length > 0) {
                resultados.push({
                    ...cat,
                    productos: productos
                });
            }
        });
        return resultados;
    }, [categoriasList, busqueda, categoriaSeleccionada, soloStockBajo]);

    // Agregar categoría
    const agregarCategoria = () => {
        if (nuevaCategoria.trim()) {
            setCategoriasList([
                ...categoriasList,
                {
                    id: Date.now(),
                    nombre: nuevaCategoria.trim(),
                    productos: []
                }
            ]);
            setNuevaCategoria("");
        }
    };

    // Eliminar categoría
    const eliminarCategoria = (categoriaId) => {
        if (window.confirm("¿Eliminar esta categoría y todos sus productos?")) {
            setCategoriasList(categoriasList.filter(c => c.id !== categoriaId));
        }
    };

    // Abrir modal de nuevo producto
    const abrirModalProducto = (categoriaId = null) => {
        setProductoEditando(null);
        setNuevoProducto({
            nombre: "",
            codigo: "",
            precio: "",
            costo: "",
            stock: "",
            stockMinimo: "",
            categoriaId: categoriaId || ""
        });
        setModalAbierto(true);
    };

    // Abrir modal para editar producto
    const editarProducto = (categoriaId, producto) => {
        setProductoEditando({ categoriaId, productoId: producto.id });
        setNuevoProducto({
            nombre: producto.nombre,
            codigo: producto.codigo,
            precio: String(producto.precio),
            costo: String(producto.costo),
            stock: String(producto.stock),
            stockMinimo: String(producto.stockMinimo),
            categoriaId: categoriaId
        });
        setModalAbierto(true);
    };

    // Guardar producto (crear o editar)
    const guardarProducto = () => {
        if (!nuevoProducto.nombre.trim() || !nuevoProducto.categoriaId) {
            alert("Nombre y categoría son obligatorios");
            return;
        }

        const precio = parseInt(nuevoProducto.precio) || 0;
        const costo = parseInt(nuevoProducto.costo) || 0;
        const stock = parseInt(nuevoProducto.stock) || 0;
        const stockMinimo = parseInt(nuevoProducto.stockMinimo) || 0;

        if (productoEditando) {
            setCategoriasList(categoriasList.map(cat => {
                if (cat.id === parseInt(productoEditando.categoriaId)) {
                    return {
                        ...cat,
                        productos: cat.productos.map(p => {
                            if (p.id === productoEditando.productoId) {
                                return {
                                    ...p,
                                    nombre: nuevoProducto.nombre,
                                    codigo: nuevoProducto.codigo || p.codigo,
                                    precio,
                                    costo,
                                    stock,
                                    stockMinimo
                                };
                            }
                            return p;
                        })
                    };
                }
                return cat;
            }));
        } else {
            setCategoriasList(categoriasList.map(cat => {
                if (cat.id === parseInt(nuevoProducto.categoriaId)) {
                    return {
                        ...cat,
                        productos: [
                            ...cat.productos,
                            {
                                id: Date.now(),
                                nombre: nuevoProducto.nombre,
                                codigo: nuevoProducto.codigo || `PRO-${Date.now()}`,
                                precio,
                                costo,
                                stock,
                                stockMinimo
                            }
                        ]
                    };
                }
                return cat;
            }));
        }

        setModalAbierto(false);
        setProductoEditando(null);
        setNuevoProducto({
            nombre: "",
            codigo: "",
            precio: "",
            costo: "",
            stock: "",
            stockMinimo: "",
            categoriaId: ""
        });
    };

    // Eliminar producto
    const eliminarProducto = (categoriaId, productoId) => {
        if (window.confirm("¿Eliminar este producto?")) {
            setCategoriasList(categoriasList.map(cat => {
                if (cat.id === categoriaId) {
                    return {
                        ...cat,
                        productos: cat.productos.filter(p => p.id !== productoId)
                    };
                }
                return cat;
            }));
        }
    };

    // Actualizar stock rápido
    const actualizarStock = (categoriaId, productoId, nuevoStock) => {
        const stock = parseInt(nuevoStock);
        if (isNaN(stock) || stock < 0) return;
        
        setCategoriasList(categoriasList.map(cat => {
            if (cat.id === categoriaId) {
                return {
                    ...cat,
                    productos: cat.productos.map(p => {
                        if (p.id === productoId) {
                            return { ...p, stock };
                        }
                        return p;
                    })
                };
            }
            return cat;
        }));
    };

    // Resetear filtros
    const resetearFiltros = () => {
        setBusqueda("");
        setCategoriaSeleccionada("todas");
        setSoloStockBajo(false);
    };

    return (
        <div className="inventario-page-container">
            <Card 
                title="Inventario" 
                icon="📦" 
                className="inventario-card"
            >
                {/* Stats - Compactos */}
                <div className="inventario-stats">
                    <div className="stat-item">
                        <span className="stat-icon">📦</span>
                        <div className="stat-info">
                            <span className="stat-number">{totalProductos}</span>
                            <span className="stat-label">Productos</span>
                        </div>
                    </div>
                    <div className="stat-item">
                        <span className="stat-icon">📊</span>
                        <div className="stat-info">
                            <span className="stat-number">{totalStock}</span>
                            <span className="stat-label">Unidades</span>
                        </div>
                    </div>
                    <div className="stat-item stat-alerta">
                        <span className="stat-icon">⚠️</span>
                        <div className="stat-info">
                            <span className="stat-number" style={{ color: productosBajoStock > 0 ? '#ef4444' : '#10b981' }}>
                                {productosBajoStock}
                            </span>
                            <span className="stat-label">Stock bajo</span>
                        </div>
                    </div>
                    <div className="stat-item">
                        <span className="stat-icon">💰</span>
                        <div className="stat-info">
                            <span className="stat-number">{COP(valorInventario)}</span>
                            <span className="stat-label">Valor total</span>
                        </div>
                    </div>
                </div>

                {/* Toolbar - Compacto */}
                <div className="inventario-toolbar">
                    <div className="nueva-categoria">
                        <input
                            type="text"
                            placeholder="📁 Nueva categoría"
                            value={nuevaCategoria}
                            onChange={(e) => setNuevaCategoria(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
                        />
                        <Button onClick={agregarCategoria}>➕ Agregar</Button>
                    </div>
                    <Button variant="primary" onClick={() => abrirModalProducto()}>
                        ➕ Nuevo Producto
                    </Button>
                </div>

                {/* Filtros - Compacto */}
                <div className="inventario-filtros">
                    <div className="filtro-busqueda">
                        <span className="filtro-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button className="filtro-limpiar" onClick={() => setBusqueda('')}>✕</button>
                        )}
                    </div>
                    <div className="filtro-categoria">
                        <select
                            value={categoriaSeleccionada}
                            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                        >
                            <option value="todas">📂 Todas</option>
                            {categoriasList.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    📁 {cat.nombre} ({cat.productos.length})
                                </option>
                            ))}
                        </select>
                        <label className="filtro-stock-bajo">
                            <input
                                type="checkbox"
                                checked={soloStockBajo}
                                onChange={(e) => setSoloStockBajo(e.target.checked)}
                            />
                            Stock bajo
                        </label>
                        {(busqueda || categoriaSeleccionada !== "todas" || soloStockBajo) && (
                            <button className="filtro-reset" onClick={resetearFiltros}>
                                🔄 Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Contenedor con scroll SOLO para los productos */}
                <div className="categorias-scroll-container">
                    <div className="categorias-container categorias-lista">
                        {productosFiltrados.length === 0 ? (
                            <div className="inventario-vacio">
                                <span className="vacio-icon">🔍</span>
                                <p>No se encontraron productos</p>
                                <span className="vacio-sub">Prueba ajustando los filtros</span>
                            </div>
                        ) : (
                            productosFiltrados.map((categoria) => (
                                <div key={categoria.id} className="categoria-section">
                                    <div className="categoria-header">
                                        <h4 className="categoria-titulo">📂 {categoria.nombre}</h4>
                                        <div className="categoria-acciones">
                                            <span className="categoria-count">{categoria.productos.length}</span>
                                            <button 
                                                className="categoria-btn-add"
                                                onClick={() => abrirModalProducto(categoria.id)}
                                                title="Agregar producto"
                                            >
                                                ➕
                                            </button>
                                            <button 
                                                className="categoria-btn-delete"
                                                onClick={() => eliminarCategoria(categoria.id)}
                                                title="Eliminar categoría"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    <div className="productos-grid-completo">
                                        {categoria.productos.map((producto) => {
                                            const stockBajo = producto.stock <= producto.stockMinimo;
                                            const stockPorcentaje = Math.min((producto.stock / producto.stockMinimo) * 100, 100);
                                            
                                            return (
                                                <div key={producto.id} className={`producto-card-completo ${stockBajo ? 'stock-bajo-card' : ''}`}>
                                                    <div className="producto-card-header">
                                                        <div className="producto-info-principal">
                                                            <span className="producto-nombre-completo">{producto.nombre}</span>
                                                            <span className="producto-codigo-completo">{producto.codigo}</span>
                                                        </div>
                                                        <div className="producto-acciones-rapidas">
                                                            <button 
                                                                className="btn-editar-rapido"
                                                                onClick={() => editarProducto(categoria.id, producto)}
                                                                title="Editar"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className="btn-eliminar-rapido"
                                                                onClick={() => eliminarProducto(categoria.id, producto.id)}
                                                                title="Eliminar"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="producto-card-body">
                                                        <div className="producto-precios">
                                                            <div className="precio-venta">
                                                                <span className="precio-label">Precio</span>
                                                                <span className="precio-valor">{COP(producto.precio)}</span>
                                                            </div>
                                                            <div className="precio-costo">
                                                                <span className="precio-label">Costo</span>
                                                                <span className="precio-valor">{COP(producto.costo)}</span>
                                                            </div>
                                                            <div className="precio-ganancia">
                                                                <span className="precio-label">Ganancia</span>
                                                                <span className="precio-valor" style={{ color: '#10b981' }}>
                                                                    {COP(producto.precio - producto.costo)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="producto-stock-completo">
                                                            <div className="stock-control-completo">
                                                                <button 
                                                                    className="stock-btn-completo"
                                                                    onClick={() => actualizarStock(categoria.id, producto.id, producto.stock - 1)}
                                                                    disabled={producto.stock <= 0}
                                                                >
                                                                    −
                                                                </button>
                                                                <span className={`stock-numero ${stockBajo ? 'stock-bajo' : ''}`}>
                                                                    {producto.stock}
                                                                </span>
                                                                <button 
                                                                    className="stock-btn-completo"
                                                                    onClick={() => actualizarStock(categoria.id, producto.id, producto.stock + 1)}
                                                                >
                                                                    +
                                                                </button>
                                                                <span className="stock-minimo-label">
                                                                    Min: {producto.stockMinimo}
                                                                </span>
                                                            </div>
                                                            <div className="stock-bar-completo-bg">
                                                                <div 
                                                                    className={`stock-bar-completo ${stockBajo ? 'stock-bar-bajo' : ''}`}
                                                                    style={{ width: `${Math.min(stockPorcentaje, 100)}%` }}
                                                                />
                                                            </div>
                                                            {stockBajo && (
                                                                <div className="stock-alerta-completo">
                                                                    ⚠️ ¡Stock crítico! Quedan {producto.stock} unidades
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Card>

            {/* Modal de Producto */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-card modal-producto" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setModalAbierto(false)}>✕</button>
                        
                        <div className="modal-header-form">
                            <div className="modal-header-icon">
                                {productoEditando ? '✏️' : '➕'}
                            </div>
                            <div>
                                <h3 className="modal-titulo">
                                    {productoEditando ? "Editar Producto" : "Nuevo Producto"}
                                </h3>
                                <p className="modal-subtitulo">
                                    {productoEditando ? "Actualiza la información" : "Ingresa los datos del nuevo producto"}
                                </p>
                            </div>
                        </div>

                        <div className="modal-form-grid">
                            <div className="modal-campo modal-campo-full">
                                <label>
                                    <span className="campo-label">Nombre del producto</span>
                                    <span className="campo-obligatorio">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={nuevoProducto.nombre}
                                    onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                                    placeholder="Ej: Proteína Whey 2 lb"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Código</span>
                                </label>
                                <input
                                    type="text"
                                    value={nuevoProducto.codigo}
                                    onChange={(e) => setNuevoProducto({...nuevoProducto, codigo: e.target.value})}
                                    placeholder="Ej: PRO-001"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Categoría</span>
                                    <span className="campo-obligatorio">*</span>
                                </label>
                                <select
                                    value={nuevoProducto.categoriaId}
                                    onChange={(e) => setNuevoProducto({...nuevoProducto, categoriaId: e.target.value})}
                                    className="campo-input"
                                >
                                    <option value="">Seleccionar</option>
                                    {categoriasList.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Precio ($)</span>
                                </label>
                                <input
                                    type="number"
                                    value={nuevoProducto.precio}
                                    onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                                    placeholder="0"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Costo ($)</span>
                                </label>
                                <input
                                    type="number"
                                    value={nuevoProducto.costo}
                                    onChange={(e) => setNuevoProducto({...nuevoProducto, costo: e.target.value})}
                                    placeholder="0"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Stock actual</span>
                                </label>
                                <input
                                    type="number"
                                    value={nuevoProducto.stock}
                                    onChange={(e) => setNuevoProducto({...nuevoProducto, stock: e.target.value})}
                                    placeholder="0"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Stock mínimo</span>
                                </label>
                                <input
                                    type="number"
                                    value={nuevoProducto.stockMinimo}
                                    onChange={(e) => setNuevoProducto({...nuevoProducto, stockMinimo: e.target.value})}
                                    placeholder="5"
                                    className="campo-input"
                                />
                            </div>
                        </div>

                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={() => setModalAbierto(false)}>
                                Cancelar
                            </button>
                            <Button variant="primary" onClick={guardarProducto}>
                                {productoEditando ? "💾 Guardar" : "✅ Crear"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}