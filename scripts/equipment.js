function apply_level_filter() {
	let elements = document.getElementsByName('level_filter_choice');
	for (let i = 0; i < elements.length; i++) {
		if (elements[i].checked) {
			filter_equipment_table_by_level(parseInt(elements[i].value));
			return;
		}
	}
}

function filter_equipment_table_by_level(level_filter) {
    let vocation = get_active_vocation()
	let equipment_table = document.getElementById("equipment_table_" + vocation);
	let number_of_rows = equipment_table.rows.length;
	unfilter_equipment_table_by_level(vocation);
	for (let i = number_of_rows - 1; i > 0; i--) {
		let level_value = equipment_table.rows[i].cells[0].childNodes[0].data;
		if (parseInt(level_value) < level_filter) {
			equipment_table.rows[i].style.display = 'none'
		}
	}
}

function unfilter_equipment_table_by_level(vocation) {
	let equipment_table = document.getElementById("equipment_table_" + vocation);
	let number_of_rows = equipment_table.rows.length;
	for (let i = number_of_rows - 1; i > 0; i--) {
		equipment_table.rows[i].style.display = 'table-row'
	}
}

function apply_type_filter() {
	let elements = document.getElementsByName('type_filter_choice');
	for (let i = 0; i < elements.length; i++) {
		if (elements[i].checked) {
			filter_equipment_table_by_type(elements[i].value);
			return;
		}
	}
}

function filter_equipment_table_by_type(type) {
    let vocation = get_active_vocation()
	let equipment_table = document.getElementById("equipment_table_" + vocation);
	let number_of_rows = equipment_table.rows.length;
	unfilter_equipment_table_by_level(vocation);
	for (let i = number_of_rows - 1; i > 0; i--) {
		let level_value = equipment_table.rows[i].cells[0].childNodes[0].data;
		if (parseInt(level_value) < level_filter) {
			equipment_table.rows[i].style.display = 'none'
		}
	}
}

function unfilter_equipment_table_by_type(vocation) {
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