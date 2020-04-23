function submit_form() {
    form = document.forms[0];
    analyser_data = form.analyserData.value.replace(" (Leader)", "");;
    total_profit = find_total_profit(analyser_data);
    number_of_players = find_total_number_of_players(analyser_data);
    profit_per_person = total_profit / number_of_players;
    players_and_their_balance = find_players_and_balance(analyser_data, number_of_players);
    who_to_pay_and_how_much = final_split(players_and_their_balance, profit_per_person, number_of_players);
    update_the_html(who_to_pay_and_how_much);
}

function find_total_profit(data) {
    index = data.indexOf("Balance: ");
    substring1 = data.substring(index + 9);
    index2 = substring1.indexOf(" ");
    substring2 = substring1.substring(0, index2);
    substring2 = substring2.split(",").join("");
    analyser_data = substring1.substring(substring2.length + 2)
    return substring2;
}

function find_total_number_of_players(data) {
    return count = (data.match(/Balance/g) || []).length;
}

function find_players_and_balance(data, number_of_players) {
    players_and_balance = []
    for (let i = 0; i < number_of_players; i++) {
        index_loot = data.indexOf("Loot:")
        name_of_player = data.substring(0, index_loot);
        name_of_player = name_of_player.trim();
        index_balance = data.indexOf("Balance: ")
        index_damage = data.indexOf("Damage: ")
        balance_of_player = data.substring(index_balance + 9, index_damage)
        balance_of_player = balance_of_player.split(",").join("");
        balance_of_player = balance_of_player.trim();
        players_and_balance.push({
            name: name_of_player,
            balance: balance_of_player
        })
        index_healing = data.indexOf("Healing: ");
        data = data.substring(index_healing + 9)
        index_space = data.indexOf(" ");
        data = data.substring(index_space + 1)
    }
    return players_and_balance;
}

function final_split(players_and_their_balance, profit_per_person, number_of_players) {
    players_and_outstanding_payment = []
    for (let i = 0; i < number_of_players; i++) {
        name = players_and_their_balance[i]['name'];
        oustanding_payment = profit_per_person - players_and_their_balance[i]['balance'];
        players_and_outstanding_payment.push({
            name: name,
            balance: oustanding_payment
        })
    }
    who_to_pay_and_how_much = []
    for (let i = 0; i < number_of_players; i++) {
        if (players_and_outstanding_payment[i]['balance'] < 0) {
            while (players_and_outstanding_payment[i]['balance'] != 0) {
                for (let j = 0; j < number_of_players; j++) {
                    if (players_and_outstanding_payment[j]['balance'] > 0) {
                        if (players_and_outstanding_payment[j]['balance'] > Math.abs(players_and_outstanding_payment[i]['balance'])) {
                            players_and_outstanding_payment[j]['balance'] = players_and_outstanding_payment[j]['balance'] + players_and_outstanding_payment[i]['balance'];
                            who_to_pay_and_how_much.push({
                                name: players_and_outstanding_payment[i]['name'],
                                amount: Math.abs(players_and_outstanding_payment[i]['balance']),
                                to_who: players_and_outstanding_payment[j]['name']
                            })
                            players_and_outstanding_payment[i]['balance'] = 0;
                        }
                        else {
                            players_and_outstanding_payment[i]['balance'] = players_and_outstanding_payment[i]['balance'] + players_and_outstanding_payment[j]['balance'];
                            players_and_outstanding_payment[j]['balance'] = Math.round(players_and_outstanding_payment[j]['balance']);
                            who_to_pay_and_how_much.push({
                                name: players_and_outstanding_payment[i]['name'],
                                amount: Math.abs(players_and_outstanding_payment[j]['balance']),
                                to_who: players_and_outstanding_payment[j]['name']
                            })
                            players_and_outstanding_payment[j]['balance'] = 0;
                        }
                    }
                }
            }
        }
    }
    return who_to_pay_and_how_much;
}

function update_the_html(who_to_pay_and_how_much) {
    output_array = [];
    for (let i = 0; i < who_to_pay_and_how_much.length; i++) {
        if (who_to_pay_and_how_much[i]['amount'] != 0) {
            if (who_to_pay_and_how_much[i]['amount'] > 1000) {
                gp_amount = who_to_pay_and_how_much[i]['amount'];
                who_to_pay_and_how_much[i]['amount'] = Math.round(who_to_pay_and_how_much[i]['amount'] / 1000)
                transfer_message = who_to_pay_and_how_much[i]['name'] + " to pay " + who_to_pay_and_how_much[i]['amount'] + "k to " + who_to_pay_and_how_much[i]['to_who'] + " (rounded " + gp_amount + " gp) ";
                output_array.push(transfer_message);
            }
            else {
                transfer_message = who_to_pay_and_how_much[i]['name'] + " to pay " + who_to_pay_and_how_much[i]['amount'] + " gp to " + who_to_pay_and_how_much[i]['to_who'];
                output_array.push(transfer_message);
            }
        }
    }
    for (let j = 0; j < output_array.length; j++) {
        document.body.innerHTML = document.body.innerHTML + "<p>" + output_array[j] + "</p>"
    }
}