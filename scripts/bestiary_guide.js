// Global variables
let bestiaryTable = null;
let allMonsters = []; // Store all monster data for sorting
let currentSort = { column: 'name', direction: 'asc' }; // Track current sort state

// Bestiary Guide functionality
function initializeBestiaryGuide() {
    console.log('Initializing bestiary guide...');

    const searchInput = document.getElementById('monsterSearch');
    bestiaryTable = document.getElementById('bestiaryTable');

    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }

    if (!bestiaryTable) {
        console.error('Table not found!');
        return;
    }

    // Load and populate monster data
    loadMonsterData(bestiaryTable);

    // Set up search functionality
    searchInput.addEventListener('input', function() {
        applyFilters();
    });

    // Set up charm point filter functionality
    const charmPointFilters = document.querySelectorAll('.charm-point-filter');
    charmPointFilters.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            applyFilters();
        });
    });

    // Set up effort filter functionality
    const effortFilters = document.querySelectorAll('.effort-filter');
    effortFilters.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            applyFilters();
        });
    });

    // Set up rapid filter functionality
    const rapidFilters = document.querySelectorAll('.rapid-filter');
    rapidFilters.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            applyFilters();
        });
    });

    // Set up sortable headers
    const sortableHeaders = document.querySelectorAll('.sortable-header');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortColumn = this.getAttribute('data-sort');
            handleHeaderClick(sortColumn);
        });
    });

    console.log('Bestiary guide initialized successfully');
}

function handleHeaderClick(sortColumn) {
    // Toggle direction if clicking the same column
    if (currentSort.column === sortColumn) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
        currentSort.column = sortColumn;
        currentSort.direction = 'asc';
    }
    
    // Update header arrows
    updateHeaderArrows();
    
    // Re-apply filters with new sort
    applyFilters();
}

function updateHeaderArrows() {
    const sortableHeaders = document.querySelectorAll('.sortable-header');
    sortableHeaders.forEach(header => {
        const column = header.getAttribute('data-sort');
        const baseText = header.textContent.replace(/[↑↓↕]/g, '').trim();
        
        if (column === currentSort.column) {
            const arrow = currentSort.direction === 'asc' ? ' ↑' : ' ↓';
            header.textContent = baseText + arrow;
        } else {
            header.textContent = baseText + ' ↕';
        }
    });
}

function applyFilters() {
    if (!bestiaryTable) {
        console.error('Table not found in applyFilters!');
        return;
    }

    const searchInput = document.getElementById('monsterSearch');
    const searchTerm = searchInput.value.toLowerCase();
    const charmPointFilters = document.querySelectorAll('.charm-point-filter');
    const effortFilters = document.querySelectorAll('.effort-filter');
    const rapidFilters = document.querySelectorAll('.rapid-filter');
    
    // Get selected charm point values
    const selectedCharmPoints = [];
    charmPointFilters.forEach(checkbox => {
        if (checkbox.checked) {
            selectedCharmPoints.push(parseInt(checkbox.value));
        }
    });
    
    // Get selected effort values
    const selectedEfforts = [];
    effortFilters.forEach(checkbox => {
        if (checkbox.checked) {
            selectedEfforts.push(checkbox.value);
        }
    });
    
    // Get selected rapid values
    const selectedRapids = [];
    rapidFilters.forEach(checkbox => {
        if (checkbox.checked) {
            selectedRapids.push(checkbox.value);
        }
    });
    
    console.log('Search term:', searchTerm);
    console.log('Selected charm points:', selectedCharmPoints);
    console.log('Selected efforts:', selectedEfforts);
    console.log('Selected rapids:', selectedRapids);
    console.log('Current sort:', currentSort);

    // Re-populate table with sorted and filtered data
    populateTableWithFilters(bestiaryTable, searchTerm, selectedCharmPoints, selectedEfforts, selectedRapids, currentSort);
}

function loadMonsterData(table) {
    console.log('Loading monster data...');
    
    // Fetch the JSON data
    fetch('bestiary.json')
        .then(response => response.json())
        .then(data => {
            console.log('Loaded', data.length, 'monsters');
            allMonsters = data; // Store data globally
            populateTable(table, data);
            updateHeaderArrows(); // Set initial arrow state
            applyFilters(); // Apply filters after initial population
        })
        .catch(error => {
            console.error('Error loading monster data:', error);
            // Fallback: create some sample data
            createSampleData(table);
        });
}

function populateTableWithFilters(table, searchTerm, selectedCharmPoints, selectedEfforts, selectedRapids, sortConfig) {
    // Filter the monsters based on criteria
    let filteredMonsters = allMonsters.filter(monster => {
        const matchesSearch = monster.name.toLowerCase().includes(searchTerm);
        const matchesCharmPoints = selectedCharmPoints.includes(monster.charmPoints);
        const matchesEffort = selectedEfforts.includes(monster.effort);
        const matchesRapid = selectedRapids.includes(monster.rapidRecommended);
        
        return matchesSearch && matchesCharmPoints && matchesEffort && matchesRapid;
    });
    
    // Sort the filtered monsters
    filteredMonsters.sort((a, b) => {
        let comparison = 0;
        
        switch (sortConfig.column) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'level':
                comparison = a.minLevel - b.minLevel;
                break;
            case 'points':
                comparison = a.charmPoints - b.charmPoints;
                break;
            case 'effort':
                comparison = a.effort.localeCompare(b.effort);
                break;
            case 'rapid':
                comparison = a.rapidRecommended.localeCompare(b.rapidRecommended);
                break;
            case 'location':
                comparison = a.location.localeCompare(b.location);
                break;
            default:
                comparison = a.name.localeCompare(b.name);
        }
        
        // Apply direction
        return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
    
    // Populate the table with filtered and sorted data
    populateTable(table, filteredMonsters);
}

function populateTable(table, monsters) {
    // Clear existing data rows (keep header)
    const rows = table.getElementsByTagName('tr');
    while (rows.length > 1) {
        table.deleteRow(1);
    }

    // Add monster rows (data is already sorted alphabetically in JSON)
    monsters.forEach(monster => {
        const row = table.insertRow();
        
        // Monster name
        const nameCell = row.insertCell();
        nameCell.textContent = monster.name;
        
        // Min. Level
        const levelCell = row.insertCell();
        levelCell.textContent = monster.minLevel;
        
        // Points (charmPoints)
        const pointsCell = row.insertCell();
        pointsCell.textContent = monster.charmPoints;
        
        // Effort
        const effortCell = row.insertCell();
        effortCell.textContent = monster.effort;
        
        // Rapid Recommended?
        const rapidCell = row.insertCell();
        rapidCell.textContent = monster.rapidRecommended;
        
        // Location
        const locationCell = row.insertCell();
        locationCell.textContent = monster.location;
        
        // Notes
        const notesCell = row.insertCell();
        notesCell.textContent = monster.notes;
    });

    console.log('Table populated with', monsters.length, 'monsters');
}

function createSampleData(table) {
    console.log('Creating sample data...');
    
    const sampleMonsters = [
        { name: "Dragon", charmPoints: 25, minLevel: 0, effort: "Low", rapidRecommended: "No", location: "N/A", notes: "N/A" },
        { name: "Dragon Lord", charmPoints: 25, minLevel: 0, effort: "Low", rapidRecommended: "No", location: "N/A", notes: "N/A" },
        { name: "Frost Dragon", charmPoints: 25, minLevel: 0, effort: "Low", rapidRecommended: "No", location: "N/A", notes: "N/A" },
        { name: "Ancient Scarab", charmPoints: 25, minLevel: 0, effort: "Low", rapidRecommended: "No", location: "N/A", notes: "N/A" },
        { name: "Bonebeast", charmPoints: 25, minLevel: 0, effort: "Low", rapidRecommended: "No", location: "N/A", notes: "N/A" }
    ];

    populateTable(table, sampleMonsters);
}

// Try to initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBestiaryGuide);
} else {
    // DOM is already loaded
    initializeBestiaryGuide();
}
