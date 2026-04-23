function sort_quest_table() {
	let tbody = document.querySelector("#quest_table tbody")
	let rows = Array.from(tbody.querySelectorAll("tr"))

	rows.sort(function(a, b) {
		let level_a = parseInt(a.cells[0].textContent)
		let level_b = parseInt(b.cells[0].textContent)
		if (level_a !== level_b) return level_a - level_b

		let name_a = a.cells[1].textContent.trim().toLowerCase()
		let name_b = b.cells[1].textContent.trim().toLowerCase()
		return name_a.localeCompare(name_b)
	})

	rows.forEach(row => tbody.appendChild(row))
}

document.addEventListener("DOMContentLoaded", sort_quest_table)

function apply_filters() {
	let level_selection = document.getElementById('level_filter').value
	let team_selection = document.getElementById('team_filter').value
	let boss_selection = document.getElementById('boss_filter').value
	let hunt_selection = document.getElementById('hunt_filter').value

	filter_quest_table(level_selection, team_selection, boss_selection, hunt_selection)
}

function filter_quest_table(level_selection, team_selection, boss_selection, hunt_selection) {
	let apply_level_filter = level_selection != "0"
	let level_over = !level_selection.includes("<")
	let level_value = parseInt(level_selection.replace("<", "").replace("+", ""))

	let quest_table = document.getElementById("quest_table")
	let number_of_rows = quest_table.rows.length

	unfilter_quest_table()

	for (let i = number_of_rows - 1; i > 0; i--) {
		let row = quest_table.rows[i]

		if (apply_level_filter) {
			let row_level = parseInt(row.cells[0].childNodes[0].data)
			if (level_over) {
				if (row_level < level_value) {
					row.style.display = 'none'
					continue
				}
			} else {
				if (row_level > level_value) {
					row.style.display = 'none'
					continue
				}
			}
		}

		if (team_selection != "All") {
			if (row.cells[2].dataset.value != team_selection) {
				row.style.display = 'none'
				continue
			}
		}

		if (boss_selection != "All") {
			if (row.cells[3].dataset.value != boss_selection) {
				row.style.display = 'none'
				continue
			}
		}

		if (hunt_selection != "All") {
			if (row.cells[4].dataset.value != hunt_selection) {
				row.style.display = 'none'
				continue
			}
		}
	}
}

function unfilter_quest_table() {
	let quest_table = document.getElementById("quest_table")
	let number_of_rows = quest_table.rows.length
	for (let i = number_of_rows - 1; i > 0; i--) {
		quest_table.rows[i].style.display = 'table-row'
	}
}
