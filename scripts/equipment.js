function apply_filters() {
	let vocation = get_active_vocation()
	let level_elements = document.getElementsByName('level_filter_choice_' + vocation);
    let level_selection
    let type_elements = document.getElementsByName('type_filter_choice_' + vocation);
	let type_selection
    let weapon_elements = document.getElementsByName('weapon_filter_choice_knight');
	let weapon_type_selection
	for (let i = 0; i < level_elements.length; i++) {
		if (level_elements[i].checked) {
			level_selection = parseInt(level_elements[i].value);
		}
	}
    for (let i = 0; i < type_elements.length; i++) {
		if (type_elements[i].checked) {
			type_selection = type_elements[i].value;
		}
	}
	for (let i = 0; i < weapon_elements.length; i++) {
		if (weapon_elements[i].checked) {
			weapon_type_selection = weapon_elements[i].value;
		}
	}
    filter_equipment_table(level_selection, type_selection, weapon_type_selection, vocation)
}

function filter_equipment_table(level_selection, type_selection, weapon_type_selection, vocation) {
	let equipment_table = document.getElementById("equipment_table_" + vocation);
	let number_of_rows = equipment_table.rows.length;
	unfilter_equipment_table(vocation);
	for (let i = number_of_rows - 1; i > 0; i--) {
		let level_value = equipment_table.rows[i].cells[0].childNodes[0].data;
		if (parseInt(level_value) < level_selection) {
			equipment_table.rows[i].style.display = 'none'
		}
        let type_value = equipment_table.rows[i].cells[3].childNodes[0].data;
        if (type_selection != "All") {
			if (!type_value.includes(type_selection)) {
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