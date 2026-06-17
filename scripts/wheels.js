function applyWheelColorCoding() {
	const colorMap = {
		'Fire':    'rune-fire',
		'Energy':  'rune-energy',
		'Death':   'rune-death',
		'Ice':     'rune-ice',
		'Earth':   'rune-earth',
		'Physical':'rune-physical'
	};

	function findColorClass(text) {
		for (const [keyword, cls] of Object.entries(colorMap)) {
			if (text === keyword || text.startsWith(keyword + ' ')) {
				return cls;
			}
		}
		return null;
	}

	function colorizeCell(cell) {
		const text = cell.textContent.trim();
		if (!text) return;

		const tokens = text.split(/([,\/])/);
		const parts = [];
		const separators = [];
		for (let i = 0; i < tokens.length; i++) {
			if (i % 2 === 0) {
				const part = tokens[i].trim();
				if (part.length > 0) parts.push(part);
			} else {
				separators.push(tokens[i]);
			}
		}

		if (parts.length === 0) return;

		if (parts.length === 1) {
			const value = parts[0];
			const colorClass = findColorClass(value);
			if (colorClass) {
				cell.classList.add(colorClass);
			}
		} else {
			let newHTML = '';
			parts.forEach((part, index) => {
				const colorClass = findColorClass(part);
				newHTML += colorClass ? `<span class="${colorClass}">${part}</span>` : part;
				if (index < parts.length - 1) {
					newHTML += '/';
				}
			});
			cell.innerHTML = newHTML;
		}
	}

	const table = document.getElementById('wheels_table_sorcerer');
	if (!table) return;
	const rows = table.querySelectorAll('tr');
	for (let i = 1; i < rows.length; i++) {
		const cell = rows[i].cells[2];
		if (cell) colorizeCell(cell);
	}
}

document.addEventListener('DOMContentLoaded', applyWheelColorCoding);
