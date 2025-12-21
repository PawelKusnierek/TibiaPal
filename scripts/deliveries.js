// Deliveries tool JavaScript
// Tab switching functionality is handled by onload.js show_tab function

// Sort deliveries tables: first by value (High -> Medium -> Low), then alphabetically by name
function sortDeliveriesTables() {
    // List of all delivery table IDs
    const tableIds = [
        'deliveries_table_rashid',
        'deliveries_table_djinn',
        'deliveries_table_yasir',
        'deliveries_table_telas',
        'deliveries_table_gladys',
        'deliveries_table_edron_academy',
        'deliveries_table_esrik',
        'deliveries_table_flint',
        'deliveries_table_others'
    ];
    
    // Value order: High = 0, Medium = 1, Low = 2
    const valueOrder = {
        'High': 0,
        'Medium': 1,
        'Low': 2
    };
    
    tableIds.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const tbody = table.querySelector('tbody') || table;
        const rows = Array.from(tbody.querySelectorAll('tr')).slice(1); // Skip header row
        
        // Sort rows
        rows.sort((a, b) => {
            // Get value cells (index 3)
            const aValueCell = a.cells[3];
            const bValueCell = b.cells[3];
            
            // Extract value text (might have HTML tags, so use textContent)
            const aValue = aValueCell.textContent.trim();
            const bValue = bValueCell.textContent.trim();
            
            // Get name cells (index 1) for alphabetical sorting
            const aNameCell = a.cells[1];
            const bNameCell = b.cells[1];
            
            // Extract name text (handle links - get textContent or innerText)
            let aName = '';
            let bName = '';
            if (aNameCell.querySelector('a')) {
                aName = aNameCell.querySelector('a').textContent.trim();
            } else {
                aName = aNameCell.textContent.trim();
            }
            
            if (bNameCell.querySelector('a')) {
                bName = bNameCell.querySelector('a').textContent.trim();
            } else {
                bName = bNameCell.textContent.trim();
            }
            
            // First sort by value (High -> Medium -> Low)
            const aValueOrder = valueOrder[aValue] !== undefined ? valueOrder[aValue] : 999;
            const bValueOrder = valueOrder[bValue] !== undefined ? valueOrder[bValue] : 999;
            
            if (aValueOrder !== bValueOrder) {
                return aValueOrder - bValueOrder;
            }
            
            // If values are the same, sort alphabetically by name
            return aName.localeCompare(bName);
        });
        
        // Reorder rows in the table
        rows.forEach(row => tbody.appendChild(row));
    });
}

// Sort tables when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all content is rendered
    setTimeout(sortDeliveriesTables, 100);
});

