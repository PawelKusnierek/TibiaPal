function apply_filters() {
	let level_elements = document.getElementsByName('level_filter_choice');
    let level_selection
    let type_elements = document.getElementsByName('type_filter_choice');
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
    filter_equipment_table(level_selection, type_selection)
}

function filter_equipment_table(level_selection, type_selection) {
    console.log(level_selection)
    console.log(type_selection)

    let vocation = get_active_vocation()
	let equipment_table = document.getElementById("equipment_table_" + vocation);
	let number_of_rows = equipment_table.rows.length;
	unfilter_equipment_table(vocation);
	for (let i = number_of_rows - 1; i > 0; i--) {
		let level_value = equipment_table.rows[i].cells[0].childNodes[0].data;
		if (parseInt(level_value) < level_selection) {
			equipment_table.rows[i].style.display = 'none'
		}
        let type_value = equipment_table.rows[i].cells[2].childNodes[0].data;
        if (type_selection != "All") {
            if (type_value != type_selection) {
                equipment_table.rows[i].style.display = 'none'
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