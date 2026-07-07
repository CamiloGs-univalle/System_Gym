// src/pages/admin/ProductosPanel.jsx
/**
 * Panel de Administración de Inventario
 * 
 * Este componente permite gestionar categorías y productos del gimnasio.
 * Se conecta al backend a través del servicio productosService.
 * 
 * @component
 * @returns {JSX.Element} Panel de inventario completo
 */

// Importaciones de React
import React, { useState, useEffect, useMemo } from 'react';

// Importaciones de componentes UI
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

// Importación del servicio para conectar con el backend
import { productosService } from '../../services/productosService';

/**
 * Función para formatear valores monetarios en pesos colombianos (COP)
 * 
 * @param {number|string} v - Valor a formatear
 * @returns {string} Valor formateado con símbolo de pesos
 * 
 * @example
 * COP(1000000) // "$1.000.000"
 * COP(undefined) // "$0"
 */
const COP = (v) => {
    if (v === undefined || v === null || isNaN(v)) return "$0";
    return "$" + Math.round(v).toLocaleString("es-CO");
};

/**
 * Genera un ID único para uso temporal (cuando el backend no devuelve ID)
 * @returns {string} ID único
 */
const generarIdUnico = () => {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Extrae los datos de una respuesta de la API
 * @param {Object} response - Respuesta de la API
 * @returns {Array} Array de categorías
 */
const extraerCategorias = (response) => {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
    if (response?.data?.content && Array.isArray(response.data.content)) return response.data.content;
    return [];
};

/**
 * Extrae los productos de una respuesta de la API
 * @param {Object} response - Respuesta de la API
 * @returns {Array} Array de productos
 */
const extraerProductos = (response) => {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
    if (response?.data?.content && Array.isArray(response.data.content)) return response.data.content;
    return [];
};

/**
 * Extrae una categoría de la respuesta de la API
 * @param {Object} response - Respuesta de la API
 * @returns {Object|null} Categoría extraída o null
 */
const extraerCategoria = (response) => {
    if (response?.data) return response.data;
    if (response?.data?.data) return response.data.data;
    return response;
};

/**
 * Componente principal del panel de inventario
 */
export default function ProductosPanel() {
    // ============================================================
    // 1. ESTADOS PARA DATOS DEL BACKEND
    // ============================================================
    
    const [categoriasList, setCategoriasList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ============================================================
    // 2. ESTADOS PARA INTERFAZ DE USUARIO (UI)
    // ============================================================

    const [nuevaCategoria, setNuevaCategoria] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoEditando, setProductoEditando] = useState(null);
    const [soloStockBajo, setSoloStockBajo] = useState(false);

    // ============================================================
    // 3. ESTADO PARA EL FORMULARIO DE PRODUCTO
    // ============================================================

    const [nuevoProducto, setNuevoProducto] = useState({
        nombre: "",
        codigo: "",
        precio: "",
        costo: "",
        stock: "",
        stockMinimo: "",
        categoriaId: ""
    });

    // ============================================================
    // 4. EFECTO PARA CARGAR DATOS INICIALES
    // ============================================================

    useEffect(() => {
        cargarDatos();
    }, []);

    // ============================================================
    // 5. FUNCIÓN PARA CARGAR DATOS DESDE EL BACKEND
    // ============================================================

    /**
     * Función asíncrona que obtiene todas las categorías con sus productos
     * desde el backend a través del servicio productosService.
     * 
     * ✅ CORREGIDO: Carga categorías y productos por separado
     * 
     * @async
     * @returns {Promise<void>}
     */
    const cargarDatos = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // ✅ 1. Cargar categorías
            const categoriasResponse = await productosService.listarCategorias();
            const categoriasArray = extraerCategorias(categoriasResponse);
            
            // ✅ 2. Cargar productos
            const productosResponse = await productosService.listarProductos();
            const productosArray = extraerProductos(productosResponse);
            
            // ✅ 3. Crear un mapa de productos por categoría
            const productosPorCategoria = {};
            productosArray.forEach(p => {
                const categoryId = p.categoryId || p.category?.id;
                if (categoryId) {
                    if (!productosPorCategoria[categoryId]) {
                        productosPorCategoria[categoryId] = [];
                    }
                    productosPorCategoria[categoryId].push({
                        id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        nombre: p.name || p.nombre || "Sin nombre",
                        codigo: p.code || p.codigo || "N/A",
                        precio: p.salePrice || p.precio || 0,
                        costo: p.costPrice || p.costo || 0,
                        stock: p.stock || 0,
                        stockMinimo: p.minimumStock || p.stockMinimo || 0
                    });
                }
            });
            
            // ✅ 4. Mapear categorías con sus productos
            const categoriasConProductos = categoriasArray
                .filter(cat => cat !== null && cat !== undefined)
                .map(cat => ({
                    id: cat.id || generarIdUnico(),
                    nombre: cat.name || "Sin nombre",
                    productos: productosPorCategoria[cat.id] || []
                }));
            
            console.log('📦 Categorías cargadas:', categoriasConProductos);
            setCategoriasList(categoriasConProductos);
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError(err.message || 'Error al cargar los datos del inventario');
            setCategoriasList([]);
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 6. CÁLCULOS CON useMemo (Estadísticas y Filtros)
    // ============================================================

    const totalProductos = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            return acc + (cat?.productos?.length || 0);
        }, 0);
    }, [categoriasList]);

    const totalStock = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            return acc + (cat?.productos?.reduce((sum, p) => sum + (p?.stock || 0), 0) || 0);
        }, 0);
    }, [categoriasList]);

    const productosBajoStock = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            const bajos = (cat?.productos || []).filter(p => (p?.stock || 0) <= (p?.stockMinimo || 0));
            return acc + bajos.length;
        }, 0);
    }, [categoriasList]);

    const valorInventario = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            return acc + (cat?.productos?.reduce((sum, p) => sum + ((p?.precio || 0) * (p?.stock || 0)), 0) || 0);
        }, 0);
    }, [categoriasList]);

    const productosFiltrados = useMemo(() => {
        if (!Array.isArray(categoriasList)) return [];
        
        let resultados = [];
        
        categoriasList.forEach(cat => {
            if (categoriaSeleccionada !== "todas" && cat?.id !== parseInt(categoriaSeleccionada)) return;
            
            let productos = (cat?.productos || []).filter(p => {
                const busca = busqueda.toLowerCase();
                const coincide = p?.nombre?.toLowerCase().includes(busca) || 
                               p?.codigo?.toLowerCase().includes(busca);
                if (!coincide) return false;
                if (soloStockBajo) {
                    return (p?.stock || 0) <= (p?.stockMinimo || 0);
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

    // ============================================================
    // 7. FUNCIONES CRUD PARA CATEGORÍAS
    // ============================================================

    /**
     * Agrega una nueva categoría al backend y actualiza el estado local
     * 
     * @async
     * @returns {Promise<void>}
     */
    const agregarCategoria = async () => {
        const nombre = nuevaCategoria.trim();
        
        if (!nombre) {
            alert("Por favor ingresa un nombre para la categoría");
            return;
        }

        // ✅ Verificar si el nombre ya existe
        const nombreExiste = Array.isArray(categoriasList) && categoriasList.some(
            cat => cat.nombre?.toLowerCase() === nombre.toLowerCase()
        );
        
        if (nombreExiste) {
            alert(`❌ La categoría "${nombre}" ya existe. Por favor usa otro nombre.`);
            setNuevaCategoria("");
            return;
        }

        try {
            const payload = { name: nombre, description: "" };
            
            const response = await productosService.crearCategoria(payload);
            
            // ✅ Extraer la categoría de la respuesta
            const categoriaCreada = extraerCategoria(response);
            
            console.log('✅ Categoría creada:', categoriaCreada);
            
            // ✅ Formatear la categoría para el frontend
            const categoriaFormateada = {
                id: categoriaCreada.id || generarIdUnico(),
                nombre: categoriaCreada.name || nombre,
                productos: []
            };
            
            // ✅ Actualizar el estado local
            const currentList = Array.isArray(categoriasList) ? categoriasList : [];
            setCategoriasList([...currentList, categoriaFormateada]);
            setNuevaCategoria("");
            
            alert(`✅ Categoría "${nombre}" creada exitosamente`);
            
        } catch (err) {
            console.error('Error al crear categoría:', err);
            
            if (err.details?.violations) {
                const mensaje = err.details.violations.map(v => v.message).join(', ');
                alert('Error de validación: ' + mensaje);
            } else if (err.message?.includes('UNIQUE') || err.message?.includes('duplicate')) {
                alert(`❌ La categoría "${nombre}" ya existe. Por favor usa otro nombre.`);
            } else {
                alert('Error al crear la categoría: ' + err.message);
            }
        }
    };

    /**
     * Elimina una categoría del backend y actualiza el estado local
     * 
     * @async
     * @param {number} categoriaId - ID de la categoría a eliminar
     * @returns {Promise<void>}
     */
    const eliminarCategoria = async (categoriaId) => {
        const currentList = Array.isArray(categoriasList) ? categoriasList : [];
        const categoria = currentList.find(c => c.id === categoriaId);
        const tieneProductos = categoria?.productos?.length > 0;
        
        let confirmMessage = '¿Eliminar esta categoría?';
        if (tieneProductos) {
            confirmMessage = `La categoría "${categoria.nombre}" tiene ${categoria.productos.length} productos. ¿Eliminar categoría y todos sus productos?`;
        }
        
        if (!window.confirm(confirmMessage)) return;

        try {
            await productosService.eliminarCategoria(categoriaId);
            setCategoriasList(currentList.filter(c => c.id !== categoriaId));
        } catch (err) {
            console.error('Error al eliminar categoría:', err);
            alert('Error al eliminar la categoría: ' + err.message);
        }
    };

    // ============================================================
    // 8. FUNCIONES CRUD PARA PRODUCTOS
    // ============================================================

    /**
     * Abre el modal para crear un nuevo producto
     * 
     * @param {number|null} categoriaId - ID de la categoría para pre-seleccionar
     */
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

    /**
     * Abre el modal para editar un producto existente
     * 
     * @param {number} categoriaId - ID de la categoría del producto
     * @param {Object} producto - Datos del producto a editar
     */
    const editarProducto = (categoriaId, producto) => {
        setProductoEditando({ 
            categoriaId, 
            productoId: producto.id 
        });
        
        setNuevoProducto({
            nombre: producto.nombre || "",
            codigo: producto.codigo || "",
            precio: String(producto.precio || ""),
            costo: String(producto.costo || ""),
            stock: String(producto.stock || ""),
            stockMinimo: String(producto.stockMinimo || ""),
            categoriaId: categoriaId
        });
        
        setModalAbierto(true);
    };

    /**
     * Guarda un producto (crea o actualiza según corresponda)
     * 
     * @async
     * @returns {Promise<void>}
     */
    const guardarProducto = async () => {
        if (!nuevoProducto.nombre.trim()) {
            alert("El nombre del producto es obligatorio");
            return;
        }

        if (!nuevoProducto.categoriaId) {
            alert("Debes seleccionar una categoría");
            return;
        }

        const precio = parseInt(nuevoProducto.precio) || 0;
        const costo = parseInt(nuevoProducto.costo) || 0;
        const stock = parseInt(nuevoProducto.stock) || 0;
        const stockMinimo = parseInt(nuevoProducto.stockMinimo) || 0;

        const datosProducto = {
            name: nuevoProducto.nombre.trim(),
            code: nuevoProducto.codigo.trim() || `PRO-${Date.now()}`,
            salePrice: precio,
            costPrice: costo,
            stock: stock,
            minimumStock: stockMinimo,
            categoryId: parseInt(nuevoProducto.categoriaId)
        };

        try {
            if (productoEditando) {
                await productosService.actualizarProducto(
                    productoEditando.productoId,
                    datosProducto
                );
            } else {
                await productosService.crearProducto(datosProducto);
            }

            // ✅ Recargar datos para reflejar los cambios
            await cargarDatos();

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
        } catch (err) {
            console.error('Error al guardar producto:', err);
            alert('Error al guardar el producto: ' + err.message);
        }
    };

    /**
     * Elimina un producto del backend
     * 
     * @async
     * @param {number} productoId - ID del producto a eliminar
     * @returns {Promise<void>}
     */
    const eliminarProducto = async (productoId) => {
        if (!window.confirm("¿Eliminar este producto?")) return;

        try {
            await productosService.eliminarProducto(productoId);
            await cargarDatos();
        } catch (err) {
            console.error('Error al eliminar producto:', err);
            alert('Error al eliminar el producto: ' + err.message);
        }
    };

    /**
     * ✅ ACTUALIZA EL STOCK DE UN PRODUCTO (CORREGIDO)
     * 
     * Envía los campos correctos que espera el backend:
     * - name (nombre)
     * - code (código)
     * - salePrice (precio)
     * - costPrice (costo)
     * - stock (nuevo stock)
     * - minimumStock (stock mínimo)
     * - categoryId (ID de categoría)
     * 
     * @async
     * @param {number} categoriaId - ID de la categoría del producto
     * @param {number} productoId - ID del producto a actualizar
     * @param {number} nuevoStock - Nueva cantidad de stock
     * @returns {Promise<void>}
     */
    const actualizarStock = async (categoriaId, productoId, nuevoStock) => {
        const stock = parseInt(nuevoStock);
        if (isNaN(stock) || stock < 0) return;

        try {
            const currentList = Array.isArray(categoriasList) ? categoriasList : [];
            const categoria = currentList.find(c => c.id === categoriaId);
            const producto = categoria?.productos?.find(p => p.id === productoId);

            if (!producto) {
                console.error('Producto no encontrado');
                return;
            }

            // ✅ CORREGIDO: Enviar los campos correctos que espera el backend
            const datosActualizados = {
                name: producto.nombre,
                code: producto.codigo,
                salePrice: producto.precio,
                costPrice: producto.costo,
                stock: stock,  // ← El nuevo stock
                minimumStock: producto.stockMinimo,
                categoryId: parseInt(categoriaId)
            };

            console.log('📤 Actualizando stock:', datosActualizados);

            await productosService.actualizarProducto(productoId, datosActualizados);

            // ✅ Actualizar estado local de manera optimista
            setCategoriasList(
                currentList.map(cat => {
                    if (cat.id === categoriaId) {
                        return {
                            ...cat,
                            productos: (cat.productos || []).map(p => {
                                if (p.id === productoId) {
                                    return { ...p, stock };
                                }
                                return p;
                            })
                        };
                    }
                    return cat;
                })
            );

            console.log('✅ Stock actualizado correctamente');

        } catch (err) {
            console.error('Error al actualizar stock:', err);
            
            // ✅ Mostrar mensaje de error más detallado
            let mensaje = 'Error al actualizar el stock: ';
            if (err.details?.violations) {
                const violaciones = err.details.violations.map(v => v.message).join(', ');
                mensaje += violaciones;
            } else if (err.message) {
                mensaje += err.message;
            }
            alert(mensaje);
            
            // ✅ Recargar datos para mantener consistencia
            await cargarDatos();
        }
    };

    // ============================================================
    // 9. FUNCIÓN PARA RESETEAR FILTROS
    // ============================================================

    const resetearFiltros = () => {
        setBusqueda("");
        setCategoriaSeleccionada("todas");
        setSoloStockBajo(false);
    };

    // ============================================================
    // 10. RENDERIZADO CONDICIONAL
    // ============================================================

    if (loading) {
        return (
            <div className="inventario-page-container">
                <Card title="Inventario" icon="📦" className="inventario-card">
                    <div className="loading-message" style={{ textAlign: 'center', padding: '40px 0' }}>
                        <span style={{ fontSize: '24px' }}>⏳</span>
                        <p>Cargando inventario...</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="inventario-page-container">
                <Card title="Inventario" icon="📦" className="inventario-card">
                    <div className="error-message" style={{ textAlign: 'center', padding: '40px 0' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <p style={{ color: '#ef4444' }}>{error}</p>
                        <Button onClick={cargarDatos}>Reintentar</Button>
                    </div>
                </Card>
            </div>
        );
    }

    // ============================================================
    // 11. RENDERIZADO PRINCIPAL
    // ============================================================

    return (
        <div className="inventario-page-container">
            <Card title="Inventario" icon="📦" className="inventario-card">
                {/* Stats */}
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

                {/* Toolbar */}
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

                {/* Filtros */}
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
                            {Array.isArray(categoriasList) && categoriasList.map(cat => (
                                <option key={`filter-cat-${String(cat.id)}`} value={cat.id}>
                                    📁 {cat.nombre} ({cat?.productos?.length || 0})
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

                {/* Lista de categorías y productos */}
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
                                                title="Agregar producto a esta categoría"
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
                                            const stockBajo = (producto.stock || 0) <= (producto.stockMinimo || 0);
                                            const stockPorcentaje = Math.min(
                                                ((producto.stock || 0) / ((producto.stockMinimo || 1))) * 100, 
                                                100
                                            );
                                            
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
                                                                title="Editar producto"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className="btn-eliminar-rapido"
                                                                onClick={() => eliminarProducto(producto.id)}
                                                                title="Eliminar producto"
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
                                                                    {COP((producto.precio || 0) - (producto.costo || 0))}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="producto-stock-completo">
                                                            <div className="stock-control-completo">
                                                                <button 
                                                                    className="stock-btn-completo"
                                                                    onClick={() => actualizarStock(categoria.id, producto.id, (producto.stock || 0) - 1)}
                                                                    disabled={(producto.stock || 0) <= 0}
                                                                >
                                                                    −
                                                                </button>
                                                                <span className={`stock-numero ${stockBajo ? 'stock-bajo' : ''}`}>
                                                                    {producto.stock}
                                                                </span>
                                                                <button 
                                                                    className="stock-btn-completo"
                                                                    onClick={() => actualizarStock(categoria.id, producto.id, (producto.stock || 0) + 1)}
                                                                >
                                                                    +
                                                                </button>
                                                                <span className="stock-minimo-label">
                                                                    Min: {producto.stockMinimo || 0}
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
                                    {productoEditando ? "Actualiza la información del producto" : "Ingresa los datos del nuevo producto"}
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
                                    <option value="">Seleccionar categoría</option>
                                    {Array.isArray(categoriasList) && categoriasList.map(cat => (
                                        <option key={`modal-cat-${String(cat.id)}`} value={cat.id}>
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