function apply_level_filter() {
	let vocation = get_active_vocation()
	const levelFilter = document.getElementById("levelFilter_" + vocation);
	const playerLevel = levelFilter.value ? parseInt(levelFilter.value) : null;
	
	filter_hunting_table(playerLevel, vocation);
}

function filter_hunting_table(level_filter, vocation) {
	let hunting_table = document.getElementById("hunting_table_" + vocation);
	let number_of_rows = hunting_table.rows.length;
	unfilter_hunting_table(vocation);
	
	// If no level filter is set, show all rows
	if (level_filter === null || level_filter === 0) {
		return;
	}
	
	for (let i = number_of_rows - 1; i > 0; i--) {
		let level_value = hunting_table.rows[i].cells[0].childNodes[0].data;
		level_value = level_value.replace("+", "")
		if (parseInt(level_value) > level_filter) {
			hunting_table.rows[i].style.display = 'none'
		}
	}
}

function unfilter_hunting_table(vocation) {
	let hunting_table = document.getElementById("hunting_table_" + vocation);
	let number_of_rows = hunting_table.rows.length;
	for (let i = number_of_rows - 1; i > 0; i--) {
		hunting_table.rows[i].style.display = 'table-row'
	}
}

function get_active_vocation() {
	let vocation_buttons = document.getElementsByClassName("tablinks");
	for (i = 0; i < vocation_buttons.length; i++) {
		if (vocation_buttons[i].classList.contains("active")) {
			return vocation_buttons[i].id
		}
	}
}

// Tab switching functionality
function show_tab(event, tabName) {
	// Hide all tab content
	const tabcontent = document.getElementsByClassName("tabcontent");
	for (let i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}

	// Remove active class from all tab buttons
	const tablinks = document.getElementsByClassName("tablinks");
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].classList.remove("active");
	}

	// Show the selected tab content and mark button as active
	document.getElementById(tabName).style.display = "block";
	event.currentTarget.classList.add("active");
	
	// Reinitialize sorting headers for the newly shown tab
	setTimeout(() => {
		const vocation = event.currentTarget.id;
		const table = document.getElementById("hunting_table_" + vocation);
		if (table) {
			const headerRow = table.querySelector("tr");
			const headers = headerRow.cells;
			
			// Make Level, Raw exp, and Loot headers clickable
			[0, 2, 3].forEach(columnIndex => { // Level, Raw exp, Loot columns
				const header = headers[columnIndex];
				if (!header.classList.contains("sortable-header")) {
					header.style.cursor = "pointer";
					header.classList.add("sortable-header");
					header.addEventListener("click", () => sortTable(columnIndex, vocation));
				}
			});
		}
	}, 100);
}

// Table sorting functionality
function sortTable(columnIndex, vocation) {
	const table = document.getElementById("hunting_table_" + vocation);
	const tbody = table.querySelector("tbody") || table;
	const rows = Array.from(tbody.querySelectorAll("tr")).slice(1); // Skip header row
	
	// Get current sort direction
	const header = table.querySelector("tr").cells[columnIndex];
	const currentDirection = header.getAttribute("data-sort-direction") || "asc";
	const newDirection = currentDirection === "asc" ? "desc" : "asc";
	
	// Update sort direction on all headers
	const headers = table.querySelector("tr").cells;
	for (let i = 0; i < headers.length; i++) {
		headers[i].setAttribute("data-sort-direction", "");
		headers[i].classList.remove("sort-asc", "sort-desc");
	}
	header.setAttribute("data-sort-direction", newDirection);
	header.classList.add("sort-" + newDirection);
	
	// Sort rows
	rows.sort((a, b) => {
		let aValue = a.cells[columnIndex].textContent.trim();
		let bValue = b.cells[columnIndex].textContent.trim();
		
		// Handle numeric values (remove + and parse)
		if (columnIndex === 0) { // Level column
			aValue = parseInt(aValue.replace("+", "")) || 0;
			bValue = parseInt(bValue.replace("+", "")) || 0;
		} else if (columnIndex === 2) { // Raw exp column
			aValue = extractExpValue(aValue);
			bValue = extractExpValue(bValue);
		} else if (columnIndex === 3) { // Loot column - extract numeric part
			aValue = extractLootValue(aValue);
			bValue = extractLootValue(bValue);
		}
		
		if (newDirection === "asc") {
			return aValue > bValue ? 1 : -1;
		} else {
			return aValue < bValue ? 1 : -1;
		}
	});
	
	// Reorder rows in the table
	rows.forEach(row => tbody.appendChild(row));
}

function extractExpValue(text) {
	// Handle experience values like "1kk", "1000k", "6.6kk", "6500k"
	// Convert everything to a base number (thousands)
	
	// Handle "kk" notation (1kk = 1000k = 1,000,000)
	const kkMatch = text.match(/(\d+(?:\.\d+)?)kk/i);
	if (kkMatch) {
		return parseFloat(kkMatch[1]) * 1000; // Convert to thousands
	}
	
	// Handle "k" notation
	const kMatch = text.match(/(\d+(?:\.\d+)?)k/i);
	if (kMatch) {
		return parseFloat(kMatch[1]);
	}
	
	// Handle plain numbers
	const numMatch = text.match(/(\d+(?:\.\d+)?)/);
	if (numMatch) {
		return parseFloat(numMatch[1]);
	}
	
	return 0;
}

function extractLootValue(text) {
	// Handle loot values including negative numbers and dashes
	if (text === "-" || text === "" || text === "—") {
		return 0;
	}
	
	// Handle negative values
	const isNegative = text.includes("-") && !text.match(/\d+\s*-\s*\d+/); // Not a range like "50k-100k"
	
	// Handle "kk" notation first (1kk = 1000k = 1,000,000)
	const kkMatch = text.match(/(\d+(?:\.\d+)?)kk/i);
	if (kkMatch) {
		let value = parseFloat(kkMatch[1]) * 1000000; // Convert to actual number
		if (isNegative) {
			value = -value;
		}
		return value;
	}
	
	// Handle "k" notation
	const kMatch = text.match(/(\d+(?:\.\d+)?)k/i);
	if (kMatch) {
		let value = parseFloat(kMatch[1]) * 1000; // Convert to actual number
		if (isNegative) {
			value = -value;
		}
		return value;
	}
	
	// Handle "m" notation
	const mMatch = text.match(/(\d+(?:\.\d+)?)m/i);
	if (mMatch) {
		let value = parseFloat(mMatch[1]) * 1000000; // Convert to actual number
		if (isNegative) {
			value = -value;
		}
		return value;
	}
	
	// Handle "b" notation
	const bMatch = text.match(/(\d+(?:\.\d+)?)b/i);
	if (bMatch) {
		let value = parseFloat(bMatch[1]) * 1000000000; // Convert to actual number
		if (isNegative) {
			value = -value;
		}
		return value;
	}
	
	// Handle plain numbers
	const numMatch = text.match(/(\d+(?:\.\d+)?)/);
	if (numMatch) {
		let value = parseFloat(numMatch[1]);
		if (isNegative) {
			value = -value;
		}
		return value;
	}
	
	return 0;
}

// Initialize sorting headers when page loads
function initializeSortingHeaders() {
	const vocations = ['knight', 'paladin', 'mage', 'monk', 'duo', 'teamhunt'];
	
	// Show the first tab by default
	const firstTab = document.getElementById('Knight');
	if (firstTab) {
		firstTab.style.display = "block";
	}
	
	vocations.forEach(vocation => {
		const table = document.getElementById("hunting_table_" + vocation);
		if (table) {
			const headerRow = table.querySelector("tr");
			const headers = headerRow.cells;
			
			// Make Level, Raw exp, and Loot headers clickable
			[0, 2, 3].forEach(columnIndex => { // Level, Raw exp, Loot columns
				const header = headers[columnIndex];
				header.style.cursor = "pointer";
				header.classList.add("sortable-header");
				header.addEventListener("click", () => sortTable(columnIndex, vocation));
			});
		}
		
		// Set up level filter event listeners
		const levelFilter = document.getElementById("levelFilter_" + vocation);
		if (levelFilter) {
			let hasAutoSorted = false; // Track if we've already auto-sorted for this input
			
			levelFilter.addEventListener("input", function() {
				apply_level_filter();
				
				// Auto-sort by Raw exp (column index 2) only on first input
				if (this.value && this.value.length > 0 && !hasAutoSorted) {
					hasAutoSorted = true; // Mark that we've auto-sorted
					// Small delay to ensure the filter has been applied first
					setTimeout(() => {
						sortTable(2, vocation); // 2 is the Raw exp column index
					}, 10);
				}
			});
			
			// Reset the auto-sort flag when the field is cleared
			levelFilter.addEventListener("blur", function() {
				if (!this.value || this.value.length === 0) {
					hasAutoSorted = false;
				}
			});
		}
	});
}

// Call initialization when page loads
document.addEventListener('DOMContentLoaded', initializeSortingHeaders);