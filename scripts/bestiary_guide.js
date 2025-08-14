// Search functionality for bestiary guide
function initializeSearch() {
    console.log('Initializing search functionality...');
    
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
    
    const rows = table.getElementsByTagName('tr');
    console.log('Found', rows.length, 'table rows');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        console.log('Searching for:', searchTerm);
        
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
    
    console.log('Search functionality initialized successfully');
}

// Try to initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
    // DOM is already loaded
    initializeSearch();
}
