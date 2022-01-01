function apply_level_filter() {
    main_content = document.getElementById("main-content");

    if (filter_value = document.getElementById("all_choice").checked) {
        unfilter_hunting_table()
    }
    else if (filter_value = document.getElementById("50_choice").checked) {
        filter_hunting_table('50')
    }
    else if (filter_value = document.getElementById("100_choice").checked) {
        filter_hunting_table('100')
    }
    else if (filter_value = document.getElementById("130_choice").checked) {
        filter_hunting_table('130')
    }
    else if (filter_value = document.getElementById("200_choice").checked) {
        filter_hunting_table('200')
    }
    else if (filter_value = document.getElementById("300_choice").checked) {
        filter_hunting_table('300')
    }
    else if (filter_value = document.getElementById("400_choice").checked) {
        filter_hunting_table('400')
    }
}

function filter_hunting_table(level_filter) {
    hunting_table = document.getElementById("hunting_table");
    number_of_rows = hunting_table.rows.length;
    unfilter_hunting_table();
    for (i = number_of_rows - 1; i > 0; i--) {
        level_value = hunting_table.rows[i].cells[0].childNodes[0].data
        level_value = level_value.replace("+", "")
        if (parseInt(level_value) < parseInt(level_filter)) {
            hunting_table.rows[i].style.display = 'none'
        }
    }
}

function unfilter_hunting_table() {
    hunting_table = document.getElementById("hunting_table");
    number_of_rows = hunting_table.rows.length;
    for (i = number_of_rows - 1; i > 0; i--) {
        hunting_table.rows[i].style.display = 'table-row'
    }
}