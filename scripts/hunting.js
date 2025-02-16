function apply_level_filter() {
	let vocation = get_active_vocation()

	let elements = document.getElementsByName('level_filter_choice_' + vocation);
	for (let i = 0; i < elements.length; i++) {
		if (elements[i].checked) {
			filter_hunting_table(parseInt(elements[i].value), vocation);
			return;
		}
	}
}

function filter_hunting_table(level_filter, vocation) {
	let hunting_table = document.getElementById("hunting_table_" + vocation);
	let number_of_rows = hunting_table.rows.length;
	unfilter_hunting_table(vocation);
	for (let i = number_of_rows - 1; i > 0; i--) {
		let level_value = hunting_table.rows[i].cells[0].childNodes[0].data;
		level_value = level_value.replace("+", "")
		if (parseInt(level_value) < level_filter) {
			hunting_table.rows[i].style.display = 'none'
		}
	}
}

function unfilter_hunting_table(vocation) {
	let hunting_table = document.getElementById("hunting_table_" + vocation);
	let number_of_rows = hunting_table.rows.length;
	for (let i = number_of_rows - 1; i > 0; i--) {
		hunting_table.rows[i].style.display = 'table-row'
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