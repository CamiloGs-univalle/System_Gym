// ============================================================
// ARCHIVO: src/pages/products/productos.jsx
// DESCRIPCIÓN: Panel de gestión de inventario (categorías y productos)
// VERSIÓN: 2.0 - CORREGIDA (Manejo correcto de stock con backend)
// ============================================================
// 
// FUNCIONALIDADES:
// - CRUD completo de categorías y productos
// - Filtros por categoría, búsqueda y stock bajo
// - Ajuste de stock con validación del backend
// - Estadísticas en tiempo real
// - Modal para crear/editar productos
//
// ============================================================

// ============================================================
// IMPORTACIONES
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { productosService } from '../../services/productosService';

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Formatea un valor numérico a pesos colombianos (COP)
 * @param {number|string} v - Valor a formatear
 * @returns {string} - Valor formateado (ej: "$1.000.000")
 */
const COP = (v) => {
    if (v === undefined || v === null || isNaN(v)) return "$0";
    return "$" + Math.round(v).toLocaleString("es-CO");
};

/**
 * Genera un ID único para uso temporal (cuando el backend no devuelve ID)
 * @returns {string} - ID único temporal
 */
const generarIdUnico = () => {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Extrae los datos de una respuesta de la API (categorías)
 * @param {Object} response - Respuesta de la API
 * @returns {Array} - Array de categorías
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
 * @returns {Array} - Array de productos
 */
const extraerProductos = (response) => {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
    if (response?.data?.content && Array.isArray(response.data.content)) return response.data.content;
    return [];
};

/**
 * Extrae una categoría o producto de la respuesta de la API
 * @param {Object} response - Respuesta de la API
 * @returns {Object|null} - Entidad extraída o null
 */
const extraerEntidad = (response) => {
    if (response?.data) return response.data;
    if (response?.data?.data) return response.data.data;
    return response;
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ProductosPanel() {
    // ============================================================
    // 1. ESTADOS PARA DATOS DEL BACKEND
    // ============================================================
    
    const [categoriasList, setCategoriasList] = useState([]);  // Lista de categorías con sus productos
    const [loading, setLoading] = useState(true);              // Estado de carga
    const [error, setError] = useState(null);                  // Mensaje de error

    // ============================================================
    // 2. ESTADOS PARA INTERFAZ DE USUARIO (UI)
    // ============================================================

    const [nuevaCategoria, setNuevaCategoria] = useState("");          // Input de nueva categoría
    const [busqueda, setBusqueda] = useState("");                      // Búsqueda de productos
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas"); // Filtro por categoría
    const [modalAbierto, setModalAbierto] = useState(false);           // Control del modal
    const [productoEditando, setProductoEditando] = useState(null);    // Producto en edición
    const [soloStockBajo, setSoloStockBajo] = useState(false);         // Filtro de stock bajo
    const [actualizandoStockId, setActualizandoStockId] = useState(null); // ID del producto en actualización

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

    /**
     * Al montar el componente, carga categorías y productos del backend
     */
    useEffect(() => {
        cargarDatos();
    }, []);

    // ============================================================
    // 5. FUNCIÓN PARA CARGAR DATOS DESDE EL BACKEND
    // ============================================================

    /**
     * Carga todas las categorías y productos del backend
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
                        stockMinimo: p.minimumStock || p.stockMinimo || 0,
                        // ✅ Guardamos el objeto completo para futuras referencias
                        _raw: p
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
            
            console.log('📦 Categorías cargadas:', categoriasConProductos.length);
            setCategoriasList(categoriasConProductos);
        } catch (err) {
            console.error('❌ Error cargando datos:', err);
            setError(err.message || 'Error al cargar los datos del inventario');
            setCategoriasList([]);
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 6. CÁLCULOS CON useMemo (Estadísticas y Filtros)
    // ============================================================

    /**
     * Total de productos en el inventario
     */
    const totalProductos = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            return acc + (cat?.productos?.length || 0);
        }, 0);
    }, [categoriasList]);

    /**
     * Total de unidades en stock
     */
    const totalStock = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            return acc + (cat?.productos?.reduce((sum, p) => sum + (p?.stock || 0), 0) || 0);
        }, 0);
    }, [categoriasList]);

    /**
     * Número de productos con stock bajo
     */
    const productosBajoStock = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            const bajos = (cat?.productos || []).filter(p => (p?.stock || 0) <= (p?.stockMinimo || 0));
            return acc + bajos.length;
        }, 0);
    }, [categoriasList]);

    /**
     * Valor total del inventario (precio * stock)
     */
    const valorInventario = useMemo(() => {
        if (!Array.isArray(categoriasList)) return 0;
        return categoriasList.reduce((acc, cat) => {
            return acc + (cat?.productos?.reduce((sum, p) => sum + ((p?.precio || 0) * (p?.stock || 0)), 0) || 0);
        }, 0);
    }, [categoriasList]);

    /**
     * Productos filtrados según búsqueda, categoría y stock bajo
     */
    const productosFiltrados = useMemo(() => {
        if (!Array.isArray(categoriasList)) return [];
        
        let resultados = [];
        
        categoriasList.forEach(cat => {
            // Filtro por categoría
            if (categoriaSeleccionada !== "todas" && String(cat?.id) !== String(categoriaSeleccionada)) return;
            
            // Filtro por búsqueda y stock bajo
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
     * Agrega una nueva categoría al backend
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
            const categoriaCreada = extraerEntidad(response);
            
            console.log('✅ Categoría creada:', categoriaCreada);
            
            // ✅ Formatear la categoría para el frontend
            const categoriaFormateada = {
                id: categoriaCreada.id || generarIdUnico(),
                nombre: categoriaCreada.name || nombre,
                productos: []
            };
            
            const currentList = Array.isArray(categoriasList) ? categoriasList : [];
            setCategoriasList([...currentList, categoriaFormateada]);
            setNuevaCategoria("");
            
            alert(`✅ Categoría "${nombre}" creada exitosamente`);
            
        } catch (err) {
            console.error('❌ Error al crear categoría:', err);
            
            if (err.details?.violations) {
                const mensaje = err.details.violations.map(v => v.message).join(', ');
                alert('❌ Error de validación: ' + mensaje);
            } else if (err.message?.includes('UNIQUE') || err.message?.includes('duplicate')) {
                alert(`❌ La categoría "${nombre}" ya existe. Por favor usa otro nombre.`);
            } else {
                alert('❌ Error al crear la categoría: ' + err.message);
            }
        }
    };

    /**
     * Elimina una categoría del backend
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
            console.error('❌ Error al eliminar categoría:', err);
            alert('❌ Error al eliminar la categoría: ' + err.message);
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
            alert("❌ El nombre del producto es obligatorio");
            return;
        }

        if (!nuevoProducto.categoriaId) {
            alert("❌ Debes seleccionar una categoría");
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
            console.error('❌ Error al guardar producto:', err);
            alert('❌ Error al guardar el producto: ' + err.message);
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
            console.error('❌ Error al eliminar producto:', err);
            alert('❌ Error al eliminar el producto: ' + err.message);
        }
    };

    // ============================================================
    // 9. FUNCIÓN PRINCIPAL: ACTUALIZAR STOCK (CORREGIDA ✅)
    // ============================================================

    /**
     * ✅ ACTUALIZA EL STOCK DE UN PRODUCTO
     * 
     * Esta función es la más importante del componente. A diferencia de la
     * versión anterior que asumía que el cambio se guardó solo porque el
     * PUT devolvió 200, esta versión:
     * 
     * 1. Envía el PUT con el nuevo stock deseado
     * 2. Obtiene el producto actualizado del backend (GET)
     * 3. Compara el stock enviado con el stock guardado
     * 4. Actualiza la UI con el valor REAL del backend
     * 5. Muestra una alerta clara si hay discrepancia
     * 
     * @async
     * @param {number} categoriaId - ID de la categoría del producto
     * @param {number} productoId - ID del producto a actualizar
     * @param {number} nuevoStock - Nueva cantidad de stock deseada
     * @returns {Promise<void>}
     */
    const actualizarStock = async (categoriaId, productoId, nuevoStock) => {
        // ✅ 1. Validar el stock deseado
        const stockDeseado = parseInt(nuevoStock);
        if (isNaN(stockDeseado) || stockDeseado < 0) {
            console.warn('⚠️ Stock inválido:', nuevoStock);
            return;
        }

        // ✅ 2. Prevenir doble click mientras se procesa
        if (actualizandoStockId === productoId) {
            console.log('⏳ Ya se está actualizando este producto');
            return;
        }
        setActualizandoStockId(productoId);

        try {
            // ✅ 3. Obtener la lista actual y encontrar el producto
            const currentList = Array.isArray(categoriasList) ? categoriasList : [];
            const categoria = currentList.find(c => c.id === categoriaId);
            const producto = categoria?.productos?.find(p => p.id === productoId);

            if (!producto) {
                console.error('❌ Producto no encontrado');
                setActualizandoStockId(null);
                return;
            }

            // ✅ 4. Preparar los datos para el PUT
            const datosActualizados = {
                name: producto.nombre,
                code: producto.codigo,
                salePrice: producto.precio,
                costPrice: producto.costo,
                stock: stockDeseado,
                minimumStock: producto.stockMinimo,
                categoryId: parseInt(categoriaId)
            };

            console.log(`📤 Enviando PUT /products/${productoId} con stock: ${stockDeseado}`);
            console.log('📤 Payload completo:', JSON.stringify(datosActualizados, null, 2));

            // ✅ 5. Enviar la actualización al backend
            const putResponse = await productosService.actualizarProducto(productoId, datosActualizados);
            console.log('📥 Respuesta PUT:', putResponse);

            // ✅ 6. Extraer el producto de la respuesta del PUT
            let productoConfirmado = extraerEntidad(putResponse);

            // ✅ 7. Si el PUT no devuelve el producto, hacer un GET
            if (!productoConfirmado || productoConfirmado.stock === undefined) {
                console.log('🔄 El PUT no devolvió el producto, haciendo GET...');
                const getResponse = await productosService.obtenerProductoPorId(productoId);
                console.log('📥 Respuesta GET:', getResponse);
                productoConfirmado = extraerEntidad(getResponse);
            }

            // ✅ 8. Obtener el stock guardado en el backend
            const stockGuardadoEnBackend = productoConfirmado?.stock;
            console.log(`📊 Stock enviado: ${stockDeseado}, Stock guardado: ${stockGuardadoEnBackend}`);

            // ✅ 9. ACTUALIZAR UI CON EL VALOR REAL DEL BACKEND
            if (stockGuardadoEnBackend !== undefined) {
                // Actualizar el estado local con el valor real del backend
                setCategoriasList(
                    currentList.map(cat => {
                        if (cat.id === categoriaId) {
                            return {
                                ...cat,
                                productos: (cat.productos || []).map(p => {
                                    if (p.id === productoId) {
                                        // ✅ Actualizar con el valor del backend
                                        return { ...p, stock: stockGuardadoEnBackend };
                                    }
                                    return p;
                                })
                            };
                        }
                        return cat;
                    })
                );
            } else {
                // ❌ No se pudo obtener el stock guardado, recargar todo
                console.warn('⚠️ No se pudo obtener el stock guardado, recargando...');
                await cargarDatos();
                setActualizandoStockId(null);
                return;
            }

            // ✅ 10. Comparar y mostrar resultado
            if (stockGuardadoEnBackend === stockDeseado) {
                // ✅ El stock se actualizó correctamente
                console.log('✅ Stock actualizado correctamente');
                // No mostrar alert para no interrumpir el flujo
            } else {
                // ⚠️ El backend modificó el stock automáticamente
                const diferencia = stockGuardadoEnBackend - stockDeseado;
                console.warn('⚠️ El backend modificó el stock automáticamente', {
                    enviado: stockDeseado,
                    guardado: stockGuardadoEnBackend,
                    diferencia: diferencia
                });
                
                // ✅ Mostrar alerta informativa (NO de error)
                alert(
                    `ℹ️ El stock fue ajustado automáticamente por el sistema.\n\n` +
                    `📤 Stock enviado: ${stockDeseado}\n` +
                    `📥 Stock guardado: ${stockGuardadoEnBackend}\n` +
                    `📊 Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}\n\n` +
                    `Esto puede deberse a:\n` +
                    `• Reglas de negocio en el backend\n` +
                    `• Cálculos automáticos de stock\n` +
                    `• Validaciones del sistema\n\n` +
                    `✅ El valor mostrado ahora es el real guardado en el backend.`
                );
            }

        } catch (err) {
            // ❌ Manejo de errores
            console.error('❌ Error al actualizar stock:', err);

            let mensaje = 'Error al actualizar el stock: ';
            if (err.details?.violations) {
                const violaciones = err.details.violations.map(v => v.message).join(', ');
                mensaje += violaciones;
            } else if (err.message) {
                mensaje += err.message;
            }
            alert('❌ ' + mensaje);

            // ✅ Recargar datos para mantener consistencia
            await cargarDatos();
        } finally {
            // ✅ Liberar el bloqueo de actualización
            setActualizandoStockId(null);
        }
    };

    // ============================================================
    // 10. FUNCIÓN PARA RESETEAR FILTROS
    // ============================================================

    const resetearFiltros = () => {
        setBusqueda("");
        setCategoriaSeleccionada("todas");
        setSoloStockBajo(false);
    };

    // ============================================================
    // 11. RENDERIZADO CONDICIONAL
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
    // 12. RENDERIZADO PRINCIPAL
    // ============================================================

    return (
        <div className="inventario-page-container">
            <Card title="Inventario" icon="📦" className="inventario-card">
                {/* ============================================================
                    SECCIÓN: ESTADÍSTICAS
                    ============================================================ */}
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

                {/* ============================================================
                    SECCIÓN: TOOLBAR
                    ============================================================ */}
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

                {/* ============================================================
                    SECCIÓN: FILTROS
                    ============================================================ */}
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

                {/* ============================================================
                    SECCIÓN: LISTA DE PRODUCTOS
                    ============================================================ */}
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
                                    {/* Cabecera de categoría */}
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

                                    {/* Productos de la categoría */}
                                    <div className="productos-grid-completo">
                                        {categoria.productos.map((producto) => {
                                            const stockBajo = (producto.stock || 0) <= (producto.stockMinimo || 0);
                                            const stockPorcentaje = Math.min(
                                                ((producto.stock || 0) / ((producto.stockMinimo || 1))) * 100, 
                                                100
                                            );
                                            const actualizando = actualizandoStockId === producto.id;
                                            
                                            return (
                                                <div key={producto.id} className={`producto-card-completo ${stockBajo ? 'stock-bajo-card' : ''}`}>
                                                    {/* Header del producto */}
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

                                                    {/* Body del producto */}
                                                    <div className="producto-card-body">
                                                        {/* Precios */}
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

                                                        {/* Control de stock */}
                                                        <div className="producto-stock-completo">
                                                            <div className="stock-control-completo">
                                                                <button 
                                                                    className="stock-btn-completo"
                                                                    onClick={() => actualizarStock(categoria.id, producto.id, (producto.stock || 0) - 1)}
                                                                    disabled={(producto.stock || 0) <= 0 || actualizando}
                                                                >
                                                                    −
                                                                </button>
                                                                <span className={`stock-numero ${stockBajo ? 'stock-bajo' : ''}`}>
                                                                    {actualizando ? '…' : producto.stock}
                                                                </span>
                                                                <button 
                                                                    className="stock-btn-completo"
                                                                    onClick={() => actualizarStock(categoria.id, producto.id, (producto.stock || 0) + 1)}
                                                                    disabled={actualizando}
                                                                >
                                                                    +
                                                                </button>
                                                                <span className="stock-minimo-label">
                                                                    Min: {producto.stockMinimo || 0}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Barra de stock */}
                                                            <div className="stock-bar-completo-bg">
                                                                <div 
                                                                    className={`stock-bar-completo ${stockBajo ? 'stock-bar-bajo' : ''}`}
                                                                    style={{ width: `${Math.min(stockPorcentaje, 100)}%` }}
                                                                />
                                                            </div>
                                                            
                                                            {/* Alerta de stock bajo */}
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

            {/* ============================================================
                MODAL: CREAR/EDITAR PRODUCTO
                ============================================================ */}
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
                            {/* Nombre */}
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

                            {/* Código */}
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

                            {/* Categoría */}
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

                            {/* Precio */}
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

                            {/* Costo */}
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

                            {/* Stock actual */}
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

                            {/* Stock mínimo */}
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

                        {/* Botones del modal */}
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