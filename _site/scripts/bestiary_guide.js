// Bestiary Guide functionality
function initializeBestiaryGuide() {
    console.log('Initializing bestiary guide...');

    const searchInput = document.getElementById('monsterSearch');
    const table = document.getElementById('bestiaryTable');

    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }

    if (!table) {
        console.error('Table not found!');
        return;
    }

    // Load and populate monster data
    loadMonsterData(table);

    // Set up search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        console.log('Searching for:', searchTerm);

        const rows = table.getElementsByTagName('tr');
        
        // Start from index 1 to skip the header row
        for (let i = 1; i < rows.length; i++) {
            const monsterName = rows[i].cells[0].textContent.toLowerCase();

            if (monsterName.includes(searchTerm)) {
                rows[i].style.display = '';
                console.log('Showing:', monsterName);
            } else {
                rows[i].style.display = 'none';
                console.log('Hiding:', monsterName);
            }
        }
    });

    console.log('Bestiary guide initialized successfully');
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
        
        // Points (charmPoints)
        const pointsCell = row.insertCell();
        pointsCell.textContent = monster.charmPoints;
        
        // Effort
        const effortCell = row.insertCell();
        effortCell.textContent = monster.effort;
        
        // Rapid Recommended?
        const rapidCell = row.insertCell();
        rapidCell.textContent = monster.rapidRecommended;
        
        // Rapid Location
        const rapidLocCell = row.insertCell();
        rapidLocCell.textContent = monster.rapidLocation;
        
        // Regular Location
        const regularLocCell = row.insertCell();
        regularLocCell.textContent = monster.regularLocation;
        
        // Notes
        const notesCell = row.insertCell();
        notesCell.textContent = monster.notes;
    });

    console.log('Table populated with', monsters.length, 'monsters');
}

function createSampleData(table) {
    console.log('Creating sample data...');
    
    const sampleMonsters = [
        { name: "Dragon", charmPoints: 25, effort: "Low", rapidRecommended: "No", rapidLocation: "N/A", regularLocation: "N/A", notes: "N/A" },
        { name: "Dragon Lord", charmPoints: 25, effort: "Low", rapidRecommended: "No", rapidLocation: "N/A", regularLocation: "N/A", notes: "N/A" },
        { name: "Frost Dragon", charmPoints: 25, effort: "Low", rapidRecommended: "No", rapidLocation: "N/A", regularLocation: "N/A", notes: "N/A" },
        { name: "Ancient Scarab", charmPoints: 25, effort: "Low", rapidRecommended: "No", rapidLocation: "N/A", regularLocation: "N/A", notes: "N/A" },
        { name: "Bonebeast", charmPoints: 25, effort: "Low", rapidRecommended: "No", rapidLocation: "N/A", regularLocation: "N/A", notes: "N/A" }
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
