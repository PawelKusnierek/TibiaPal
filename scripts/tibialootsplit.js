function initial_submit() {
  valid_data = validate_analyser_data(0);
  if (!valid_data) {
    return false;
  }

  is_regularlootsplit = document.getElementById("regularlootsplit").checked;
  is_extraexpenseslootsplit = document.getElementById("extraexpenseslootsplit")
    .checked;
  is_removeplayerslootsplit = document.getElementById("removeplayerslootsplit")
    .checked;

  if (is_regularlootsplit || is_extraexpenseslootsplit) {
    preplootsplit();
  } else if (is_removeplayerslootsplit) {
    prepare_remove_players_lootsplit();
  }
}

function preplootsplit() {
  //we remove the previous results
  extraExpensesDiv = document.getElementById("extra-expenses-div");
  resultsContent = document.getElementById("results");
  if (resultsContent.childNodes.length > 0) {
    var response = confirm("This will remove the previous result. Continue?");
    if (response == true) {
      resultsContent.innerHTML = "";
      extraExpensesDiv.innerHTML = "";
    } else {
      document.getElementById("tibialootsplitform").reset();
      return false;
    }
  }

  //getting the raw analyser data
  analyser_data = form.analyserData.value.replace(" (Leader)", "");

  // Parsing the data from the log to find out profit per person and the balance of each player
  session_date = find_session_date(analyser_data);
  session_duration = find_session_duration(analyser_data);
  remove_first_section(analyser_data);
  number_of_players = find_total_number_of_players(analyser_data);
  players_and_their_balance = find_players_and_balance(
    analyser_data,
    number_of_players
  );
  total_profit = find_total_profit(players_and_their_balance);
  profit_per_person = total_profit / number_of_players;

  // Main logic part - works very well even if looks confusing, advise againt touching....
  who_to_pay_and_how_much = final_split(
    players_and_their_balance,
    profit_per_person,
    number_of_players
  );

  if (is_regularlootsplit) {
    regularlootsplit();
  } else if (is_extraexpenseslootsplit) {
    extra_expenses_click();
  }
}

function regularlootsplit() {
  // Final update back to the site
  update_the_html(
    who_to_pay_and_how_much,
    total_profit,
    profit_per_person,
    resultsContent
  );
  update_the_history_results();
  document.getElementById("tibialootsplitform").reset();
}

function prepare_remove_players_lootsplit() {
  analyser_data = form.analyserData.value.replace(" (Leader)", "");

  //remove all other content
  remove_tibialootsplit_html();

  session_date = find_session_date(analyser_data);
  session_duration = find_session_duration(analyser_data);
  remove_first_section(analyser_data);
  number_of_players = find_total_number_of_players(analyser_data);
  players_and_their_balance = find_players_and_balance(
    analyser_data,
    number_of_players
  );

  add_players_and_checkboxes(players_and_their_balance);
}

function calculate_remove_players_click() {
  list_of_players_to_remove = [];
  list_of_players_to_keep = [];
  for (var i = 0; i < players_and_their_balance.length; i++) {
    player = players_and_their_balance[i].name;
    checkbox_player = document.getElementById(player);
    checked = checkbox_player.checked;
    if (!checked) {
      list_of_players_to_remove.push(player);
    } else {
      list_of_players_to_keep.push(player);
    }
  }
  if (list_of_players_to_remove.length > 0) {
    player_names_list = list_of_players_to_keep;
    for (var j = 0; j < list_of_players_to_remove.length; j++) {
      for (var k = players_and_their_balance.length - 1; k >= 0; k--) {
        if (players_and_their_balance[k].name == list_of_players_to_remove[j]) {
          players_and_their_balance.splice(k, 1);
        }
      }
    }
  }
  number_of_players = number_of_players - list_of_players_to_remove.length;

  total_profit = find_total_profit(players_and_their_balance);
  profit_per_person = total_profit / number_of_players;

  // Main logic part - works very well even if looks confusing, advise againt touching....
  who_to_pay_and_how_much = final_split(
    players_and_their_balance,
    profit_per_person,
    number_of_players
  );

  document.getElementById("list-remove-players").innerHTML = "";
  calculate_button = document.getElementById("submitremoveplayers");
  calculate_button.style.display = "none";

  // Final update back to the site
  var results = document.createElement("div");
  results.setAttribute("id", "results");
  main_content.appendChild(results);

  update_the_html(
    who_to_pay_and_how_much,
    total_profit,
    profit_per_person,
    resultsContent
  );
  update_the_history_results();
  document.getElementById("extra-expenses-div").innerHTML = "";
}

function extra_expenses_click() {
  remove_tibialootsplit_html();
  document.getElementById("extra-container").style.display = "block";
  document.getElementById("extra-expense-table").style.display = "initial";

  for (i = 0; i < players_and_their_balance.length; i++) {
    player_name = players_and_their_balance[i].name;
    var tableRef = document
      .getElementById("extra-expense-table")
      .getElementsByTagName("tbody")[0];
    var newRow = tableRef.insertRow();

    var thirdCell = newRow.insertCell(0);
    var thirdCellTextBox = document.createElement("input");
    thirdCellTextBox.type = "text";
    thirdCellTextBox.name = "Text1";
    thirdCellTextBox.id = "goldExpense" + i;
    thirdCell.appendChild(thirdCellTextBox);
    var secondCell = newRow.insertCell(0);
    var secondCellTextBox = document.createElement("input");
    secondCellTextBox.type = "text";
    secondCellTextBox.name = "Text1";
    secondCellTextBox.id = "TCexpense" + i;
    secondCell.appendChild(secondCellTextBox);
    var firstCell = newRow.insertCell(0);
    var firstCellText = document.createTextNode(player_name);
    firstCell.id = i;
    firstCell.appendChild(firstCellText);
  }
}

function calculate_extra_expenses_click() {
  tibia_coin_value = document.getElementById("TCvalue").value;
  var tableRef = document
    .getElementById("extra-expense-table")
    .getElementsByTagName("tbody")[0];
  for (i = 1; i < tableRef.children.length; i++) {
    player_name = tableRef.children[i].cells[0].innerHTML;
    player_extra_tc = tableRef.children[i].cells[1].firstChild.value;
    player_extra_gold = tableRef.children[i].cells[2].firstChild.value;
    player_extra_expense =
      player_extra_tc * tibia_coin_value + player_extra_gold * 1000;
    total_profit = total_profit - player_extra_expense;
    players_and_their_balance[i - 1].balance =
      parseInt(players_and_their_balance[i - 1].balance) - player_extra_expense;
  }

  // re-calculating the payout based on updated figured
  profit_per_person = total_profit / number_of_players;
  who_to_pay_and_how_much = final_split(
    players_and_their_balance,
    profit_per_person,
    number_of_players
  );

  // Final update back to the site
  var results = document.createElement("div");
  results.setAttribute("id", "results");
  main_content.appendChild(results);

  update_the_html(
    who_to_pay_and_how_much,
    total_profit,
    profit_per_person,
    resultsContent
  );
  update_the_history_results();
  remove_old_html();
}

// function to verify the integrity of the entered data
function validate_analyser_data(ref) {
  form = document.forms[ref];
  if (form.analyserData.value == "") {
    window.alert("Analyser data cannot be empty");
    document.getElementById("tibialootsplitform").reset();
    return false;
  }

  if (
    form.analyserData.value.length < 50 ||
    !form.analyserData.value.includes("Balance") ||
    !form.analyserData.value.includes("Supplies") ||
    !form.analyserData.value.includes("Loot") ||
    !form.analyserData.value.includes("Session data") ||
    !form.analyserData.value.includes("Loot Type")
  ) {
    window.alert(
      "Incorrect analyser data. Please copy the log and try again. \nIf you believe this is a mistake, please raise a bug report."
    );
    document.getElementById("tibialootsplitform").reset();
    return false;
  }

  return true;
}

function find_session_date(data) {
  return data.substring(19, 29);
}

function find_session_duration(data) {
  index = data.indexOf("Session: ");
  return data.substring(index + 9, index + 15);
}

function remove_first_section(data) {
  index = data.indexOf("Balance ");
  substring1 = data.substring(index + 9);
  index2 = substring1.indexOf(" ");
  substring2 = substring1.substring(0, index2);
  substring2 = substring2.split(",").join("");
  analyser_data = substring1.substring(substring2.length + 2);
}

function find_total_profit(players_and_their_balance) {
  let total_balance = 0;
  for (i = 0; i < players_and_their_balance.length; i++) {
    total_balance =
      total_balance + parseInt(players_and_their_balance[i]["balance"]);
  }
  return total_balance;
}

function find_total_number_of_players(data) {
  return (count = (data.match(/Balance/g) || []).length);
}

function find_players_and_balance(data, number_of_players) {
  players_and_balance = [];
  player_names_list = [];
  for (let i = 0; i < number_of_players; i++) {
    index_loot = data.indexOf("Loot");
    name_of_player = data.substring(0, index_loot);
    name_of_player = name_of_player.trim();
    index_balance = data.indexOf("Balance ");
    index_damage = data.indexOf("Damage ");
    balance_of_player = data.substring(index_balance + 8, index_damage -2);
    balance_of_player = balance_of_player.split(",").join("");
    balance_of_player = balance_of_player.trim();
    players_and_balance.push({
      name: name_of_player,
      balance: balance_of_player,
    });
    player_names_list.push(name_of_player);
    index_healing = data.indexOf("Healing ");
    data = data.substring(index_healing + 8);
    index_space = data.indexOf(" ");
    data = data.substring(index_space + 1);
  }
  return players_and_balance;
}

function final_split(
  players_and_their_balance,
  profit_per_person,
  number_of_players
) {
  players_and_outstanding_payment = [];
  for (let i = 0; i < number_of_players; i++) {
    name = players_and_their_balance[i]["name"];
    oustanding_payment =
      profit_per_person - players_and_their_balance[i]["balance"];
    players_and_outstanding_payment.push({
      name: name,
      balance: oustanding_payment,
    });
  }
  who_to_pay_and_how_much = [];
  for (let i = 0; i < number_of_players; i++) {
    if (players_and_outstanding_payment[i]["balance"] < 0) {
      while (Math.abs(players_and_outstanding_payment[i]["balance"]) > 5) {
        for (let j = 0; j < number_of_players; j++) {
          if (players_and_outstanding_payment[j]["balance"] > 0) {
            if (
              players_and_outstanding_payment[j]["balance"] >
              Math.abs(players_and_outstanding_payment[i]["balance"])
            ) {
              players_and_outstanding_payment[j]["balance"] =
                players_and_outstanding_payment[j]["balance"] +
                players_and_outstanding_payment[i]["balance"];
              who_to_pay_and_how_much.push({
                name: players_and_outstanding_payment[i]["name"],
                amount: Math.abs(players_and_outstanding_payment[i]["balance"]),
                to_who: players_and_outstanding_payment[j]["name"],
              });
              players_and_outstanding_payment[i]["balance"] = 0;
            } else {
              players_and_outstanding_payment[i]["balance"] =
                players_and_outstanding_payment[i]["balance"] +
                players_and_outstanding_payment[j]["balance"];
              players_and_outstanding_payment[j]["balance"] = Math.round(
                players_and_outstanding_payment[j]["balance"]
              );
              who_to_pay_and_how_much.push({
                name: players_and_outstanding_payment[i]["name"],
                amount: Math.abs(players_and_outstanding_payment[j]["balance"]),
                to_who: players_and_outstanding_payment[j]["name"],
              });
              players_and_outstanding_payment[j]["balance"] = 0;
            }
          }
        }
      }
    }
  }
  return who_to_pay_and_how_much;
}

function update_the_html(
  who_to_pay_and_how_much,
  total_profit,
  profit_per_person,
  resultsContent
) {
  transfer_array = [];
  copy_button_array = [];
  var discord_output = [];
  resultsContent = document.getElementById("results");

  for (let i = 0; i < who_to_pay_and_how_much.length; i++) {
    var amount = who_to_pay_and_how_much[i]["amount"];
    var gp_amount = Math.round(amount);
    var payer_name = who_to_pay_and_how_much[i]["name"];
    var payee_name = who_to_pay_and_how_much[i]["to_who"];
    var copy_button = `<button type="button" onClick='copy_to_clipboard("transfer ${gp_amount} to ${payee_name}", "${payee_name}")';>Copy</button>`;

    if (amount != 0) {
      if (amount > 1000) {
        amount = Math.round(amount / 1000);
        transfer_message = `<b> ${payer_name} </b> to pay <b> ${amount}k </b> to <b>${payee_name} </b> (Bank: <b> transfer ${gp_amount} to ${payee_name}</b>)`;
        transfer_array.push(transfer_message);
        copy_button_array.push(`${copy_button}`);
        discord_output.push(
          payer_name +
            " to pay " +
            amount +
            " k to " +
            payee_name +
            " (Bank: transfer " +
            gp_amount +
            " to " +
            payee_name
        );
      } else {
        transfer_message = `<b> ${payer_name} </b> to pay <b> ${gp_amount} gp </b> to <b>${payee_name} </b> (Bank: <b> transfer  ${gp_amount} to ${payee_name} </b>)`;
        transfer_array.push(transfer_message);
        copy_button_array.push(`${copy_button}`);
        discord_output.push(
          payer_name +
            " to pay " +
            gp_amount +
            " k to " +
            payee_name +
            " (Bank: transfer " +
            gp_amount +
            " to " +
            payee_name
        );
      }
    }
  }

  //if (transfer_array.length > 8) {
  //    document.getElementById("footer").style.display = "none"
  //}

  resultsContent.innerHTML = resultsContent.innerHTML + "<h3>Results:</h3>";

  for (let j = 0; j < transfer_array.length; j++) {
    resultsContent.innerHTML =
      resultsContent.innerHTML + "<p>" + transfer_array[j] + "</p>";
    resultsContent.innerHTML =
      resultsContent.innerHTML +
      '<div class="copy_button_div">' +
      copy_button_array[j] +
      "</div>";
    resultsContent.innerHTML =
      resultsContent.innerHTML + '<div class="block_element"></div>';
  }

  let profit = false;
  if (total_profit > 0) {
    profit = true;
  }

  if (Math.abs(total_profit) > 1000) {
    total_profit = Math.round(total_profit / 1000) + "k~";
  } else {
    total_profit = total_profit + " gp";
  }

  if (Math.abs(profit_per_person) > 1000) {
    profit_per_person = Math.round(profit_per_person / 1000) + "k~";
  } else {
    profit_per_person = Math.round(profit_per_person);
    profit_per_person = profit_per_person + " gp";
  }

  if (profit) {
    resultsContent.innerHTML =
      resultsContent.innerHTML +
      "<p> Total profit: " +
      '<span id="profit_positive">' +
      total_profit +
      "</span> which is: " +
      '<span id="profit_positive">' +
      profit_per_person +
      "</span> for each player. </p >";
    discord_output.push(
      "Total profit: " +
        total_profit +
        " which is: " +
        profit_per_person +
        " for each player."
    );
    resultsContent.innerHTML =
      resultsContent.innerHTML + '<div class="block_element"></div>';
  } else {
    resultsContent.innerHTML =
      resultsContent.innerHTML +
      "<p> Total waste: " +
      '<span id="profit_negative">' +
      total_profit +
      "</span> which is: " +
      '<span id="profit_negative">' +
      profit_per_person +
      "</span> for each player. </p >";
    discord_output.push(
      "Total waste: " +
        total_profit +
        " which is: " +
        profit_per_person +
        " for each player."
    );
    resultsContent.innerHTML =
      resultsContent.innerHTML + '<div class="block_element"></div>';
  }

  resultsContent.innerHTML =
    resultsContent.innerHTML +
    `<button type="button" id="copy-all-button" onClick='copy_whole_log()';>Copy all to Discord!</button><br><br>`;
  //resultsContent.style.border = "1px #0c0c0ce7 dotted"
  //resultsContent.style.borderRadius = "5px"
  //resultsContent.style.backgroundColor = "#272727e7"
}

function copy_to_clipboard(transferMsg, who_to_pay) {
  let attrid = who_to_pay.replace(/[^A-Z0-9]/gi, "_");
  let container = document.querySelector("#page-container");
  let input = document.createElement("input");

  input.type = "text";
  input.id = attrid;
  input.className = "hiddeninput";
  input.value = transferMsg;
  container.appendChild(input);

  let text_to_copy = document.querySelector(`#${attrid}`);

  text_to_copy.select();
  document.execCommand("copy");

  text_to_copy.remove();
}

function copy_whole_log() {
  let container = document.querySelector("#results");
  let discord_output_element = document.createElement("div");

  //discord_output_element.type = "textarea"
  discord_output_element.id = "discord_output_id";
  discord_output_element.className = "hiddeninput";
  discord_output_element.style.position = "fixed";
  discord_output_element.style.pointerEvents = "none";
  discord_output_element.style.opacity = 0;
  discord_output_element.innerHTML = "";

  paragraphs = document.getElementById("results").getElementsByTagName("p");
  number_of_paragraphs = paragraphs.length;

  var discord_output = "";

  for (i = 0; i < number_of_paragraphs; i++) {
    discord_output = discord_output + paragraphs[i].innerHTML + "<br /><br />";
  }

  var activeSheets = Array.prototype.slice
    .call(document.styleSheets)
    .filter(function (sheet) {
      return !sheet.disabled;
    });

  discord_output_element.innerHTML = discord_output;

  document.body.appendChild(discord_output_element);

  window.getSelection().removeAllRanges();

  var range = document.createRange();
  range.selectNode(discord_output_element);
  window.getSelection().addRange(range);

  document.execCommand("copy");

  for (var i = 0; i < activeSheets.length; i++) activeSheets[i].disabled = true;

  document.execCommand("copy");

  for (var i = 0; i < activeSheets.length; i++)
    activeSheets[i].disabled = false;
}

function remove_tibialootsplit_html() {
  main_content = document.getElementById("main-content");

  extraExpensesDiv = document.getElementById("extra-expenses-div");
  extraExpensesDiv.innerHTML = "";

  resultsContent = document.getElementById("results");
  resultsContent.innerHTML = "";
  //main_content.removeChild(resultsContent);

  form = document.getElementById("tibialootsplitform");
  form.innerHTML = "";

  image = document.getElementById("analyser_image");
  main_content.removeChild(image);

  list = document.getElementById("instruction-list");
  list.innerHTML = "";

  howtouse = document.getElementById("howtouse");
  howtouse.innerHTML = "";

  main_content.removeChild(howtouse);
  main_content.removeChild(list);
}

function remove_old_html() {
  main_content = document.getElementById("main-content");
  extraExpensesDiv = document.getElementById("extra-expenses-div");
  extraExpensesDiv.innerHTML = "";
  extraExpensesTable = document.getElementById("extra-expense-table");
  main_content.removeChild(extraExpensesTable);
  extraContainer = document.getElementById("extra-container");
  main_content.removeChild(extraContainer);
}

function add_players_and_checkboxes(players_and_their_balance) {
  list_remove_players_container = document.getElementById(
    "list-remove-players"
  );

  var p = document.createElement("p");
  p.innerHTML =
    "To remove players from the loot split and NOT share loot with them, UN-CHECK their names:";

  list_remove_players_container.appendChild(p);

  for (i = 0; i < players_and_their_balance.length; i++) {
    linebreak = document.createElement("br");
    list_remove_players_container.appendChild(linebreak);

    player = players_and_their_balance[i].name;
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "name";
    checkbox.value = "value";
    checkbox.id = player;

    var label = document.createElement("label");
    label.htmlFor = player;
    label.appendChild(document.createTextNode(player));

    list_remove_players_container.appendChild(checkbox);
    list_remove_players_container.appendChild(label);
    document.getElementById(player).checked = true;
  }

  calculate_button = document.getElementById("submitremoveplayers");
  calculate_button.style.display = "initial";
}

function view_tibialootsplit_history() {
  remove_tibialootsplit_html();
  document.getElementById("h4_history_tls").style.display = "block";
  document.getElementById("tibialootsplit-history-table").style.display =
    "initial";

  const history = JSON.parse(
    localStorage.getItem("tibialootsplitresults") || "[]"
  );

  if (history.length > 5) {
    number_of_loops = history.length / 6;
    var tableRef = document
      .getElementById("tibialootsplit-history-table")
      .getElementsByTagName("tbody")[0];
    for (j = 0; j < number_of_loops; j++) {
      var newRow = tableRef.insertRow();
      for (i = 0; i < 6; i++) {
        index = 6 * j + i;
        //covering 'first' result per row, i.e. the actual tibialootsplit results
        if (index == 0 || index % 6 == 0) {
          let cell = newRow.insertCell(0);
          cell.id = index;
          cell.innerHTML =
            "<button id='" +
            index +
            "' onclick='results_from_history(this.id)';>Here</button>";
        }
        //covering 'third' result per row, i.e. the names of players
        else if ((index + 3) % 6 == 0) {
          let cell = newRow.insertCell(0);
          cell.id = index;
          players = history[index];
          var players_array = players.split(",");
          for (k = 0; k < players_array.length; k++) {
            player = players_array[k];
            player.trim();
            cell.innerHTML = cell.innerHTML + player + "<br/>";
          }
        } else if ((index + 4) % 6 == 0) {
          let cell = newRow.insertCell(0);
          cell.id = index;
          let cellTextBox = document.createTextNode(
            Math.round(history[index] / 1000) + "k~"
          );
          cellTextBox.type = "text";
          cellTextBox.name = "text" + index;
          cellTextBox.id = index;
          cell.appendChild(cellTextBox);
        } else if ((index + 5) % 6 == 0) {
          let cell = newRow.insertCell(0);
          cell.id = index;
          let cellTextBox = document.createTextNode(
            Math.round(history[index] / 1000) + "k~"
          );
          cellTextBox.type = "text";
          cellTextBox.name = "text" + index;
          cellTextBox.id = index;
          cell.appendChild(cellTextBox);
        } else {
          let cell = newRow.insertCell(0);
          cell.id = index;
          let cellTextBox = document.createTextNode(history[index]);
          cellTextBox.type = "text";
          cellTextBox.name = "text" + index;
          cellTextBox.id = index;
          cell.appendChild(cellTextBox);
        }
      }
    }
  }
}

function update_the_history_results() {
  const maxHistoryLength = 90;
  const history = JSON.parse(
    localStorage.getItem("tibialootsplitresults") || "[]"
  );
  const isHistoryMaxed = history.length === maxHistoryLength;

  players_formatted = "";
  for (i = 0; i < player_names_list.length; i++) {
    players_formatted = players_formatted + player_names_list[i] + ", ";
  }
  players_formatted = players_formatted.slice(0, -2);
  new_results = [
    who_to_pay_and_how_much,
    profit_per_person,
    total_profit,
    players_formatted,
    session_duration,
    session_date,
  ];
  const workingHistory = isHistoryMaxed
    ? history.slice(0, 90 - new_results.length)
    : history;

  const updatedHistory = new_results.concat(workingHistory);
  localStorage.setItem("tibialootsplitresults", JSON.stringify(updatedHistory));
}

function results_from_history(table_cell_id) {
  const history = JSON.parse(
    localStorage.getItem("tibialootsplitresults") || "[]"
  );

  who_to_pay_and_how_much = history[table_cell_id];
  total_profit = history[parseInt(table_cell_id) + 2];
  profit_per_person = history[parseInt(table_cell_id) + 1];

  resultsContent = document.getElementById("results");
  update_the_html(
    who_to_pay_and_how_much,
    total_profit,
    profit_per_person,
    resultsContent
  );

  document.getElementById("h4_history_tls").style.display = "none";
  document.getElementById("tibialootsplit-history-table").style.display =
    "none";
}
