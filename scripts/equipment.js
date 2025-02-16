function apply_filters() {
	let vocation = get_active_vocation()

	let level_elements = document.getElementsByName('level_filter_choice_' + vocation);
	let level_selection
	for (let i = 0; i < level_elements.length; i++) {
		if (level_elements[i].checked) {
			level_selection = level_elements[i].value;
		}
	}

	let type_elements = document.getElementsByName('type_filter_choice_' + vocation);
	let type_selection
	for (let i = 0; i < type_elements.length; i++) {
		if (type_elements[i].checked) {
			type_selection = type_elements[i].value;
		}
	}

	let protection_elements = document.getElementsByName('protection_filter_choice_' + vocation);
	let protection_selection
	for (let i = 0; i < protection_elements.length; i++) {
		if (protection_elements[i].checked) {
			protection_selection = protection_elements[i].value;
		}
	}

	let weapon_elements = document.getElementsByName('weapon_filter_choice_knight');
	let weapon_type_selection
	for (let i = 0; i < weapon_elements.length; i++) {
		if (weapon_elements[i].checked) {
			weapon_type_selection = weapon_elements[i].value;
		}
	}
	filter_equipment_table(level_selection, type_selection, protection_selection, weapon_type_selection, vocation)
}

function filter_equipment_table(level_selection, type_selection, protection_selection, weapon_type_selection, vocation) {
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
			if (!protection_value.includes(protection_selection)) {
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