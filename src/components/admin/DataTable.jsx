// ============================================
// DATA TABLE - Tabla de datos reutilizable
// ============================================
import { useState, useMemo } from "react";
import { COP, formatDate } from "../../utils/formatters";

export default function DataTable({ 
    columns, 
    data, 
    onRowClick,
    searchable = true,
    searchPlaceholder = "Buscar...",
    actions = [],
    emptyMessage = "No hay datos disponibles"
}) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");

    const filteredData = useMemo(() => {
        if (!search.trim()) return data;
        const searchLower = search.toLowerCase();
        return data.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchLower)
            );
        });
    }, [data, search]);

    const sortedData = useMemo(() => {
        if (!sortBy) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortBy] || "";
            const bVal = b[sortBy] || "";
            const comparison = String(aVal).localeCompare(String(bVal));
            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [filteredData, sortBy, sortDirection]);

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(key);
            setSortDirection("asc");
        }
    };

    /**
     * Función auxiliar para obtener el valor de una propiedad que puede ser
     * un valor fijo o una función que recibe la fila
     */
    const getActionValue = (action, property, row) => {
        const value = action[property];
        return typeof value === 'function' ? value(row) : value;
    };

    return (
        <div className="data-table-container">
            {searchable && (
                <div className="data-table-toolbar">
                    <div className="data-table-search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="search-clear" onClick={() => setSearch("")}>✕</button>
                        )}
                    </div>
                    {/* CORREGIDO: Verificar que actions sea un array y tenga elementos */}
                    {actions && actions.length > 0 && (
                        <div className="data-table-actions">
                            {/* Aquí puedes agregar acciones globales si lo deseas */}
                        </div>
                    )}
                </div>
            )}

            <div className="data-table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col, index) => (
                                <th 
                                    key={index}
                                    className={col.sortable ? "sortable" : ""}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    {col.label}
                                    {col.sortable && sortBy === col.key && (
                                        <span className="sort-icon">
                                            {sortDirection === "asc" ? "↑" : "↓"}
                                        </span>
                                    )}
                                </th>
                            ))}
                            {actions && actions.length > 0 && (
                                <th className="actions-header">Acciones</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions && actions.length > 0 ? 1 : 0)} className="empty-row">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, index) => (
                                <tr 
                                    key={index} 
                                    onClick={() => onRowClick?.(row)}
                                    className={onRowClick ? "clickable" : ""}
                                >
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex}>
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                    {actions && actions.length > 0 && (
                                        <td className="actions-cell">
                                            {actions.map((action, actionIndex) => {
                                                // Obtener los valores evaluando las funciones
                                                const icon = getActionValue(action, 'icon', row);
                                                const tooltip = getActionValue(action, 'tooltip', row);
                                                const className = getActionValue(action, 'className', row);
                                                
                                                return (
                                                    <button
                                                        key={actionIndex}
                                                        className={`action-btn ${className || ""}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            action.onClick(row);
                                                        }}
                                                        title={tooltip || ""}
                                                    >
                                                        {icon}
                                                    </button>
                                                );
                                            })}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}