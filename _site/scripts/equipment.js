function apply_filters() {
	let vocation = get_active_vocation()

	// Get level filter value from dropdown
	let level_selection = document.getElementById('level_filter_' + vocation).value

	// Get type filter value from dropdown
	let type_selection = document.getElementById('type_filter_' + vocation).value

	// Get protection filter value from dropdown
	let protection_selection = document.getElementById('protection_filter_' + vocation).value

	// Get weapon filter values (only for knight)
	let weapon_type_selection = "All"
	let weapon_damage_type_selection = "All"
	if (vocation === "knight") {
		weapon_type_selection = document.getElementById('weapon_filter_knight').value
		weapon_damage_type_selection = document.getElementById('weapon_damage_type_filter_knight').value
	}
	
	// Get weapon damage type filter value (for monk)
	if (vocation === "monk") {
		weapon_damage_type_selection = document.getElementById('weapon_damage_type_filter_monk').value
	}

	filter_equipment_table(level_selection, type_selection, protection_selection, weapon_type_selection, weapon_damage_type_selection, vocation)
}

function handle_type_filter_change() {
	let vocation = get_active_vocation()
	
	// Reset weapon damage type filter to 'All' for Knight and Monk
	if (vocation === "knight") {
		document.getElementById('weapon_damage_type_filter_knight').value = 'All'
	} else if (vocation === "monk") {
		document.getElementById('weapon_damage_type_filter_monk').value = 'All'
	}
	
	// Apply the filters
	apply_filters()
}

function filter_equipment_table(level_selection, type_selection, protection_selection, weapon_type_selection, weapon_damage_type_selection, vocation) {
	let apply_level_filter = false
	if (level_selection != "0") {
		apply_level_filter = true
	}
	let level_over = true
	if (level_selection.includes("<")) {
		level_over = false
	}
	level_selection = parseInt(level_selection.replace("<", "").replace("+", ""))

	let equipment_table = document.getElementById("equipment_table_" + vocation);
	let number_of_rows = equipment_table.rows.length;
	unfilter_equipment_table(vocation);
	for (let i = number_of_rows - 1; i > 0; i--) {
		let level_value = equipment_table.rows[i].cells[0].childNodes[0].data;
		if (apply_level_filter) {
			if (level_over) {
				if (parseInt(level_value) < level_selection) {
					equipment_table.rows[i].style.display = 'none'
				}
			}
			else {
				if (parseInt(level_value) > level_selection) {
					equipment_table.rows[i].style.display = 'none'
				}
			}
		}

		let type_value = equipment_table.rows[i].cells[3].childNodes[0].data;
		if (type_selection != "All") {
			if (!type_value.includes(type_selection)) {
				equipment_table.rows[i].style.display = 'none'
			}
		}

		let protection_value = equipment_table.rows[i].cells[4].childNodes[0].data;
		if (protection_selection != "All") {
			if (protection_value.includes('All')) {
				continue
			}
			else if (!protection_value.includes(protection_selection)) {
				equipment_table.rows[i].style.display = 'none'
			}
		}

		if (vocation == "knight") {
			if (weapon_type_selection != "All") {
				let weapon_type_value = equipment_table.rows[i].cells[3].childNodes[0].data;
				if (weapon_type_value.includes("Weapon")) {
					if (!weapon_type_value.includes(weapon_type_selection)) {
						equipment_table.rows[i].style.display = 'none'
					}
				}
			}
			if (weapon_damage_type_selection != "All") {
				let weapon_type_value = equipment_table.rows[i].cells[3].childNodes[0].data;
				if (!weapon_type_value.includes("Weapon")) {
					equipment_table.rows[i].style.display = 'none'
				}
				else {
					let weapon_damage_type_value = equipment_table.rows[i].cells[2].innerHTML;
					if (!weapon_damage_type_value.includes(weapon_damage_type_selection)) {
						equipment_table.rows[i].style.display = 'none'
					}
				}
			}
		}
		
		if (vocation == "monk") {
			if (weapon_damage_type_selection != "All") {
				let weapon_type_value = equipment_table.rows[i].cells[3].childNodes[0].data;
				if (!weapon_type_value.includes("Weapon")) {
					equipment_table.rows[i].style.display = 'none'
				}
				else {
					let weapon_damage_type_value = equipment_table.rows[i].cells[2].innerHTML;
					if (!weapon_damage_type_value.includes(weapon_damage_type_selection)) {
						equipment_table.rows[i].style.display = 'none'
					}
				}
			}
		}
	}
}

function unfilter_equipment_table(vocation) {
	let equipment_table = document.getElementById("equipment_table_" + vocation);
	let number_of_rows = equipment_table.rows.length;
	for (let i = number_of_rows - 1; i > 0; i--) {
		equipment_table.rows[i].style.display = 'table-row'
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