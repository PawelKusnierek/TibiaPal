// Global variables
let bestiaryTable = null;

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

    console.log('Bestiary guide initialized successfully');
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

    const rows = bestiaryTable.getElementsByTagName('tr');
    
    // Start from index 1 to skip the header row
    for (let i = 1; i < rows.length; i++) {
        const monsterName = rows[i].cells[0].textContent.toLowerCase();
        const charmPoints = parseInt(rows[i].cells[2].textContent); // Points is now in column 3 (index 2)
        const effort = rows[i].cells[3].textContent; // Effort is in column 4 (index 3)
        const rapid = rows[i].cells[4].textContent; // Rapid is in column 5 (index 4)
        
        const matchesSearch = monsterName.includes(searchTerm);
        const matchesCharmPoints = selectedCharmPoints.includes(charmPoints);
        const matchesEffort = selectedEfforts.includes(effort);
        const matchesRapid = selectedRapids.includes(rapid);
        
        if (matchesSearch && matchesCharmPoints && matchesEffort && matchesRapid) {
            rows[i].style.display = '';
            console.log('Showing:', monsterName, '(', charmPoints, 'points,', effort, 'effort,', rapid, 'rapid)');
        } else {
            rows[i].style.display = 'none';
            console.log('Hiding:', monsterName, '(', charmPoints, 'points,', effort, 'effort,', rapid, 'rapid)');
        }
    }
}

function loadMonsterData(table) {
    console.log('Loading monster data...');
    
    // Fetch the JSON data
    fetch('bestiary.json')
        .then(response => response.json())
        .then(data => {
            console.log('Loaded', data.length, 'monsters');
            populateTable(table, data);
        })
        .catch(error => {
            console.error('Error loading monster data:', error);
            // Fallback: create some sample data
            createSampleData(table);
        });
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
