// Tab switching is handled by show_tab() in onload.js

function get_active_tasks_tab() {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        if (tabcontent[i].style.display === "block") {
            return tabcontent[i].id;
        }
    }
    return "EasyTab";
}

function get_tasks_table_id(tabId) {
    const map = {
        'EasyTab':   'tasks_table_easy',
        'MediumTab': 'tasks_table_medium',
        'HardTab':   'tasks_table_hard',
    };
    return map[tabId] || 'tasks_table_easy';
}

function parse_level(text) {
    const n = parseInt(text, 10);
    return isNaN(n) ? Infinity : n;
}

function filter_tasks_by_name(filterText) {
    const tableId = get_tasks_table_id(get_active_tasks_tab());
    const table = document.getElementById(tableId);
    if (!table) return;

    const query = filterText.toLowerCase().trim();
    const rows = table.querySelectorAll('tr');

    for (let i = 1; i < rows.length; i++) {
        const nameCell = rows[i].cells[1]; // Monster is column 1
        if (!nameCell) { rows[i].style.display = 'none'; continue; }
        const match = query === '' || nameCell.textContent.trim().toLowerCase().includes(query);
        rows[i].style.display = match ? 'table-row' : 'none';
    }
}

function sort_tasks_by_level() {
    ['tasks_table_easy', 'tasks_table_medium', 'tasks_table_hard'].forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        const tbody = table.querySelector('tbody') || table;
        const rows = Array.from(tbody.querySelectorAll('tr')).slice(1);
        rows.sort((a, b) => {
            const lvlDiff = parse_level(a.cells[0].textContent) - parse_level(b.cells[0].textContent);
            if (lvlDiff !== 0) return lvlDiff;
            return a.cells[1].textContent.trim().localeCompare(b.cells[1].textContent.trim());
        });
        rows.forEach(row => tbody.appendChild(row));
    });
}

document.addEventListener('DOMContentLoaded', function () {
    sort_tasks_by_level();

    const nameFilter = document.getElementById('nameFilter');
    if (nameFilter) {
        nameFilter.addEventListener('input', function () {
            filter_tasks_by_name(this.value);
        });
    }

    document.querySelectorAll('.tasks_tab .tablinks').forEach(btn => {
        btn.addEventListener('click', function () {
            setTimeout(() => {
                const filterText = document.getElementById('nameFilter')?.value || '';
                filter_tasks_by_name(filterText);
            }, 50);
        });
    });
});
