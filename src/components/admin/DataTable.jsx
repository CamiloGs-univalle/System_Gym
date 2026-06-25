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
    actions,
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
                    {actions && <div className="data-table-actions">{actions}</div>}
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
                            {actions && <th className="actions-header">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-row">
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
                                    {actions && (
                                        <td className="actions-cell">
                                            {actions.map((action, actionIndex) => (
                                                <button
                                                    key={actionIndex}
                                                    className={`action-btn ${action.className || ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        action.onClick(row);
                                                    }}
                                                    title={action.tooltip}
                                                >
                                                    {action.icon}
                                                </button>
                                            ))}
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