function submit_imbue_type() {
    imbue_type = document.getElementById("imbue").value
    firstitemvalue_label = document.getElementById("firstitemvalue_label")
    seconditemvalue_label = document.getElementById("seconditemvalue_label")
    thirditemvalue_label = document.getElementById("thirditemvalue_label")

    if (imbue_type.includes("Vampirism")) {
        firstitemvalue_label.innerHTML = "Vampire Teeth value:"
        seconditemvalue_label.innerHTML = "Bloody Pincers value:"
        thirditemvalue_label.innerHTML = "Piece of Dead Brain value:"
        firstitemvalue_label.innerText = "Vampire Teeth value:"
        seconditemvalue_label.innerText = "Bloody Pincers value:"
        thirditemvalue_label.innerText = "Piece of Dead Brain value:"
    }
    else if (imbue_type.includes("Strike")) {
        firstitemvalue_label.innerHTML = "Protective Charms value:"
        seconditemvalue_label.innerHTML = "Sabreteeth value:"
        thirditemvalue_label.innerHTML = "Vexclaw Talons value:"
        firstitemvalue_label.innerText = "Protective Charms value:"
        seconditemvalue_label.innerText = "Sabreteeth value:"
        thirditemvalue_label.innerText = "Vexclaw Talons value:"
    }
    else if (imbue_type.includes("Void")) {
        firstitemvalue_label.innerHTML = "Rope Belts value:"
        seconditemvalue_label.innerHTML = "Silencer Claws value:"
        thirditemvalue_label.innerHTML = "Grimeleech Wings value:"
        firstitemvalue_label.innerText = "Rope Belts value:"
        seconditemvalue_label.innerText = "Silencer Claws value:"
        thirditemvalue_label.innerText = "Grimeleech Wings value:"
    }
    document.getElementById("imbueitemsform").style.display = "inline-block"
    document.getElementById("imbueitemsform").style.textAlign = "left"
}

function submit_imbue_values() {
    imbue_type = document.getElementById("imbue").value
    goldtokenvalue = document.getElementById("goldtokenvalue").value
    firstitemvalue = document.getElementById("firstitemvalue").value
    seconditemvalue = document.getElementById("seconditemvalue").value
    thirditemvalue = document.getElementById("thirditemvalue").value
    imbue_results = document.getElementById("imbue_results")
    imbue_results.style.display = "initial"



    basic_message = "<br>For <span style=\"color:orange\">BASIC " + imbue_type + "</span> imbue you should buy "
    intricate_message = "For <span style=\"color:orange\">INTRICATE " + imbue_type + "</span> imbue you should buy "
    powerful_message = "For <span style=\"color:orange\">POWERFUL " + imbue_type + "</span> imbue you should buy "
    total_message = "for a total cost of: "
    per_hour_message = "Adding imbue shrine cost at 100% success chance, this works out at a total cost of: "

    powerful_imbue_label = document.getElementById("powerful_imbue_label")
    intricate_imbue_label = document.getElementById("intricate_imbue_label")
    basic_imbue_label = document.getElementById("basic_imbue_label")

    powerful_gold_token_cell_decision = document.getElementById("powerful_gold_token_cell_decision")
    powerful_first_imbue_item_cell_decision = document.getElementById("powerful_first_imbue_item_cell_decision")
    powerful_second_imbue_item_cell_decision = document.getElementById("powerful_second_imbue_item_cell_decision")
    powerful_third_imbue_item_cell_decision = document.getElementById("powerful_third_imbue_item_cell_decision")

    intricate_gold_token_cell_decision = document.getElementById("intricate_gold_token_cell_decision")
    intricate_first_imbue_item_cell_decision = document.getElementById("intricate_first_imbue_item_cell_decision")
    intricate_second_imbue_item_cell_decision = document.getElementById("intricate_second_imbue_item_cell_decision")

    basic_gold_token_cell_decision = document.getElementById("basic_gold_token_cell_decision")
    basic_first_imbue_item_cell_decision = document.getElementById("basic_first_imbue_item_cell_decision")

    first_imbue_item_cells = document.getElementsByClassName("first_imbue_item_cell")
    second_imbue_item_cells = document.getElementsByClassName("second_imbue_item_cell")
    third_imbue_item_cells = document.getElementsByClassName("third_imbue_item_cell")

    powerful_imbue_cost_paragraph = document.getElementById("powerful_imbue_cost_paragraph")
    intricate_imbue_cost_paragraph = document.getElementById("intricate_imbue_cost_paragraph")
    basic_imbue_cost_paragraph = document.getElementById("basic_imbue_cost_paragraph")

    if (imbue_type.includes("Vampirism")) {
        initialTablePopulate("Vampire Teeth", "Bloody Pincers", "Piece of Dead Brain")
        powerful_imbue = calculate_powerful_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 15, thirditemvalue, 5)
        intricate_imbue = calculate_intricate_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 15)
        basic_imbue = calculate_basic_imbue(goldtokenvalue, firstitemvalue, 25)
    }
    else if (imbue_type.includes("Strike")) {
        initialTablePopulate("Protective Charms", "Sabreteeth", "Vexclaw Talons")
        powerful_imbue = calculate_powerful_imbue(goldtokenvalue, firstitemvalue, 20, seconditemvalue, 25, thirditemvalue, 5)
        intricate_imbue = calculate_intricate_imbue(goldtokenvalue, firstitemvalue, 20, seconditemvalue, 25)
        basic_imbue = calculate_basic_imbue(goldtokenvalue, firstitemvalue, 20)
    }
    else if (imbue_type.includes("Void")) {
        initialTablePopulate("Rope Belts", "Silencer Claws", "Some Grimeleech Wings")
        powerful_imbue = calculate_powerful_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 25, thirditemvalue, 5)
        intricate_imbue = calculate_intricate_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 25)
        basic_imbue = calculate_basic_imbue(goldtokenvalue, firstitemvalue, 25)
    }

    powerful_imbue_cost_paragraph.innerHTML = "Total cost (with 100% imbue shrine chance): " + powerful_imbue[1] + " gold, which is: " + Math.round(powerful_imbue[1]/20) + " gold per hour."
    intricate_imbue_cost_paragraph.innerHTML = "Total cost (with 100% imbue shrine chance): " + intricate_imbue[1] + " gold, which is: " + Math.round(intricate_imbue[1]/20) + " gold per hour."
    basic_imbue_cost_paragraph.innerHTML = "Total cost (with 100% imbue shrine chance): " + basic_imbue[1] + " gold, which is: " + Math.round(basic_imbue[1]/20) + " gold per hour."


    if (powerful_imbue[0] == "all_items") {
        powerful_gold_token_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        powerful_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
        powerful_second_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
        powerful_third_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
    }
    else if (powerful_imbue[0] == "all_tokens") {
        powerful_gold_token_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, Powerful - 6 tokens</span>"
        powerful_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        powerful_second_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        powerful_third_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
    }
    else if (powerful_imbue[0] == "intricate") {
        powerful_gold_token_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, Intricate - 4 tokens</span>"
        powerful_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        powerful_second_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        powerful_third_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
    }
    else if (powerful_imbue[0] == "basic") {
        powerful_gold_token_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, Basic - 2 tokens</span>"
        powerful_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        powerful_second_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
        powerful_third_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
    }

    if (intricate_imbue[0] == "all_items") {
        intricate_gold_token_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        intricate_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
        intricate_second_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
    }
    else if (intricate_imbue[0] == "all_tokens") {
        intricate_gold_token_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, Intricate - 4 tokens</span>"
        intricate_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        intricate_second_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
    }
    else if (intricate_imbue[0] == "basic") {
        intricate_gold_token_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, Basic - 2 tokens</span>"
        intricate_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        intricate_second_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
    }

    if (basic_imbue[0] == "all_items") {
        basic_gold_token_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
        basic_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, from market</span>"
    }
    else if (basic_imbue[0] == "all_tokens") {
        basic_gold_token_cell_decision.innerHTML = "<span id=\"profit_positive\">Yes, Basic - 2 tokens</span>"
        basic_first_imbue_item_cell_decision.innerHTML = "<span id=\"profit_negative\">No</span>"
    } 
}

function initialTablePopulate(first_item, second_item, third_item) {
    powerful_imbue_label.innerHTML = "POWERFUL " + imbue_type
    intricate_imbue_label.innerHTML = "INTRICATE " + imbue_type
    basic_imbue_label.innerHTML = "BASIC " + imbue_type

    for (var i = 0; i < first_imbue_item_cells.length; i++) {
        first_imbue_item_cells[i].innerHTML = first_item
    }
    for (var i = 0; i < second_imbue_item_cells.length; i++) {
        second_imbue_item_cells[i].innerHTML = second_item
    }
    for (var i = 0; i < third_imbue_item_cells.length; i++) {
        third_imbue_item_cells[i].innerHTML = third_item
    }
}

function calculate_basic_imbue(gold_token_value, first_item_value, first_item_quantity) {
    results = []
    items_total = (first_item_value * first_item_quantity)
    gold_token_total = (gold_token_value * 2)
    if (gold_token_total > items_total) {
        results.push("all_items")
        results.push(items_total + 15000)
    }
    else {
        results.push("all_tokens")
        results.push(gold_token_total + 15000)
    }
    return results
}

function calculate_intricate_imbue(gold_token_value, first_item_value, first_item_quantity, second_item_value, second_item_quantity) {
    results = []
    all_items_total = first_item_value * first_item_quantity + second_item_value * second_item_quantity
    all_gold_tokens_total = gold_token_value * 4
    all_lowest_cost = Math.min(all_items_total, all_gold_tokens_total)

    basic_gold_tokens_total = (gold_token_value * 2) + (second_item_value * second_item_quantity)

    if (basic_gold_tokens_total > all_lowest_cost) {
        if (all_gold_tokens_total > all_items_total) {
            results.push("all_items")
            results.push(all_items_total + 55000)
        }
        else {
            results.push("all_tokens")
            results.push(all_gold_tokens_total + 55000)
        }
    }
    else {
        results.push("basic")
        results.push(basic_gold_tokens_total + 55000)
    }
    return results
}

function calculate_powerful_imbue(gold_token_value, first_item_value, first_item_quantity, second_item_value, second_item_quantity, third_item_value, third_item_quantity) {
    results = []
    all_items_total = (first_item_value * first_item_quantity) + (second_item_value * second_item_quantity) + (third_item_value * third_item_quantity)
    all_gold_tokens_total = gold_token_value * 6
    all_lowest_cost = Math.min(all_items_total, all_gold_tokens_total)

    intricate_gold_tokens_total = (gold_token_value * 4) + (third_item_value * third_item_quantity)
    basic_gold_tokens_total = (gold_token_value * 2) + (second_item_value * second_item_quantity) + (third_item_value * third_item_quantity)

    if (Math.min(all_lowest_cost, intricate_gold_tokens_total, basic_gold_tokens_total) == all_lowest_cost) {
        if (all_gold_tokens_total > all_items_total) {
            results.push("all_items")
            results.push(all_items_total + 150000)
        }
        else {
            results.push("all_tokens")
            results.push(all_gold_tokens_total + 150000)
        }
    }
    else if (Math.min(all_lowest_cost, intricate_gold_tokens_total, basic_gold_tokens_total) == intricate_gold_tokens_total) {
        results.push("intricate")
        results.push(intricate_gold_tokens_total + 150000)
    }
    else if (Math.min(all_lowest_cost, intricate_gold_tokens_total, basic_gold_tokens_total) == basic_gold_tokens_total) {
        results.push("basic")
        results.push(basic_gold_tokens_total + 150000)
    }
    return results
}