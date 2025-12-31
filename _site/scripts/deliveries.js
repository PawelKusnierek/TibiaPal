// Deliveries tool JavaScript
// Tab switching functionality is handled by onload.js show_tab function

// Sort deliveries tables: first by Market Value (Very High -> High -> Medium -> Low), 
// then by NPC Price (highest first), then alphabetically by name
function sortDeliveriesTables() {
    // List of all delivery table IDs
    const tableIds = [
        'deliveries_table_everything',
        'deliveries_table_rashid',
        'deliveries_table_djinn',
        'deliveries_table_yasir',
        'deliveries_table_telas',
        'deliveries_table_gladys',
        'deliveries_table_edron_academy',
        'deliveries_table_esrik',
        'deliveries_table_flint'
    ];
    
    // Value order: Very High = 0, High = 1, Medium = 2, Low = 3
    const valueOrder = {
        'Very High': 0,
        'High': 1,
        'Medium': 2,
        'Low': 3
    };
    
    // Helper function to parse NPC price (handles formats like "2 000", "35 000", etc.)
    function parsePrice(priceText) {
        if (!priceText) return 0;
        // Remove spaces and parse as integer
        const cleaned = priceText.replace(/\s/g, '');
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    
    tableIds.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const tbody = table.querySelector('tbody') || table;
        const rows = Array.from(tbody.querySelectorAll('tr')).slice(1); // Skip header row
        
        // Sort rows
        rows.sort((a, b) => {
            // Get value cells (index 3 - Market Value)
            const aValueCell = a.cells[3];
            const bValueCell = b.cells[3];
            
            // Extract value text (might have HTML tags, so use textContent)
            const aValue = aValueCell.textContent.trim();
            const bValue = bValueCell.textContent.trim();
            
            // Get price cells (index 2 - NPC Price)
            const aPriceCell = a.cells[2];
            const bPriceCell = b.cells[2];
            
            // Extract and parse prices
            const aPrice = parsePrice(aPriceCell.textContent.trim());
            const bPrice = parsePrice(bPriceCell.textContent.trim());
            
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
            
            // First sort by Market Value (Very High -> High -> Medium -> Low)
            const aValueOrder = valueOrder[aValue] !== undefined ? valueOrder[aValue] : 999;
            const bValueOrder = valueOrder[bValue] !== undefined ? valueOrder[bValue] : 999;
            
            if (aValueOrder !== bValueOrder) {
                return aValueOrder - bValueOrder;
            }
            
            // If values are the same, sort by NPC Price (descending - highest first)
            if (aPrice !== bPrice) {
                return bPrice - aPrice; // Descending order
            }
            
            // If prices are also the same, sort alphabetically by name
            return aName.localeCompare(bName);
        });
        
        // Reorder rows in the table
        rows.forEach(row => tbody.appendChild(row));
    });
}

// Get the active delivery tab name
function get_active_delivery_tab() {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        if (tabcontent[i].style.display === "block" || 
            (tabcontent[i].style.display === "" && i === 0)) {
            return tabcontent[i].id;
        }
    }
    return "Everything"; // Default to first tab
}

// Get table ID from tab name
function get_table_id_from_tab(tabName) {
    const tabToTableMap = {
        'Everything': 'deliveries_table_everything',
        'RashidTab': 'deliveries_table_rashid',
        'Djinn': 'deliveries_table_djinn',
        'Yasir': 'deliveries_table_yasir',
        'Telas': 'deliveries_table_telas',
        'Gladys': 'deliveries_table_gladys',
        'Edron Academy': 'deliveries_table_edron_academy',
        'Esrik': 'deliveries_table_esrik',
        'Flint': 'deliveries_table_flint'
    };
    return tabToTableMap[tabName] || 'deliveries_table_everything';
}

// Filter delivery table by name
function filter_delivery_table_by_name(filterText) {
    const activeTab = get_active_delivery_tab();
    const tableId = get_table_id_from_tab(activeTab);
    const table = document.getElementById(tableId);
    
    if (!table) return;
    
    const filter = filterText.toLowerCase().trim();
    const rows = table.querySelectorAll('tr');
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const nameCell = row.cells[1]; // Name column is at index 1
        
        if (!nameCell) {
            row.style.display = 'none';
            continue;
        }
        
        // Extract name text (handle links)
        let nameText = '';
        if (nameCell.querySelector('a')) {
            nameText = nameCell.querySelector('a').textContent.trim().toLowerCase();
        } else {
            nameText = nameCell.textContent.trim().toLowerCase();
        }
        
        // Show row if name contains filter text, hide otherwise
        if (filter === '' || nameText.includes(filter)) {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
    }
}

// Apply name filter
function apply_name_filter() {
    const nameFilter = document.getElementById('nameFilter');
    if (nameFilter) {
        filter_delivery_table_by_name(nameFilter.value);
    }
}

// Helper function to parse NPC price (handles formats like "2 000", "35 000", etc.)
function parsePrice(priceText) {
    if (!priceText) return 0;
    // Remove spaces and parse as integer
    const cleaned = priceText.replace(/\s/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
}

// Helper function to get Market Value order
function getMarketValueOrder(valueText) {
    const valueOrder = {
        'Very High': 0,
        'High': 1,
        'Medium': 2,
        'Low': 3
    };
    return valueOrder[valueText] !== undefined ? valueOrder[valueText] : 999;
}

// Helper function to extract name text from cell (handles links)
function extractName(cell) {
    if (cell.querySelector('a')) {
        return cell.querySelector('a').textContent.trim();
    } else {
        return cell.textContent.trim();
    }
}

// Sort delivery table by column
function sortDeliveryTable(columnIndex, tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody') || table;
    const rows = Array.from(tbody.querySelectorAll('tr')).slice(1); // Skip header row
    
    // Get current sort direction
    const header = table.querySelector('tr').cells[columnIndex];
    const currentDirection = header.getAttribute('data-sort-direction') || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    
    // Update sort direction on all headers
    const headers = table.querySelector('tr').cells;
    for (let i = 0; i < headers.length; i++) {
        headers[i].setAttribute('data-sort-direction', '');
        headers[i].classList.remove('delivery-sort-asc', 'delivery-sort-desc');
    }
    header.setAttribute('data-sort-direction', newDirection);
    header.classList.add('delivery-sort-' + newDirection);
    
    // Sort rows
    rows.sort((a, b) => {
        let aValue, bValue;
        
        if (columnIndex === 1) {
            // Name column - alphabetical
            aValue = extractName(a.cells[columnIndex]);
            bValue = extractName(b.cells[columnIndex]);
        } else if (columnIndex === 2) {
            // NPC Price column - numeric
            aValue = parsePrice(a.cells[columnIndex].textContent.trim());
            bValue = parsePrice(b.cells[columnIndex].textContent.trim());
        } else if (columnIndex === 3) {
            // Market Value column - categorical
            aValue = getMarketValueOrder(a.cells[columnIndex].textContent.trim());
            bValue = getMarketValueOrder(b.cells[columnIndex].textContent.trim());
        } else {
            // Default to text comparison
            aValue = a.cells[columnIndex].textContent.trim();
            bValue = b.cells[columnIndex].textContent.trim();
        }
        
        // Compare values
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else {
            comparison = aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
        }
        
        // Apply sort direction
        return newDirection === 'asc' ? comparison : -comparison;
    });
    
    // Reorder rows in the table
    rows.forEach(row => tbody.appendChild(row));
}

// Initialize sortable headers for delivery tables
function initializeDeliverySortingHeaders() {
    const tableIds = [
        'deliveries_table_everything',
        'deliveries_table_rashid',
        'deliveries_table_djinn',
        'deliveries_table_yasir',
        'deliveries_table_telas',
        'deliveries_table_gladys',
        'deliveries_table_edron_academy',
        'deliveries_table_esrik',
        'deliveries_table_flint'
    ];
    
    tableIds.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const headerRow = table.querySelector('tr');
        if (!headerRow) return;
        
        const headers = headerRow.cells;
        
        // Make Name (1), NPC Price (2), and Market Value (3) headers clickable
        [1, 2, 3].forEach(columnIndex => {
            const header = headers[columnIndex];
            if (header && !header.classList.contains('delivery-sortable-header')) {
                header.classList.add('delivery-sortable-header');
                header.addEventListener('click', () => sortDeliveryTable(columnIndex, tableId));
            }
        });
    });
}

// Reinitialize sorting headers when tabs are switched
function reinitializeDeliverySortingOnTabSwitch() {
    const tabButtons = document.querySelectorAll('.deliveries_tab .tablinks');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Small delay to ensure tab content is shown
            setTimeout(() => {
                const activeTab = get_active_delivery_tab();
                const tableId = get_table_id_from_tab(activeTab);
                const table = document.getElementById(tableId);
                
                if (table) {
                    const headerRow = table.querySelector('tr');
                    if (headerRow) {
                        const headers = headerRow.cells;
                        // Make Name, NPC Price, and Market Value headers clickable
                        [1, 2, 3].forEach(columnIndex => {
                            const header = headers[columnIndex];
                            if (header && !header.classList.contains('delivery-sortable-header')) {
                                header.classList.add('delivery-sortable-header');
                                header.addEventListener('click', () => sortDeliveryTable(columnIndex, tableId));
                            }
                        });
                    }
                }
                
                // Reapply filter
                apply_name_filter();
            }, 50);
        });
    });
}

// Sort tables when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all content is rendered
    setTimeout(() => {
        sortDeliveriesTables();
        initializeDeliverySortingHeaders();
    }, 100);
    
    // Set up name filter event listener
    const nameFilter = document.getElementById('nameFilter');
    if (nameFilter) {
        nameFilter.addEventListener('input', function() {
            apply_name_filter();
        });
    }
    
    // Reinitialize sorting headers and reapply filter when tabs are switched
    reinitializeDeliverySortingOnTabSwitch();
});

