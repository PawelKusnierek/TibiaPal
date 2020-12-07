function submit_imbue_type() {
    imbue_type = document.getElementById("imbue").value
    firstitemvalue_label = document.getElementById("firstitemvalue_label")
    seconditemvalue_label = document.getElementById("seconditemvalue_label")
    thirditemvalue_label = document.getElementById("thirditemvalue_label")

    document.getElementById("imbueform").style.display = "none"

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
    document.getElementById("imbueitemsform").style.display = "none"
    goldtokenvalue = document.getElementById("goldtokenvalue").value
    firstitemvalue = document.getElementById("firstitemvalue").value
    seconditemvalue = document.getElementById("seconditemvalue").value
    thirditemvalue = document.getElementById("thirditemvalue").value
    imbue_results = document.getElementById("imbue_results")
    imbue_results.style.display = "initial"
    document.getElementById("imbue_paragraph").style.display = "none"


    
    basic_message = "<br>For <span style=\"color:orange\">BASIC " + imbue_type + "</span> imbue you should buy "
    intricate_message = "For <span style=\"color:orange\">INTRICATE " + imbue_type + "</span> imbue you should buy "
    powerful_message = "For <span style=\"color:orange\">POWERFUL " + imbue_type + "</span> imbue you should buy "
    total_message = "for a total cost of: "
    
    if (imbue_type.includes("Vampirism")) {
        basic_imbue = calculate_basic_imbue(goldtokenvalue, firstitemvalue, 25)
        if (basic_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + basic_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + basic_imbue[1] + " gold<br><br><br>"
        }
        else if (basic_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + basic_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + basic_imbue[1] + " gold<br><br><br>"
        }

        intricate_imbue = calculate_intricate_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 15)
        if (intricate_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        else if (intricate_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        else if (intricate_imbue[0] == "basic") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "BASIC items for <span style=\"color:gold\">GOLD TOKENS</span> and Bloody Pincers from the <span style=\"color:green\">MARKET</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }

        powerful_imbue = calculate_powerful_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 15, thirditemvalue, 5)
        if (powerful_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "intricate") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "INTRICATE items for <span style=\"color:gold\">GOLD TOKENS</span> and Piece of Dead Brain from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "basic") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "BASIC items for <span style=\"color:gold\">GOLD TOKENS</span> and Bloody Pincers AND Piece of Dead Brain from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
    }
    else if (imbue_type.includes("Strike")) {
        basic_imbue = calculate_basic_imbue(goldtokenvalue, firstitemvalue, 20)
        if (basic_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + basic_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + basic_imbue[1] + " gold<br><br><br>"
        }
        else if (basic_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + basic_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + basic_imbue[1] + " gold<br><br><br>"
        }

        intricate_imbue = calculate_intricate_imbue(goldtokenvalue, firstitemvalue, 20, seconditemvalue, 25)
        if (intricate_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        else if (intricate_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        else if (intricate_imbue[0] == "basic") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "BASIC items for <span style=\"color:gold\">GOLD TOKENS</span> and Sabreteeth from the <span style=\"color:green\">MARKET</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        
        powerful_imbue = calculate_powerful_imbue(goldtokenvalue, firstitemvalue, 20, seconditemvalue, 25, thirditemvalue, 5)
        if (powerful_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "intricate") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "INTRICATE items for <span style=\"color:gold\">GOLD TOKENS</span> and Vexclaw Talons from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "basic") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "BASIC items for <span style=\"color:gold\">GOLD TOKENS</span> and Sabreteeth AND Vexclaw Talons from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
    }
    else if (imbue_type.includes("Void")) {
        basic_imbue = calculate_basic_imbue(goldtokenvalue, firstitemvalue, 25)
        if (basic_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + basic_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + basic_imbue[1] + " gold<br><br><br>"
        }
        else if (basic_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + basic_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + basic_imbue[1] + " gold<br><br><br>"
        }
        intricate_imbue = calculate_intricate_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 25)
        if (intricate_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        else if (intricate_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        else if (intricate_imbue[0] == "basic") {
            imbue_results.innerHTML = imbue_results.innerHTML + intricate_message + "BASIC items for <span style=\"color:gold\">GOLD TOKENS</span> and Silencer Claws from the <span style=\"color:green\">MARKET</span> " + total_message + intricate_imbue[1] + " gold<br><br><br>"
        }
        powerful_imbue = calculate_powerful_imbue(goldtokenvalue, firstitemvalue, 25, seconditemvalue, 25, thirditemvalue, 5)
        if (powerful_imbue[0] == "all_items") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "ALL ITEMS from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "all_tokens") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "ALL ITEMS for <span style=\"color:gold\">GOLD TOKENS</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "intricate") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "INTRICATE items for <span style=\"color:gold\">GOLD TOKENS</span> and Piece of Dead Brain from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
        else if (powerful_imbue[0] == "basic") {
            imbue_results.innerHTML = imbue_results.innerHTML + powerful_message + "BASIC items for <span style=\"color:gold\">GOLD TOKENS</span> and Silencer Claws AND Grimeleech Wings from the <span style=\"color:green\">MARKET</span> " + total_message + powerful_imbue[1] + " gold<br>"
        }
    }
}

function calculate_basic_imbue(gold_token_value, first_item_value, first_item_quantity) {
    results = []
    items_total = first_item_value * first_item_quantity
    gold_token_total = gold_token_value * 2
    if (gold_token_total > items_total) {
        results.push("all_items")
        results.push(items_total)
    }
    else {
        results.push("all_tokens")
        results.push(gold_token_total)
    }
    return results
}

function calculate_intricate_imbue(gold_token_value, first_item_value, first_item_quantity, second_item_value, second_item_quantity) {
    results = []
    all_items_total = first_item_value * first_item_quantity + second_item_value * second_item_quantity
    all_gold_tokens_total = gold_token_value * 4
    all_lowest_cost = Math.min(all_items_total, all_gold_tokens_total)

    basic_gold_tokens_total = gold_token_value * 2 * second_item_value * second_item_quantity

    if (basic_gold_tokens_total > all_lowest_cost) {
        if (all_gold_tokens_total > all_items_total) {
            results.push("all_items")
            results.push(all_items_total)
        }
        else {
            results.push("all_tokens")
            results.push(all_gold_tokens_total)
        }
    }
    else {
        results.push("basic")
        results.push(basic_gold_tokens_total)
    }
    return results
}

function calculate_powerful_imbue(gold_token_value, first_item_value, first_item_quantity, second_item_value, second_item_quantity, third_item_value, third_item_quantity) {
    results = []
    all_items_total = first_item_value * first_item_quantity + second_item_value * second_item_quantity + third_item_value * third_item_quantity
    all_gold_tokens_total = gold_token_value * 6
    all_lowest_cost = Math.min(all_items_total, all_gold_tokens_total)

    intricate_gold_tokens_total = gold_token_value * 4 + third_item_value * third_item_quantity
    basic_gold_tokens_total = gold_token_value * 2 + second_item_value * second_item_quantity + third_item_value * third_item_quantity

    if (Math.min(all_lowest_cost, intricate_gold_tokens_total, basic_gold_tokens_total) == all_lowest_cost) {
        if (all_gold_tokens_total > all_items_total) {
            results.push("all_items")
            results.push(all_items_total)
        }
        else {
            results.push("all_tokens")
            results.push(all_gold_tokens_total)
        }
    }
    else if (Math.min(all_lowest_cost, intricate_gold_tokens_total, basic_gold_tokens_total) == intricate_gold_tokens_total) {
        results.push("intricate")
        results.push(intricate_gold_tokens_total)
    }
    else if (Math.min(all_lowest_cost, intricate_gold_tokens_total, basic_gold_tokens_total) == basic_gold_tokens_total) {
        results.push("basic")
        results.push(basic_gold_tokens_total)
    }
    return results
}